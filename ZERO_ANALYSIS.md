# Análisis de Integración: Zero + libt

## Resumen Ejecutivo

**Zero** es un sync engine local-first que replica datos de PostgreSQL a SQLite en el browser, eliminando latencia para el usuario.

**Beneficio principal:** Escritura instantánea (0ms latencia percibida), sync en background.

**Dificultad estimada:** MEDIA-ALTA  
**Tiempo estimado:** 8-12 días de desarrollo

---

## Arquitectura Actual de libt

```
┌─────────────────┐     Server Actions      ┌──────────────────┐
│   Browser       │ ◄─────────────────────► │   Next.js API    │
│   (React)       │        ~200-500ms       │   (SQLite)       │
└─────────────────┘                         └──────────────────┘
```

- **DB:** SQLite con better-sqlite3 + Drizzle ORM
- **API:** Next.js Server Actions
- **Tablas:** users, sessions, folders, pages
- **Problema:** Cada keystroke espera respuesta del servidor

---

## Arquitectura con Zero

```
┌─────────────────┐                         ┌──────────────────┐
│   Browser       │                         │   PostgreSQL     │
│   ┌───────────┐ │                         └────────┬─────────┘
│   │ SQLite    │ │                                  │ WAL replication
│   │ (local)   │ │                                  ▼
│   └─────┬─────┘ │                         ┌──────────────────┐
│         │ 0ms   │   background sync       │   zero-cache     │
│   ┌─────▼─────┐ │ ◄─────────────────────► │   (middleware)   │
│   │ Zero      │ │       ~invisible        └──────────────────┘
│   │ Client    │ │                                  │
│   └───────────┘ │                                  ▼
└─────────────────┘                         ┌──────────────────┐
                                            │   Next.js API    │
                                            │ /api/zero/query  │
                                            │ /api/zero/mutate │
                                            └──────────────────┘
```

- **Escritura:** Instantánea al SQLite local
- **Sync:** Zero replica cambios a PostgreSQL en background
- **Lectura:** Siempre del cache local (instantánea)

---

## Cambios Requeridos

### 1. Base de Datos (ALTO impacto)

**Actual:** SQLite con better-sqlite3  
**Nuevo:** PostgreSQL con WAL logical replication

```typescript
// Antes (Drizzle SQLite)
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const pages = sqliteTable('pages', { ... })

// Después (Drizzle PostgreSQL)
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const pages = pgTable('pages', { ... })
```

**Trabajo:**
- Instalar PostgreSQL (Docker o servicio cloud)
- Configurar `wal_level=logical`
- Adaptar schema de Drizzle (sqliteTable → pgTable)
- Migrar datos existentes

### 2. Infraestructura (MEDIO impacto)

**Nuevo servicio:** `zero-cache`

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    command: postgres -c wal_level=logical
    
  zero-cache:
    image: rocicorp/zero:latest
    environment:
      ZERO_UPSTREAM_DB: postgres://...
      ZERO_QUERY_URL: http://api:3000/api/zero/query
      ZERO_MUTATE_URL: http://api:3000/api/zero/mutate
```

### 3. Zero Schema (BAJO impacto)

Zero necesita su propio schema para type-safety. Se puede generar desde Drizzle.

```typescript
// zero/schema.ts
import { createZeroSchema, defineTable, column } from '@rocicorp/zero'

const pages = defineTable('pages', {
  id: column.string(),
  userId: column.string(),
  content: column.string(),
  indent: column.number(),
  dailyDate: column.string().optional(),
  // ...
})

export const { zql } = createZeroSchema({ pages, folders, users })
```

### 4. Queries (MEDIO impacto)

Reemplazar server actions de lectura con Zero queries.

```typescript
// Antes: Server Action
export async function getDailyPages(dailyDate: string) {
  const session = await requireAuth()
  return db.select().from(pages)
    .where(and(eq(pages.userId, session.id), eq(pages.dailyDate, dailyDate)))
}

// Después: Zero Query
export const queries = defineQueries({
  pages: {
    byDailyDate: defineQuery(
      z.object({ dailyDate: z.string() }),
      ({ args: { dailyDate }, ctx: { userID } }) =>
        zql.pages
          .where('userId', userID)
          .where('dailyDate', dailyDate)
          .orderBy('order', 'asc')
    )
  }
})
```

**Endpoint necesario:**
```typescript
// app/api/zero/query/route.ts
export async function POST(req: Request) {
  return handleQueryRequest(req, queries, getContext)
}
```

### 5. Mutators (MEDIO impacto)

Reemplazar server actions de escritura con Zero mutators.

```typescript
// Antes: Server Action
export async function updatePage(id: string, data: UpdatePageInput) {
  const session = await requireAuth()
  await db.update(pages).set(data).where(eq(pages.id, id))
}

// Después: Zero Mutator
export const mutators = defineMutators({
  pages: {
    update: defineMutator(
      z.object({ id: z.string(), content: z.string(), /* ... */ }),
      async ({ args, tx }) => {
        await tx.mutate.pages.update(args.id, {
          content: args.content,
          updatedAt: Date.now()
        })
      }
    )
  }
})
```

**Endpoint necesario:**
```typescript
// app/api/zero/mutate/route.ts
export async function POST(req: Request) {
  return handleMutateRequest(req, mutators, getContext, dbProvider)
}
```

### 6. Frontend (ALTO impacto)

El mayor cambio. Cada componente que usa datos del servidor necesita migrar.

```typescript
// Antes: Server Action + useState
const [pages, setPages] = useState<Page[]>([])

useEffect(() => {
  getDailyPages(date).then(setPages)
}, [date])

const handleUpdate = async (id, content) => {
  await updatePage(id, { content })
  // Refresh or optimistic update...
}

// Después: Zero useQuery + mutate
const [pages] = useQuery(queries.pages.byDailyDate({ dailyDate: date }))

const handleUpdate = (id, content) => {
  // Instantáneo - sin await necesario para UI
  zero.mutate.pages.update({ id, content })
}
```

**Componentes a migrar:**
- `DayCard` - usa getDailyPages, updatePage, deletePage, createPage
- `PageLine` - usa updatePage, deletePage
- `DailyNotes` - orchestrates data loading
- `FolderDetailView` - usa getFolderPages
- `TasksPage` - usa getPendingTasks

---

## Estimación de Tiempo

| Tarea | Días |
|-------|------|
| Setup PostgreSQL + migrar schema | 1 |
| Migrar datos SQLite → PostgreSQL | 0.5 |
| Configurar zero-cache | 0.5 |
| Crear zero/schema.ts | 0.5 |
| Crear zero/queries.ts + endpoint | 1.5 |
| Crear zero/mutators.ts + endpoint | 1.5 |
| Migrar DailyNotes + DayCard + PageLine | 2 |
| Migrar Folders + Tasks | 1 |
| Auth integration con Zero | 0.5 |
| Testing + debugging | 2 |
| **TOTAL** | **~11 días** |

---

## Riesgos y Consideraciones

### ⚠️ Riesgos

1. **PostgreSQL requerido** - Zero no soporta SQLite como upstream (solo como replica local)
2. **Infraestructura más compleja** - Un servicio adicional (zero-cache)
3. **Curva de aprendizaje** - Nuevo modelo mental para queries/mutators
4. **Beta software** - Zero aún no es 1.0, posibles breaking changes

### ✅ Mitigaciones

1. PostgreSQL es más escalable que SQLite para producción anyway
2. Docker Compose simplifica el deployment
3. El modelo es muy similar a tRPC/React Query
4. Rocicorp tiene track record sólido (Replicache)

---

## Alternativa: Implementación Manual

Si Zero parece muy complejo, una alternativa más simple:

```typescript
// Optimistic updates + IndexedDB manual
const useOptimisticPages = (dailyDate) => {
  const [pages, setPages] = useState([])
  const [pending, setPending] = useState([]) // Cambios no sincronizados
  
  // Escribir localmente primero
  const updatePage = (id, data) => {
    setPages(prev => prev.map(p => p.id === id ? {...p, ...data} : p))
    setPending(prev => [...prev, { type: 'update', id, data }])
  }
  
  // Sync en background
  useEffect(() => {
    const sync = async () => {
      for (const op of pending) {
        await serverUpdatePage(op.id, op.data)
      }
      setPending([])
    }
    const timer = setTimeout(sync, 1000)
    return () => clearTimeout(timer)
  }, [pending])
}
```

**Pros:** Más simple, sin dependencias, sin PostgreSQL  
**Contras:** Más código manual, sin conflict resolution, más propenso a bugs

---

## Recomendación

**Ir con Zero** si:
- Planeas escalar libt a más usuarios
- Quieres la mejor UX posible
- Estás dispuesto a invertir ~2 semanas

**Ir con solución manual** si:
- libt es solo para uso personal
- Quieres algo rápido (2-3 días)
- Prefieres evitar PostgreSQL

---

## Próximos Pasos

1. **Decisión:** ¿Zero o manual?
2. Si Zero:
   - [ ] Setup PostgreSQL local con Docker
   - [ ] Crear branch `feature/zero-sync`
   - [ ] Migrar schema a PostgreSQL
   - [ ] Setup zero-cache
   - [ ] Migrar primer componente (DayCard) como POC

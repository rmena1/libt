# libt

> Minimalist PKM (Personal Knowledge Management) app inspired by Reflect Notes, Craft, and Tana.

## Vision

A frictionless, minimalist note-taking app centered around **daily notes** with the philosophy that **every line is a page**. Built for quick capture with a clean interface.

---

## Core Concepts

### 1. Daily Notes (Agenda View)

- **Central hub** of the app
- Each day has its own note
- **Infinite scroll** interface: scroll up for future dates, down for past dates
- Write without friction — just start typing under any day
- Default landing page when opening the app

### 2. Every Line is a Page

Inspired by Tana's "everything is a node" philosophy:

- Each top-level line in a daily note is its own **page**
- Content indented below a line becomes the **content of that page**
- Pages can be expanded/collapsed
- Pages can be opened in full view

```
25 de Enero, 2025
├── Reunión con el equipo          ← This is a page
│   ├── Discutimos roadmap Q1      ← Content of "Reunión con el equipo"
│   └── Decidimos priorizar mobile
├── Idea para feature              ← This is another page
│   └── Agregar shortcuts...
```

### 3. Tasks System

Tasks are created by typing `[]` at the beginning of a line.

#### Syntax:
- `[] Task description` — Creates a task
- `@` — Date assignment (natural language)
  - `@hoy`, `@mañana`, `@próximo lunes`
  - `@23-12`, `@jueves`, `@el próximo mes`
- `!` — Priority levels
  - `!` = Low
  - `!!` = Medium  
  - `!!!` = High

#### Examples:
```
[] Revisar PR de Juan @mañana !!
[] Comprar café @hoy !
[] Planificar vacaciones @próximo mes
```

#### Default Behavior:
- Tasks created in a daily note **inherit that day's date** by default
- The `@` syntax **overrides** the inherited date
- Tasks created in non-dated pages (folders) have **no date** → go to **Inbox**

### 4. Folder System

Organize pages into folders using `#` syntax.

#### Syntax:
```
Idea para el producto #ideas
Reunión con inversores #trabajo/reuniones
```

#### Rules:
- Folders can have **infinite nesting** (`#work/meetings/2025`)
- Folder names must be **globally unique** at any level
- Assigning a folder moves the **entire page** (line + indented content) to that folder
- Folders are displayed in the **sidebar**

### 5. Sidebar Navigation

```
┌─────────────────────────┐
│ 📅 Daily Notes          │  ← Home/default view
│ ✅ Tasks                │
│   ├── Inbox             │  ← Tasks without date
│   ├── Today & Overdue   │
│   ├── Next 3 Days       │
│   └── All Tasks (collapsed)
│ 📁 Folders              │
│   ├── ideas             │
│   ├── trabajo           │
│   │   ├── reuniones     │
│   │   └── proyectos     │
│   └── personal          │
│ 📆 Calendar View        │  ← Calendar with tasks
└─────────────────────────┘
```

### 6. Calendar View

- Visual calendar showing tasks by date
- **Inbox section** below the calendar showing tasks without dates
- Click on a day to see/add tasks
- Drag & drop to reschedule (future feature?)

---

## Technical Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** — Clean, minimal UI
- **Editor**: Custom with contenteditable + controlled state
  - Consider **Tiptap** if complexity grows

### Backend
- **Next.js Server Actions** — For mutations
- **SQLite** via **better-sqlite3** — Synchronous, fast
- **Drizzle ORM** — Type-safe queries, easy migrations

### Auth
- **Custom auth** with:
  - bcrypt/argon2 for password hashing
  - HTTP-only secure cookies for sessions
  - CSRF protection
- Or **Better-Auth** if we want less boilerplate

### Key UX Patterns

#### Optimistic Updates
```
User types → UI updates immediately → Debounced save to DB
                                    ↓
                              On error: rollback UI + show toast
```

#### Debounced Saving
- Save after **500ms** of inactivity
- Save on **blur** (user clicks elsewhere)
- Save on **Cmd+S** (explicit save)
- Save on **page navigation**
- Indicator: subtle "Saving..." → "Saved" in corner

#### State Management
- **React state** for local UI
- **Server state** via Next.js cache + revalidation
- Consider **Zustand** if client state grows complex

---

## Data Model (Final)

### Entity Relationship

```
User (1) ──── (*) Folder
  │              │
  │              └── parent_id → Folder (self-reference, infinite nesting)
  │
  └──── (*) Page
              │
              ├── folder_id → Folder (optional, for #folder assignment)
              ├── parent_page_id → Page (self-reference, for indented content)
              └── daily_date (optional, links to daily note)

Future: PageLink (source_page_id, target_page_id) for [[backlinks]]
```

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| email | TEXT | Unique, not null |
| password_hash | TEXT | bcrypt/argon2 hashed |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

#### `folders`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| name | TEXT | Not null |
| slug | TEXT | URL-safe, unique per user |
| parent_id | TEXT | FK → folders.id (nullable) |
| order | INTEGER | Position in sidebar |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

**Constraints:**
- `UNIQUE(user_id, slug)` — folder names unique per user
- `UNIQUE(user_id, parent_id, name)` — no duplicate names at same level

#### `pages`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| content | TEXT | The text content |
| daily_date | TEXT | `YYYY-MM-DD` if part of daily note (nullable) |
| folder_id | TEXT | FK → folders.id (nullable) |
| parent_page_id | TEXT | FK → pages.id (nullable, for nesting) |
| order | INTEGER | Position among siblings |
| is_task | INTEGER | 0 or 1 |
| task_completed | INTEGER | 0 or 1 |
| task_completed_at | INTEGER | Unix timestamp (nullable) |
| task_date | TEXT | `YYYY-MM-DD` for task due date (nullable) |
| task_priority | TEXT | `low`, `medium`, `high` (nullable) |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

**Indexes:**
- `idx_pages_user_daily` on `(user_id, daily_date)` — fast daily note queries
- `idx_pages_user_folder` on `(user_id, folder_id)` — fast folder queries
- `idx_pages_parent` on `(parent_page_id)` — fast child queries
- `idx_pages_tasks` on `(user_id, is_task, task_date)` — fast task queries

#### `pages_fts` (Virtual Table for Search)
```sql
CREATE VIRTUAL TABLE pages_fts USING fts5(
  content,
  content='pages',
  content_rowid='rowid'
);
```
Triggers to keep FTS in sync with pages table.

#### `sessions` (for auth)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | Session token |
| user_id | TEXT | FK → users.id |
| expires_at | INTEGER | Unix timestamp |
| created_at | INTEGER | Unix timestamp |

### Future Tables (Not MVP)

#### `page_links` (for backlinks)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| source_page_id | TEXT | FK → pages.id |
| target_page_id | TEXT | FK → pages.id |
| created_at | INTEGER | Unix timestamp |

---

## Decisions (Confirmed)

### UX / Features

1. **Search**: `Cmd+K` opens global search. Searches pages, prioritizes title match, then content. Dynamic suggestions as you type.

2. **Backlinks**: Not for MVP, but schema designed to support `[[page]]` links in the future.

3. **Tags**: Not for MVP. Only `#folder` syntax for organizing into folders.

4. **Completed tasks**: Stay in the note where created. If in inbox (no date), they hide from inbox view.

5. **Empty days**: Show all days in infinite scroll (past and future).

6. **Mobile**: Web responsive, mobile-first design. Native app later.

### Technical

7. **Auth**: Simple email/password with secure best practices.

8. **Database**: SQLite + Drizzle ORM (can migrate to PostgreSQL later).

9. **Hosting**: Self-hosted on existing server (minimal latency).

10. **Export**: Not for MVP.

11. **Collaboration**: Single user only.

---

## Design Principles

1. **Minimal friction** — Writing should feel instant
2. **Clean interface** — No clutter, focus on content
3. **Keyboard-first** — Power users shouldn't need a mouse
4. **Fast** — Perceived instant response times
5. **Local-first** — Your data, your control (aspirational)

---

## Inspiration

| App | What we're taking |
|-----|-------------------|
| **Reflect Notes** | Quick capture, daily notes focus, minimal UI |
| **Craft** | Beautiful, clean interface |
| **Tana** | Every line is a page, structured data |
| **Obsidian** | Local-first, markdown |
| **Things 3** | Task management UX |

---

## MVP Scope

### Must Have (v0.1)
- [ ] Auth (register, login, logout)
- [ ] Daily notes view with infinite scroll
- [ ] Create/edit/delete pages (lines)
- [ ] Nested content (indentation)
- [ ] Tasks with `[]` syntax
- [ ] Task date with `@` syntax
- [ ] Task priority with `!` syntax
- [ ] Sidebar with Tasks view (Inbox, Today, Next 3 days)
- [ ] Folder system with `#` syntax
- [ ] `Cmd+K` search
- [ ] Debounced auto-save
- [ ] Mobile responsive

### Nice to Have (v0.2+)
- [ ] Calendar view for tasks
- [ ] Keyboard shortcuts (navigation, quick actions)
- [ ] Drag & drop reordering
- [ ] Dark mode
- [ ] `[[backlinks]]` support
- [ ] Export to markdown
- [ ] Native mobile app

---

## Project Status

✅ **Planning Complete** — Ready to build

---

## Roadmap

### Phase 1: Foundation
1. [x] Define requirements and schema
2. [ ] Set up Next.js project with TypeScript
3. [ ] Configure SQLite + Drizzle
4. [ ] Implement auth system
5. [ ] Create DB migrations

### Phase 2: Core Features
6. [ ] Daily notes view (infinite scroll)
7. [ ] Page CRUD with nesting
8. [ ] Auto-save with debounce
9. [ ] Basic sidebar navigation

### Phase 3: Tasks & Folders
10. [ ] Task parsing (`[]`, `@`, `!`)
11. [ ] Tasks sidebar views
12. [ ] Folder system with `#`
13. [ ] Folder sidebar

### Phase 4: Polish
14. [ ] `Cmd+K` search with FTS5
15. [ ] Mobile responsive design
16. [ ] Error handling & edge cases
17. [ ] Performance optimization


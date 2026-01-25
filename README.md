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
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **Tailwind CSS** — For clean, minimal UI
- **TBD**: Editor library (Tiptap? Slate? Lexical? Custom?)

### Backend
- **Next.js API Routes** (or Server Actions)
- **SQLite** — Local-first database
- **Drizzle ORM** (or Prisma?)
- **Better-Auth** (or NextAuth?) — Authentication

### Key UX Requirements
- **Optimistic updates** — UI updates immediately, syncs in background
- **Debounced saving** — Don't save on every keystroke
  - Save after X ms of inactivity
  - Save on blur/focus loss
  - Save on explicit action (Cmd+S?)
- **Offline support** (future consideration)

---

## Data Model (Draft)

```
User
├── id
├── email
├── password (hashed)
└── created_at

Folder
├── id
├── user_id
├── name (unique per user)
├── parent_id (nullable, for nesting)
└── created_at

Page
├── id
├── user_id
├── daily_date (nullable — if set, it's a daily note line)
├── folder_id (nullable)
├── parent_page_id (nullable — for nested content)
├── content (text)
├── order (position in list)
├── is_task (boolean)
├── task_status (pending/completed)
├── task_date (nullable)
├── task_priority (null/low/medium/high)
├── created_at
└── updated_at
```

---

## Open Questions

> These need clarification before development starts.

### UX / Features

1. **Search**: Will there be global search? What should be searchable?

2. **Backlinks**: Should pages link to each other? (e.g., `[[page name]]` syntax like Roam/Obsidian)

3. **Tags vs Folders**: Should `#` be folders only, or also support inline tags that don't move content?

4. **Page titles**: Is the first line the title, or is there a separate title field?

5. **Completed tasks**: Where do they go? Stay in place? Archive? Separate view?

6. **Daily note creation**: Auto-create for today? What about past dates — create on demand?

7. **Empty days**: In infinite scroll, show all days or only days with content?

8. **Keyboard shortcuts**: What shortcuts are essential? (Quick capture, navigation, etc.)

9. **Mobile**: Is this web-only or also native mobile?

10. **Quick capture**: Any global quick capture mechanism? (Floating button, keyboard shortcut, etc.)

### Technical

11. **Auth requirements**: Email/password only? OAuth (Google, GitHub)? Magic links?

12. **Multi-device sync**: SQLite is local — how to handle sync across devices?

13. **Hosting**: Self-hosted? Cloud service? Vercel?

14. **Export/Import**: Support for markdown export? Import from other apps?

15. **Collaboration**: Single user only or future multi-user/sharing?

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

## Project Status

🚧 **Planning Phase** — Defining scope and requirements

---

## Next Steps

1. [ ] Answer open questions
2. [ ] Define MVP scope
3. [ ] Create detailed technical spec
4. [ ] Set up project structure
5. [ ] Build prototype


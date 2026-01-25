# libt - Development TODO

## Phase 1: Foundation ✅ COMPLETE

### Setup
- [x] Create Next.js 15 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Configure ESLint
- [x] Set up project structure (folders, aliases)

### Database
- [x] Install and configure Drizzle ORM
- [x] Set up SQLite with better-sqlite3
- [x] Create database schema (users, folders, pages, sessions)
- [x] Create migrations (using drizzle push)
- [ ] Add seed script for development (optional)

### Authentication
- [x] Implement password hashing (bcrypt)
- [x] Create session management (HTTP-only cookies)
- [x] Register endpoint
- [x] Login endpoint
- [x] Logout endpoint
- [x] Auth middleware for protected routes
- [ ] CSRF protection (TODO: add later)

### Layout & Navigation
- [x] Create root layout with sidebar
- [x] Responsive sidebar (collapsible on mobile)
- [x] Navigation items (Daily Notes, Tasks, Folders)
- [x] User menu (logout)

### Daily Notes View
- [x] Infinite scroll component (past & future)
- [x] Day card component
- [x] Page/line editor component
- [ ] Nested content (indentation) - structure ready, UI pending
- [x] Auto-save with debounce (500ms)
- [x] Optimistic updates
- [x] Loading states
- [ ] Error handling (basic, needs toast)

---

## Phase 2: Tasks & Folders (Next)
- [ ] Task parsing (`[]` syntax)
- [ ] Date parsing (`@` syntax)
- [ ] Priority parsing (`!` syntax)
- [ ] Tasks sidebar view
- [ ] Folder parsing (`#` syntax)
- [ ] Folder sidebar

## Phase 3: Polish
- [ ] `Cmd+K` search
- [ ] Keyboard navigation
- [ ] Mobile optimization
- [ ] Performance audit

---

## Current Focus
> Setup: Creating Next.js project with proper configuration

## Notes
- Mobile-first design
- Minimal, clean UI (Craft-inspired)
- White background, black text
- Few buttons, focus on content

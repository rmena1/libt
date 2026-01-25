# libt - Development TODO

## Phase 1: Foundation (Current)

### Setup
- [ ] Create Next.js 15 project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Configure ESLint + Prettier
- [ ] Set up project structure (folders, aliases)

### Database
- [ ] Install and configure Drizzle ORM
- [ ] Set up SQLite with better-sqlite3
- [ ] Create database schema (users, folders, pages, sessions)
- [ ] Create migrations
- [ ] Add seed script for development

### Authentication
- [ ] Implement password hashing (bcrypt)
- [ ] Create session management (HTTP-only cookies)
- [ ] Register endpoint
- [ ] Login endpoint
- [ ] Logout endpoint
- [ ] Auth middleware for protected routes
- [ ] CSRF protection

### Layout & Navigation
- [ ] Create root layout with sidebar
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Navigation items (Daily Notes, Tasks, Folders)
- [ ] User menu (logout)

### Daily Notes View
- [ ] Infinite scroll component (past & future)
- [ ] Day card component
- [ ] Page/line editor component
- [ ] Nested content (indentation)
- [ ] Auto-save with debounce (500ms)
- [ ] Optimistic updates
- [ ] Loading states
- [ ] Error handling

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

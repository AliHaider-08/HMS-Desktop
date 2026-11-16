# memory.md

> Not needed at the beginning. Update this file at the end of every work session.
> Read it at the start of every session.

## Project
Fast Food Management Desktop App (Electron + React + SQLite)

## Current Status
- Current phase: **Phase 1 — Setup and Login (code complete, awaiting manual testing on Windows)**
- File currently being worked on: `src/routes.tsx` (route guards wired; Phase 1 finished here)
- App runs offline; data file: `%APPDATA%\gul-khan-fast-food\data\fastfood.db`
- Logs: `%APPDATA%\gul-khan-fast-food\logs\app.log`

## Completed
- [x] Planning and documents (PRD, architecture, Rules, phases, design)
- [x] Electron + React 19 + Vite 7 + TypeScript (strict) + Tailwind 3 project setup
- [x] Folder structure exactly as `docs/architecture.md` section 5
- [x] SQLite via `better-sqlite3`, numbered migrations (`001_init`, `002_default_settings`) + `schema_migrations` table
- [x] `users` and `settings` tables (users: role, active, must_change_password, last_login_at)
- [x] Default admin seeded on first run (`admin` / `admin123`) with a bcrypt hash, forced password change
- [x] Login page per `docs/design.md` (tomato red, dark sidebar panel, Poppins + Inter bundled offline)
- [x] Forced "Set a new password" screen after first login
- [x] IPC auth: `auth:login`, `auth:logout`, `auth:session`, `auth:change-password`, `auth:permissions`
- [x] Consistent result format `{ ok: true, data } | { ok: false, error: { code, message } }`
- [x] Login attempt throttling (5 wrong attempts → 5 minute lock per username)
- [x] Role-based route guarding (Admin / Cashier / Manager) with the permission map in the main process
- [x] Logout (top bar + change-password screen), session kept in main-process memory only
- [x] Error Boundary, route error element, inline alerts, logger to `logs/app.log`
- [x] ESLint + Prettier, strict typecheck, `npm run test:auth` smoke test (20 checks)

## Phase Progress
- [x] Phase 1: Setup and Login
- [ ] Phase 2: Dashboard and Layout
- [ ] Phase 3: Menu, Orders and Invoice
- [ ] Phase 4: Waiters and Delivery Boys
- [ ] Phase 5: Vehicles
- [ ] Phase 6: Reports, Backup and Release

## Decisions Made
- Electron **45**, React **19**, Vite **7**, TypeScript **5.9**, Tailwind **3** (config-file setup as in architecture.md), Zustand 5, React Router 7 (hash router, because the packaged app loads from `file://`).
- `bcrypt` (native) used as listed in Rules.md; `bcryptjs` was offered and not needed.
- Fonts bundled with `@fontsource/poppins` + `@fontsource/inter` (approved by owner, works fully offline).
- `better-sqlite3` 13 and `bcrypt` 6 ship N-API prebuilt binaries → no electron-rebuild step on install (`npmRebuild: false`); `npm run rebuild:native` exists as a fallback.
- No new `ipc/` file for preload: preload is one file as in architecture.md, IPC modules are one per domain (`auth.ipc.ts` first).
- `full_name` added to `users` (top bar shows a display name). `users` and `settings` stay as documented otherwise.
- Default admin **must change password** on first login (enforced by `must_change_password` + route guard + main-process flag in the session).
- Permission map (`electron/services/permissions.ts`): admin = home/users/settings/reports, manager = home/reports, cashier = home. Expanded in Phase 2 when the real pages exist.
- Settings seeded as text key/value pairs; repository exposes `get/getAll/set`.
- Dates stored as `YYYY-MM-DD HH:mm:ss` via `electron/utils/datetime.ts`.
- Validation schemas are shared between form and main process in `src/types/schemas.ts` (single source of truth, still parsed twice).
- `electron/main.ts` uses `sandbox: false` so the preload can require the shared channel constants; `contextIsolation` and `nodeIntegration: false` are unchanged.
- `scripts/` added (dev launcher, asset copy, smoke test, browser preview). This folder is not in architecture.md but no app code lives there.
- Dev-only browser preview: `npm run preview` serves the built UI with an in-memory demo API (`scripts/preview-bridge.js`). It never opens SQLite and is not part of the packaged app.

## Known Issues / Bugs
- Not run on a real Windows machine yet: this sandbox has no display and cannot download the Electron binary, so `npm run dev`, the packaged window and `npm run dist:win` still need a manual test on the shop PC.
- `logs/app.log` is the only log file for now; log rotation can be added in Phase 6.
- Auto backup on close is a Phase 6 item (setting `backup_on_close` is already seeded).

## Next Steps
1. Owner/user: run `npm run dev` on Windows and work through the Phase 1 manual test checklist (in the chat/README section 4).
2. Confirm Phase 1 is accepted (login, wrong password error, forced password change, role guard, logout).
3. Phase 2: Sidebar + Topbar layout, empty module pages, dashboard cards, shop settings page.

## Last Updated
- Date: 2026-11-16
- By: Arena Agent (Phase 1)

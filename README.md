# Gul Khan Fast Food — Fast Food Management Desktop App

Offline Windows desktop app (Electron + React + TypeScript + Tailwind + SQLite) for taking
orders, printing invoices and keeping staff, vehicle and sales records.

**Status: Phase 1 complete — project setup, database, login and roles.**
See `docs/phases.md` for the roadmap and `docs/memory.md` for current progress.

---

## 1. Requirements

- Windows 10/11 (64-bit)
- Node.js 22 LTS or newer (`node -v`)
- npm 10 or newer

No internet is needed after installation. All data stays on the computer.

## 2. Install

```bash
npm install
```

`better-sqlite3` and `bcrypt` both ship prebuilt N-API binaries, so nothing is compiled on a
normal machine. If you ever see a native-binding error, run:

```bash
npm run rebuild:native
```

## 3. Run the app (development)

```bash
npm run dev
```

This compiles the Electron main process, starts Vite on port 5173 and opens the desktop window
with DevTools. Electron loads `http://localhost:5173`.

Other useful commands:

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Vite + Electron with hot reload for the UI                 |
| `npm run typecheck` | TypeScript strict check for renderer, config and main      |
| `npm run lint`      | ESLint                                                     |
| `npm run format`    | Prettier                                                   |
| `npm run test:auth` | Headless Phase 1 smoke test (DB, migrations, login, roles) |
| `npm run build`     | Compile main process + production renderer                 |
| `npm start`         | Run Electron against the production build                  |
| `npm run dist:win`  | Build the Windows NSIS installer into `release/`           |
| `npm run preview`   | UI-only browser preview (demo auth, no database)           |

## 4. First run and sign-in

1. The app creates `%APPDATA%\gul-khan-fast-food\data\fastfood.db` on first start.
2. Migrations in `electron/db/migrations/` run automatically (numbered, applied once).
3. A default admin is created:
   - **username:** `admin`
   - **password:** `admin123`
4. The first login is forced to a **Set a new password** screen. The new password replaces the
   factory one in the database (bcrypt hash); `must_change_password` is cleared.

Logs (including failed logins and technical errors) are written to
`%APPDATA%\gul-khan-fast-food\logs\app.log`.

## 5. Project structure

```
electron/            main process (window, SQLite, repositories, services, IPC)
  ipc/               one file per module: auth.ipc.ts, ... (Phase 2+)
  db/                connection.ts, migrate.ts, seed.ts
  db/migrations/     numbered .sql files
  db/repositories/   all SQL lives here (prepared statements only)
  services/          authService, permissions, logger
src/                 React renderer (UI only, never touches SQLite)
  components/ layouts/ pages/ hooks/ store/ types/ utils/ styles/
docs/                PRD, architecture, Rules, phases, design, memory
scripts/             dev launcher, asset copy, smoke test, preview server
```

Renderer → `window.api` → preload → IPC → main process → SQLite.

## 6. Roles

| Role    | Can open (Phase 1 permission map)   |
| ------- | ----------------------------------- |
| Admin   | Dashboard, Users, Reports, Settings |
| Manager | Dashboard, Reports                  |
| Cashier | Dashboard                           |

The map lives in `electron/services/permissions.ts`. The renderer asks for it over IPC, and the
main process re-checks the session on every call — the UI guard is only a convenience.

## 7. Security rules followed

- `contextIsolation: true`, `nodeIntegration: false`
- No database access from React; prepared statements only
- bcrypt hashes, no plain-text passwords ever stored or returned
- Every IPC reply is `{ ok: true, data }` or `{ ok: false, error: { code, message } }`
- Zod validation in the form **and** in the main process
- Errors logged to `logs/app.log`, friendly message shown to the user
- 5 wrong attempts lock a username for 5 minutes

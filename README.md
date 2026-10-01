# Salary Management System

Offline Windows desktop app: Electron + React + TypeScript + Tailwind + Prisma + SQLite. No network is used.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies and generate the Prisma client |
| `npm run dev` | Run the app with hot reload |
| `npm run typecheck` | Type-check main and renderer code |
| `npm run db:migrate -- --name <name>` | After editing `prisma/schema.prisma`: create a migration |
| `npm run dist` | Build `dist/Salary-Management-System-Setup-<version>.exe` |

## First login

Username `admin`, password `Admin@123`. Change it under Users after the first login.

## Where data lives

`%APPDATA%\Salary Management System\data\salary-management.db` (images are in `...\files`).
Startup errors are written to `%APPDATA%\Salary Management System\error.log`.

## Layout

- `src/main`: Electron main process. `ipc/*` are the handlers; each declares the permission it needs.
- `src/preload`: the only bridge to the renderer (allow-listed channels).
- `src/renderer`: React UI.
- `src/shared`: zod schemas and permission lists used by both sides.
- `prisma/migrations`: SQL applied automatically at startup, in order.

## Notes

- If `npm run dev` does nothing from a VS Code terminal, run `Remove-Item Env:ELECTRON_RUN_AS_NODE` first.
- Money columns will use Decimal with decimal.js arithmetic when payroll is added.

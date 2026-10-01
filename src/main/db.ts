import { app } from 'electron'
import { mkdirSync, readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@db-client'

export let prisma: PrismaClient

export const dataDir = (): string => {
  const dir = join(app.getPath('userData'), 'data')
  mkdirSync(dir, { recursive: true })
  return dir
}

export const filesDir = (): string => {
  const dir = join(app.getPath('userData'), 'files')
  mkdirSync(dir, { recursive: true })
  return dir
}

const migrationsDir = (): string =>
  app.isPackaged ? join(process.resourcesPath, 'migrations') : join(app.getAppPath(), 'prisma', 'migrations')

/** Applies every prisma/migrations/<name>/migration.sql that has not run yet, in order. */
async function runMigrations(client: PrismaClient): Promise<void> {
  await client.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "_app_migrations" ("name" TEXT NOT NULL PRIMARY KEY, "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)'
  )
  const applied = new Set(
    (await client.$queryRawUnsafe<{ name: string }[]>('SELECT name FROM "_app_migrations"')).map((r) => r.name)
  )
  const dir = migrationsDir()
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'migration.sql')))
    .map((d) => d.name)
    .sort()

  for (const name of names) {
    if (applied.has(name)) continue
    const sql = readFileSync(join(dir, name, 'migration.sql'), 'utf8')
    const statements = sql
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n')
      .split(/;\s*(?:\r?\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean)
    await client.$transaction(async (tx) => {
      for (const stmt of statements) await tx.$executeRawUnsafe(stmt)
      await tx.$executeRawUnsafe('INSERT INTO "_app_migrations" (name) VALUES (?)', name)
    })
  }
}

/** Points Prisma at the query-engine DLL, which lives outside the asar archive when packaged. */
function locateQueryEngine(): void {
  const dir = app.isPackaged
    ? join(process.resourcesPath, 'prisma-engine')
    : join(app.getAppPath(), 'prisma-client')
  const engine = readdirSync(dir).find((f) => f.endsWith('.dll.node'))
  if (!engine) throw new Error(`Prisma query engine not found in ${dir}`)
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = join(dir, engine)
}

export async function initDatabase(): Promise<void> {
  locateQueryEngine()
  const file = join(dataDir(), 'salary-management.db').replace(/\\/g, '/')
  prisma = new PrismaClient({ datasourceUrl: `file:${file}` })
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL')
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON')
  await runMigrations(prisma)
}

import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { Prisma } from '@db-client'
import type { ApiResult, SessionUser } from '@shared/schemas'
import type { PermissionCode } from '@shared/permissions'
import { getSession } from '../session'
import { prisma } from '../db'

export class AppError extends Error {}

interface Options {
  /** Any one of these permissions grants access. Omit with `public: true` for open endpoints. */
  perm?: PermissionCode | PermissionCode[]
  public?: boolean
}

function toResult(e: unknown): ApiResult<never> {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of e.issues) fieldErrors[issue.path.join('.') || '_'] ??= issue.message
    return { ok: false, error: 'Please correct the highlighted fields', fieldErrors }
  }
  if (e instanceof AppError) return { ok: false, error: e.message }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return { ok: false, error: 'A record with the same unique value already exists' }
    if (e.code === 'P2025') return { ok: false, error: 'Record not found' }
    if (e.code === 'P2003') return { ok: false, error: 'This record is referenced by other data' }
  }
  console.error(e)
  return { ok: false, error: 'Unexpected error occurred' }
}

/** Registers an IPC handler that authenticates, authorizes (in the main process) and normalises errors. */
export function handle<I, O>(
  channel: string,
  options: Options,
  fn: (input: I, user: SessionUser | null) => Promise<O> | O
): void {
  ipcMain.handle(channel, async (_event, input: I): Promise<ApiResult<O>> => {
    try {
      const user = getSession()
      if (!options.public) {
        if (!user) return { ok: false, error: 'SESSION_EXPIRED' }
        const needed = options.perm ? [options.perm].flat() : []
        if (needed.length && !needed.some((p) => user.permissions.includes(p))) {
          return { ok: false, error: 'You do not have permission to perform this action' }
        }
      }
      return { ok: true, data: await fn(input, user) }
    } catch (e) {
      return toResult(e)
    }
  })
}

export async function audit(
  user: SessionUser | null,
  action: string,
  module: string,
  recordId?: string,
  oldValue?: unknown,
  newValue?: unknown
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action,
      module,
      recordId,
      oldValue: oldValue === undefined ? undefined : JSON.stringify(oldValue),
      newValue: newValue === undefined ? undefined : JSON.stringify(newValue)
    }
  })
}

export async function companyId(): Promise<string> {
  const c = await prisma.company.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  if (!c) throw new AppError('No active company configured')
  return c.id
}

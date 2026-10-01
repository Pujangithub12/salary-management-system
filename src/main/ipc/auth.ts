import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { endSession, getSession, startSession } from '../session'
import { loginSchema, type SessionUser } from '@shared/schemas'
import { AppError, audit, handle } from './handler'

// Throttle repeated failures per username (in memory is enough for a single-machine app).
const failures = new Map<string, { count: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 5
const LOCK_MS = 60_000

export function registerAuth(): void {
  handle<unknown, SessionUser>('auth:login', { public: true }, async (input) => {
    const { username, password } = loginSchema.parse(input)
    const key = username.toLowerCase()
    const f = failures.get(key)
    if (f && f.lockedUntil > Date.now()) {
      throw new AppError('Too many failed attempts. Try again in a minute.')
    }

    const user = await prisma.user.findUnique({
      where: { username: key },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    })
    const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash))
    if (!user || !ok) {
      const count = (f?.count ?? 0) + 1
      failures.set(
        key,
        count >= MAX_ATTEMPTS ? { count: 0, lockedUntil: Date.now() + LOCK_MS } : { count, lockedUntil: 0 }
      )
      throw new AppError('Invalid username or password')
    }
    failures.delete(key)

    const session: SessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roleName: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.code)
    }
    startSession(session)
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await audit(session, 'LOGIN', 'auth', user.id)
    return session
  })

  handle<void, SessionUser | null>('auth:me', { public: true }, () => getSession())

  handle<void, boolean>('auth:logout', { public: true }, async () => {
    const user = getSession()
    if (user) await audit(user, 'LOGOUT', 'auth', user.id)
    endSession()
    return true
  })
}

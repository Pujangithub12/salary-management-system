import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { userSchema } from '@shared/schemas'
import { AppError, audit, handle } from './handler'

const select = {
  id: true,
  username: true,
  fullName: true,
  isActive: true,
  lastLoginAt: true,
  roleId: true,
  role: { select: { id: true, name: true } }
} as const

export function registerUsers(): void {
  handle<void, unknown>('users:list', { perm: 'users.view' }, () =>
    prisma.user.findMany({ select, orderBy: { username: 'asc' } })
  )

  handle<void, unknown>('roles:list', { perm: ['users.view', 'users.create', 'users.update'] }, () =>
    prisma.role.findMany({ orderBy: { name: 'asc' }, include: { permissions: { include: { permission: true } } } })
  )

  handle<unknown, unknown>('users:create', { perm: 'users.create' }, async (input, user) => {
    const data = userSchema.parse(input)
    if (!data.password) throw new AppError('Password is required for a new user')
    const rec = await prisma.user.create({
      data: {
        username: data.username.toLowerCase(),
        fullName: data.fullName,
        roleId: data.roleId,
        isActive: data.isActive,
        passwordHash: await bcrypt.hash(data.password, 10)
      },
      select
    })
    await audit(user, 'CREATE', 'user', rec.id, undefined, rec)
    return rec
  })

  handle<{ id: string; data: unknown }, unknown>('users:update', { perm: 'users.update' }, async (input, user) => {
    const data = userSchema.parse(input.data)
    if (input.id === user?.id && !data.isActive) throw new AppError('You cannot deactivate your own account')
    const before = await prisma.user.findUniqueOrThrow({ where: { id: input.id }, select })
    const rec = await prisma.user.update({
      where: { id: input.id },
      data: {
        username: data.username.toLowerCase(),
        fullName: data.fullName,
        roleId: data.roleId,
        isActive: data.isActive,
        ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {})
      },
      select
    })
    await audit(user, data.password ? 'UPDATE+PASSWORD_RESET' : 'UPDATE', 'user', rec.id, before, rec)
    return rec
  })
}

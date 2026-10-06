import { z } from 'zod'
import { prisma } from '../db'
import { companySchema } from '@shared/schemas'
import { audit, handle } from './handler'

const id = z.string().min(1)

export function registerCompany(): void {
  handle<void, unknown>('companies:list', { perm: 'company.view' }, () =>
    prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } }
    })
  )

  handle<string, unknown>('company:get', { perm: 'company.view' }, (companyId) =>
    prisma.company.findUniqueOrThrow({ where: { id: id.parse(companyId) } })
  )

  handle<unknown, unknown>('company:create', { perm: 'company.create' }, async (input, user) => {
    const rec = await prisma.company.create({ data: companySchema.parse(input) })
    await audit(user, 'CREATE', 'company', rec.id, undefined, rec)
    return rec
  })

  handle<{ id: string; data: unknown }, unknown>('company:update', { perm: 'company.update' }, async (input, user) => {
    const data = companySchema.parse(input.data)
    const before = await prisma.company.findUniqueOrThrow({ where: { id: id.parse(input.id) } })
    const after = await prisma.company.update({ where: { id: before.id }, data })
    await audit(user, 'UPDATE', 'company', before.id, before, after)
    return after
  })
}

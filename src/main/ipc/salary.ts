import { prisma } from '../db'
import { listQuerySchema, salaryComponentSchema } from '@shared/schemas'
import { audit, companyId, handle } from './handler'

export function registerSalary(): void {
  handle<unknown, unknown>('salary-components:list', { perm: 'salary.view' }, async (input) => {
    const q = listQuerySchema.parse(input ?? {})
    const where = {
      companyId: await companyId(),
      ...(q.type ? { type: q.type } : {}),
      ...(q.status ? { isActive: q.status === 'ACTIVE' } : {}),
      ...(q.search ? { OR: [{ name: { contains: q.search } }, { code: { contains: q.search } }] } : {})
    }
    const [items, total] = await Promise.all([
      prisma.salaryComponent.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize
      }),
      prisma.salaryComponent.count({ where })
    ])
    return { items, total, page: q.page, pageSize: q.pageSize }
  })

  handle<unknown, unknown>('salary-components:create', { perm: 'salary.create' }, async (input, user) => {
    const data = salaryComponentSchema.parse(input)
    const rec = await prisma.salaryComponent.create({ data: { ...data, companyId: await companyId() } })
    await audit(user, 'CREATE', 'salary-component', rec.id, undefined, rec)
    return rec
  })

  handle<{ id: string; data: unknown }, unknown>('salary-components:update', { perm: 'salary.update' }, async (input, user) => {
    const data = salaryComponentSchema.parse(input.data)
    const before = await prisma.salaryComponent.findUniqueOrThrow({ where: { id: input.id } })
    const rec = await prisma.salaryComponent.update({ where: { id: input.id }, data })
    await audit(user, 'UPDATE', 'salary-component', rec.id, before, rec)
    return rec
  })
}

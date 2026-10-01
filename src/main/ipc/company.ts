import { prisma } from '../db'
import { companySchema } from '@shared/schemas'
import { audit, companyId, handle } from './handler'

export function registerCompany(): void {
  handle<void, unknown>('company:get', { perm: 'company.view' }, async () =>
    prisma.company.findUniqueOrThrow({ where: { id: await companyId() } })
  )

  handle<unknown, unknown>('company:update', { perm: 'company.update' }, async (input, user) => {
    const data = companySchema.parse(input)
    const id = await companyId()
    const before = await prisma.company.findUniqueOrThrow({ where: { id } })
    const after = await prisma.company.update({ where: { id }, data })
    await audit(user, 'UPDATE', 'company', id, before, after)
    return after
  })
}

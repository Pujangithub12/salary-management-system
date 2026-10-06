import { prisma } from '../db'
import { departmentSchema, designationSchema, listQuerySchema } from '@shared/schemas'
import { AppError, audit, existingCompany, handle } from './handler'

export function registerOrganization(): void {
  // ---- Departments ----
  handle<unknown, unknown>('departments:list', { perm: 'department.view' }, async (input) => {
    const q = listQuerySchema.parse(input ?? {})
    const where = {
      ...(q.companyId ? { companyId: q.companyId } : {}),
      ...(q.status ? { isActive: q.status === 'ACTIVE' } : {}),
      ...(q.search ? { OR: [{ name: { contains: q.search } }, { code: { contains: q.search } }] } : {})
    }
    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { company: { select: { id: true, name: true } }, _count: { select: { employees: true } } }
      }),
      prisma.department.count({ where })
    ])
    return { items, total, page: q.page, pageSize: q.pageSize }
  })

  handle<unknown, unknown>('departments:create', { perm: 'department.create' }, async (input, user) => {
    const data = departmentSchema.parse(input)
    const rec = await prisma.department.create({ data: { ...data, companyId: await existingCompany(data.companyId) } })
    await audit(user, 'CREATE', 'department', rec.id, undefined, rec)
    return rec
  })

  handle<{ id: string; data: unknown }, unknown>('departments:update', { perm: 'department.update' }, async (input, user) => {
    const { companyId: _ignored, ...data } = departmentSchema.parse(input.data) // company cannot change after creation
    const before = await prisma.department.findUniqueOrThrow({ where: { id: input.id } })
    const rec = await prisma.department.update({ where: { id: input.id }, data })
    await audit(user, 'UPDATE', 'department', rec.id, before, rec)
    return rec
  })

  // ---- Designations ----
  handle<unknown, unknown>('designations:list', { perm: 'designation.view' }, async (input) => {
    const q = listQuerySchema.parse(input ?? {})
    const where = {
      ...(q.companyId ? { companyId: q.companyId } : {}),
      ...(q.status ? { isActive: q.status === 'ACTIVE' } : {}),
      ...(q.departmentId ? { departmentId: q.departmentId } : {}),
      ...(q.search ? { OR: [{ title: { contains: q.search } }, { code: { contains: q.search } }] } : {})
    }
    const [items, total] = await Promise.all([
      prisma.designation.findMany({
        where,
        orderBy: { title: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { company: { select: { id: true, name: true } }, department: { select: { id: true, name: true } }, _count: { select: { employees: true } } }
      }),
      prisma.designation.count({ where })
    ])
    return { items, total, page: q.page, pageSize: q.pageSize }
  })

  handle<unknown, unknown>('designations:create', { perm: 'designation.create' }, async (input, user) => {
    const data = designationSchema.parse(input)
    const company = await existingCompany(data.companyId)
    if (data.departmentId) {
      const dep = await prisma.department.findUnique({ where: { id: data.departmentId }, select: { companyId: true } })
      if (dep?.companyId !== company) throw new AppError('The department belongs to a different company')
    }
    const rec = await prisma.designation.create({ data: { ...data, companyId: company } })
    await audit(user, 'CREATE', 'designation', rec.id, undefined, rec)
    return rec
  })

  handle<{ id: string; data: unknown }, unknown>('designations:update', { perm: 'designation.update' }, async (input, user) => {
    const { companyId: _ignored, ...data } = designationSchema.parse(input.data)
    const before = await prisma.designation.findUniqueOrThrow({ where: { id: input.id } })
    if (data.departmentId) {
      const dep = await prisma.department.findUnique({ where: { id: data.departmentId }, select: { companyId: true } })
      if (dep?.companyId !== before.companyId) throw new AppError('The department belongs to a different company')
    }
    const rec = await prisma.designation.update({ where: { id: input.id }, data })
    await audit(user, 'UPDATE', 'designation', rec.id, before, rec)
    return rec
  })

  // Light-weight lists for dropdowns.
  handle<void, unknown>(
    'lookups:organization',
    { perm: ['department.view', 'designation.view', 'employee.view'] },
    async () => {
      const [companies, departments, designations] = await Promise.all([
        prisma.company.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } }),
        prisma.department.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, companyId: true, name: true, code: true, isActive: true }
        }),
        prisma.designation.findMany({
          orderBy: { title: 'asc' },
          select: { id: true, companyId: true, title: true, code: true, departmentId: true, isActive: true }
        })
      ])
      return { companies, departments, designations }
    }
  )
}

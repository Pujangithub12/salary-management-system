import type { Prisma } from '@db-client'
import { prisma } from '../db'
import { employeeSchema, listQuerySchema, terminateSchema } from '@shared/schemas'
import { AppError, assertSameCompany, audit, existingCompany, handle } from './handler'

const SORTABLE = new Set(['employeeCode', 'fullName', 'dateJoined', 'status', 'employeeType', 'createdAt'])

const toDb = (d: ReturnType<typeof employeeSchema.parse>) => ({
  ...d,
  gender: d.gender ?? null,
  dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
  dateJoined: new Date(d.dateJoined),
  dateLeft: d.dateLeft ? new Date(d.dateLeft) : null,
  departmentId: d.departmentId ?? null,
  designationId: d.designationId ?? null,
  managerId: d.managerId ?? null
})

const include = {
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, title: true } },
  manager: { select: { id: true, fullName: true, employeeCode: true } }
} satisfies Prisma.EmployeeInclude

export function registerEmployees(): void {
  handle<unknown, unknown>('employees:list', { perm: 'employee.view' }, async (input) => {
    const q = listQuerySchema.parse(input ?? {})
    const where: Prisma.EmployeeWhereInput = {
      ...(q.companyId ? { companyId: q.companyId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.employeeType ? { employeeType: q.employeeType } : {}),
      ...(q.departmentId ? { departmentId: q.departmentId } : {}),
      ...(q.designationId ? { designationId: q.designationId } : {}),
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search } },
              { employeeCode: { contains: q.search } },
              { panNumber: { contains: q.search } },
              { ssfNumber: { contains: q.search } },
              { mobile: { contains: q.search } }
            ]
          }
        : {})
    }
    const sortBy = q.sortBy && SORTABLE.has(q.sortBy) ? q.sortBy : 'employeeCode'
    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include,
        orderBy: { [sortBy]: q.sortDir },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize
      }),
      prisma.employee.count({ where })
    ])
    return { items, total, page: q.page, pageSize: q.pageSize }
  })

  handle<string, unknown>('employees:get', { perm: 'employee.view' }, (id) =>
    prisma.employee.findUniqueOrThrow({ where: { id }, include })
  )

  handle<void, unknown>('employees:options', { perm: 'employee.view' }, async () =>
    prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { fullName: 'asc' },
      select: { id: true, companyId: true, fullName: true, employeeCode: true }
    })
  )

  handle<unknown, unknown>('employees:create', { perm: 'employee.create' }, async (input, user) => {
    const data = toDb(employeeSchema.parse(input))
    const company = await existingCompany(data.companyId)
    await assertSameCompany(company, data)
    const rec = await prisma.employee.create({ data: { ...data, companyId: company } })
    await audit(user, 'CREATE', 'employee', rec.id, undefined, rec)
    return rec
  })

  handle<{ id: string; data: unknown }, unknown>('employees:update', { perm: 'employee.update' }, async (input, user) => {
    const data = toDb(employeeSchema.parse(input.data))
    if (data.managerId === input.id) throw new AppError('An employee cannot be their own supervisor')
    const before = await prisma.employee.findUniqueOrThrow({ where: { id: input.id } })
    const company = await existingCompany(data.companyId)
    await assertSameCompany(company, data)
    const rec = await prisma.employee.update({ where: { id: input.id }, data: { ...data, companyId: company } })
    await audit(user, 'UPDATE', 'employee', rec.id, before, rec)
    return rec
  })

  // Employees are never hard-deleted: payroll history must stay intact.
  handle<string, unknown>('employees:deactivate', { perm: 'employee.delete' }, async (id, user) => {
    const before = await prisma.employee.findUniqueOrThrow({ where: { id } })
    const rec = await prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE', dateLeft: before.dateLeft ?? new Date() }
    })
    await audit(user, 'DEACTIVATE', 'employee', id, { status: before.status }, { status: rec.status })
    return rec
  })

  // Ends employment: records status and last working day. Payroll history is untouched.
  handle<{ id: string; data: unknown }, unknown>('employees:terminate', { perm: 'employee.terminate' }, async (input, user) => {
    const { date, status } = terminateSchema.parse(input.data)
    const before = await prisma.employee.findUniqueOrThrow({ where: { id: input.id } })
    if (before.status === 'TERMINATED' || before.status === 'RESIGNED') throw new AppError('This employee has already left the company')
    const when = new Date(date)
    if (when < before.dateJoined) throw new AppError('Termination date cannot be before the joining date')
    const rec = await prisma.employee.update({ where: { id: input.id }, data: { status, dateLeft: when } })
    await audit(user, 'TERMINATE', 'employee', input.id, { status: before.status, dateLeft: before.dateLeft }, { status, dateLeft: when })
    return rec
  })
}

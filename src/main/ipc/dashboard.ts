import { prisma } from '../db'
import { companyId, handle } from './handler'

export function registerDashboard(): void {
  // Shown on every screen (sidebar logo, header badge); needs a session but no specific permission.
  handle<void, unknown>('app:shell', {}, async () => {
    const c = await prisma.company.findUniqueOrThrow({ where: { id: await companyId() } })
    return { name: c.name, logoPath: c.logoPath, fiscalYear: c.currentFiscalYear }
  })

  handle<void, unknown>('dashboard:summary', {}, async () => {
    const cid = await companyId()
    const [total, active, inactive, byDept] = await Promise.all([
      prisma.employee.count({ where: { companyId: cid } }),
      prisma.employee.count({ where: { companyId: cid, status: 'ACTIVE' } }),
      prisma.employee.count({ where: { companyId: cid, status: { not: 'ACTIVE' } } }),
      prisma.employee.groupBy({ by: ['departmentId'], where: { companyId: cid, status: 'ACTIVE' }, _count: { _all: true } })
    ])
    const depts = await prisma.department.findMany({ where: { companyId: cid }, select: { id: true, name: true } })
    const name = new Map(depts.map((d) => [d.id, d.name]))
    const departments = byDept
      .map((r) => ({ name: r.departmentId ? (name.get(r.departmentId) ?? 'Unknown') : 'Unassigned', value: r._count._all }))
      .sort((a, b) => b.value - a.value)
    // Payroll, leave and trend figures are added when those modules exist; empty until then.
    return { total, active, inactive, departments, salaryTrend: [], recentPayroll: [], pendingLeave: null, grossSalary: null, netSalary: null }
  })
}

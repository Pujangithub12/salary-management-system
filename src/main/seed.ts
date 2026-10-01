import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { PERMISSIONS, SYSTEM_ROLES } from '@shared/permissions'

/** Idempotent: syncs permissions/roles every start, creates first-run data only when missing. */
export async function seed(): Promise<void> {
  for (const [code, label] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { code }, update: { label }, create: { code, label } })
  }
  const perms = await prisma.permission.findMany()
  const permId = new Map(perms.map((p) => [p.code, p.id]))

  for (const r of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description, isSystem: true }
    })
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.rolePermission.createMany({
      data: r.permissions.map((code) => ({ roleId: role.id, permissionId: permId.get(code)! }))
    })
  }

  if ((await prisma.company.count()) === 0) {
    const company = await prisma.company.create({ data: { name: 'My Company', currentFiscalYear: '2082/83' } })
    const departments = [
      ['Human Resources', 'HR'],
      ['Finance', 'FIN'],
      ['IT', 'IT'],
      ['Administration', 'ADM'],
      ['Sales', 'SAL'],
      ['Marketing', 'MKT']
    ]
    for (const [name, code] of departments) {
      await prisma.department.create({ data: { companyId: company.id, name, code } })
    }
    const designations = [
      ['Manager', 'MGR'],
      ['Accountant', 'ACC'],
      ['Software Engineer', 'SWE'],
      ['HR Officer', 'HRO'],
      ['Administrative Assistant', 'AA'],
      ['Sales Officer', 'SO']
    ]
    for (const [title, code] of designations) {
      await prisma.designation.create({ data: { companyId: company.id, title, code } })
    }
    const components: [string, string, string, boolean, boolean][] = [
      ['Basic Salary', 'BASIC', 'EARNING', true, true],
      ['Grade Allowance', 'GRADE', 'EARNING', true, false],
      ['Housing Allowance', 'HOUSING', 'EARNING', true, false],
      ['Transportation Allowance', 'TRANSPORT', 'EARNING', true, false],
      ['Medical Allowance', 'MEDICAL', 'EARNING', true, false],
      ['Communication Allowance', 'COMMUNICATION', 'EARNING', true, false],
      ['Overtime', 'OVERTIME', 'EARNING', true, false],
      ['Bonus', 'BONUS', 'EARNING', true, false],
      ['Loan Deduction', 'LOAN', 'DEDUCTION', false, false],
      ['Salary Advance', 'ADVANCE', 'DEDUCTION', false, false]
    ]
    for (const [name, code, type, isTaxable, ssfApplicable] of components) {
      await prisma.salaryComponent.create({
        data: { companyId: company.id, name, code, type, isTaxable, ssfApplicable }
      })
    }
  }

  if ((await prisma.user.count()) === 0) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Super Admin' } })
    await prisma.user.create({
      data: {
        username: 'admin',
        fullName: 'Administrator',
        passwordHash: await bcrypt.hash('Admin@123', 10),
        roleId: role.id
      }
    })
  }
}

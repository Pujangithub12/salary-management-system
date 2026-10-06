import { prisma } from '../db'
import { salaryStructureSchema } from '@shared/payroll-schemas'
import { AppError, audit, companyId, handle } from './handler'

async function currentFiscalYear(): Promise<string> {
  const c = await prisma.company.findUniqueOrThrow({ where: { id: await companyId() } })
  if (!c.currentFiscalYear) throw new AppError('Set the current fiscal year under Settings > Company first')
  return c.currentFiscalYear
}

export function registerSalaryStructure(): void {
  handle<string, unknown>('salary-structure:get', { perm: 'salary.view' }, async (employeeId) => {
    const cid = await companyId()
    const fiscalYear = await currentFiscalYear()
    const [structure, components, slabs] = await Promise.all([
      prisma.employeeSalary.findUnique({
        where: { employeeId_fiscalYear: { employeeId, fiscalYear } },
        include: { items: true, advances: true }
      }),
      prisma.salaryComponent.findMany({
        where: { companyId: cid, type: 'EARNING', isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true, ssfApplicable: true }
      }),
      prisma.taxSlab.findMany({ where: { fiscalYear }, orderBy: { sortOrder: 'asc' } })
    ])
    if (!slabs.length) throw new AppError(`No tax slabs found for fiscal year ${fiscalYear}`)
    return {
      fiscalYear,
      ssfEnrolled: structure?.ssfEnrolled ?? true,
      citAnnual: structure ? structure.citAnnual.toString() : '0',
      femaleTaxCredit: structure?.femaleTaxCredit ?? false,
      items: (structure?.items ?? []).map((i) => ({ componentId: i.componentId, annualAmount: i.annualAmount.toString() })),
      advances: (structure?.advances ?? []).map((a) => ({
        month: a.monthIndex,
        openingAdvance: a.openingAdvance === null ? null : a.openingAdvance.toString(),
        deductionMade: a.deductionMade.toString()
      })),
      components,
      slabs: slabs.map((s) => ({
        upTo: s.upTo === null ? null : s.upTo.toString(),
        rate: s.rate.toString(),
        socialSecurity: s.socialSecurity
      }))
    }
  })

  handle<{ employeeId: string; data: unknown }, unknown>('salary-structure:save', { perm: 'salary.update' }, async (input, user) => {
    const data = salaryStructureSchema.parse(input.data)
    const cid = await companyId()
    const fiscalYear = await currentFiscalYear()
    const where = { employeeId_fiscalYear: { employeeId: input.employeeId, fiscalYear } }

    const ids = data.items.map((i) => i.componentId)
    if (new Set(ids).size !== ids.length) throw new AppError('A salary component can only be added once')
    const valid = await prisma.salaryComponent.count({ where: { id: { in: ids }, companyId: cid, type: 'EARNING' } })
    if (valid !== ids.length) throw new AppError('Invalid salary component selected')
    const months = data.advances.map((a) => a.month)
    if (new Set(months).size !== months.length) throw new AppError('Each month can only have one advance entry')

    const before = await prisma.employeeSalary.findUnique({ where, include: { items: true, advances: true } })
    const rec = await prisma.$transaction(async (tx) => {
      const s = await tx.employeeSalary.upsert({
        where,
        update: { ssfEnrolled: data.ssfEnrolled, citAnnual: data.citAnnual, femaleTaxCredit: data.femaleTaxCredit },
        create: {
          employeeId: input.employeeId,
          fiscalYear,
          ssfEnrolled: data.ssfEnrolled,
          citAnnual: data.citAnnual,
          femaleTaxCredit: data.femaleTaxCredit
        }
      })
      await tx.employeeSalaryItem.deleteMany({ where: { salaryId: s.id } })
      if (data.items.length) {
        await tx.employeeSalaryItem.createMany({
          data: data.items.map((i) => ({ salaryId: s.id, componentId: i.componentId, annualAmount: i.annualAmount }))
        })
      }
      await tx.employeeAdvance.deleteMany({ where: { salaryId: s.id } })
      if (data.advances.length) {
        await tx.employeeAdvance.createMany({
          data: data.advances.map((a) => ({
            salaryId: s.id,
            monthIndex: a.month,
            openingAdvance: a.openingAdvance,
            deductionMade: a.deductionMade
          }))
        })
      }
      return s
    })
    await audit(user, before ? 'UPDATE' : 'CREATE', 'employee-salary', rec.id, before ?? undefined, data)
    return { saved: true }
  })
}
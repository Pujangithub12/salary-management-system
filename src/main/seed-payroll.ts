import { prisma } from './db'

/** Payroll reference data: the "Others" allowance type and the tax slabs. Safe to run on every start. */
export async function seedPayroll(): Promise<void> {
  const company = await prisma.company.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  if (company) {
    await prisma.salaryComponent.upsert({
      where: { companyId_code: { companyId: company.id, code: 'OTHERS' } },
      update: {},
      create: { companyId: company.id, name: 'Others', code: 'OTHERS', type: 'EARNING' }
    })
  }

  if ((await prisma.taxSlab.count({ where: { fiscalYear: '2083/84' } })) === 0) {
    // Cumulative upper limit, rate %, social-security slab (waived for SSF contributors).
    const slabs: [number | null, number, boolean][] = [
      [1000000, 1, true],
      [1500000, 10, false],
      [2500000, 20, false],
      [4000000, 27, false],
      [null, 29, false]
    ]
    await prisma.taxSlab.createMany({
      data: slabs.map(([upTo, rate, socialSecurity], i) => ({
        fiscalYear: '2083/84',
        sortOrder: i + 1,
        upTo,
        rate,
        socialSecurity
      }))
    })
  }
}
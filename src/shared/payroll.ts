import { Decimal } from 'decimal.js'

/** Nepali fiscal year order: it starts in Shrawan and ends in Ashadh. */
export const FISCAL_MONTHS = [
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
  'Baisakh',
  'Jestha',
  'Ashadh'
] as const

export interface SalaryItemInput {
  code: string
  name: string
  annualAmount: string
  ssfApplicable: boolean
}

/** `upTo` is the cumulative upper limit of the slab (null = no limit); `rate` is a percentage. */
export interface TaxSlabInput {
  upTo: string | null
  rate: string
  socialSecurity: boolean
}

export interface PayrollRules {
  ssfEmployeeRate: string
  ssfEmployerRate: string
  /** Yearly ceiling on the SSF + CIT deduction (the other limit is one third of annual income). */
  retirementCap: string
  /** Percentage of the annual tax given back as a rebate when the female tax credit applies. */
  femaleTaxCreditRate: string
}

export const DEFAULT_RULES: PayrollRules = {
  ssfEmployeeRate: '11',
  ssfEmployerRate: '20',
  retirementCap: '500000',
  femaleTaxCreditRate: '10'
}

/** One month of the advance ledger. `openingAdvance` null means "carry over last month's closing". */
export interface AdvanceInput {
  month: number // 1 = Shrawan ... 12 = Ashadh
  openingAdvance: string | null
  deductionMade: string
}

export interface ScheduleOptions {
  /** Yearly CIT contribution. It shares the SSF deduction limit and only lowers taxable income. */
  citAnnual?: string
  femaleTaxCredit?: boolean
  advances?: AdvanceInput[]
  rules?: PayrollRules
}

export interface MonthRow {
  month: string
  gross: string
  ssfEmployee: string
  tds: string
  net: string
  ssfEmployer: string
  /** False for months with no advance entry; those months stay blank and do not repeat a carried balance. */
  advanceActive: boolean
  openingAdvance: string
  deductionMade: string
  closingAdvance: string
  /** Net salary minus the closing advance, as in the payroll sheet. */
  payable: string
}

export interface PayrollSchedule {
  annual: {
    gross: string
    ssfBase: string
    ssfEmployee: string
    ssfEmployer: string
    cit: string
    taxableIncome: string
    taxBeforeCredit: string
    femaleTaxCredit: string
    tds: string
    net: string
    advanceDeducted: string
    payable: string
  }
  months: MonthRow[]
}

const money = (d: Decimal): string => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)

/** Splits a yearly total into equal 2-decimal parts; the last part absorbs the rounding difference. */
export function splitEvenly(total: Decimal, parts = 12): Decimal[] {
  const each = total.div(parts).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const out = Array.from({ length: parts - 1 }, () => each)
  out.push(total.minus(each.times(parts - 1)))
  return out
}

/** Progressive tax. The social-security slab is free for SSF contributors. */
export function annualTax(taxable: Decimal, slabs: TaxSlabInput[], ssfEnrolled: boolean): Decimal {
  const sorted = [...slabs].sort((a, b) => (a.upTo === null ? 1 : b.upTo === null ? -1 : new Decimal(a.upTo).cmp(b.upTo)))
  let lower = new Decimal(0)
  let tax = new Decimal(0)
  for (const s of sorted) {
    if (taxable.lte(lower)) break
    const upper = s.upTo === null ? taxable : Decimal.min(taxable, new Decimal(s.upTo))
    const rate = s.socialSecurity && ssfEnrolled ? new Decimal(0) : new Decimal(s.rate)
    tax = tax.plus(upper.minus(lower).times(rate).div(100))
    lower = upper
  }
  return tax
}

/**
 * Opening -> closing advance for each month. Only months with an entry (an opening figure or a deduction) take part:
 * such a month opens with the figure typed, or else with the closing of the last month that had an entry.
 * Months with no entry stay blank and their payable salary is just the net salary.
 */
function advanceLedger(inputs: AdvanceInput[], nets: Decimal[]) {
  let carry = new Decimal(0)
  const zero = new Decimal(0)
  return nets.map((net, i) => {
    const inp = inputs.find((x) => x.month === i + 1)
    const deduction = new Decimal(inp?.deductionMade || 0)
    const active = !!inp?.openingAdvance || deduction.gt(0)
    if (!active) return { active, opening: zero, deduction: zero, closing: zero, payable: net }
    const opening = inp?.openingAdvance ? new Decimal(inp.openingAdvance) : carry
    const closing = opening.minus(deduction)
    carry = closing
    return { active, opening, deduction, closing, payable: net.minus(closing) }
  })
}

export function calculateSchedule(
  items: SalaryItemInput[],
  slabs: TaxSlabInput[],
  ssfEnrolled: boolean,
  options: ScheduleOptions = {}
): PayrollSchedule {
  const rules = options.rules ?? DEFAULT_RULES
  const gross = items.reduce((s, i) => s.plus(i.annualAmount || 0), new Decimal(0))
  const ssfBase = items.reduce((s, i) => (i.ssfApplicable ? s.plus(i.annualAmount || 0) : s), new Decimal(0))

  const ssfEmployee = ssfEnrolled ? ssfBase.times(rules.ssfEmployeeRate).div(100) : new Decimal(0)
  const ssfEmployer = ssfEnrolled ? ssfBase.times(rules.ssfEmployerRate).div(100) : new Decimal(0)

  // Same as the payroll sheet: the employer's SSF counts as income, and the full SSF (employee + employer)
  // plus CIT is deducted, limited to the lower of the cap and one third of that income.
  const assessable = gross.plus(ssfEmployer)
  const cit = new Decimal(options.citAnnual || 0)
  const deduction = Decimal.min(ssfEmployee.plus(ssfEmployer).plus(cit), new Decimal(rules.retirementCap), assessable.div(3))
  const taxable = Decimal.max(assessable.minus(deduction), 0)
  const taxBeforeCredit = annualTax(taxable, slabs, ssfEnrolled)
  const credit = options.femaleTaxCredit ? taxBeforeCredit.times(rules.femaleTaxCreditRate).div(100) : new Decimal(0)
  const tds = taxBeforeCredit.minus(credit)

  const g = splitEvenly(gross)
  const s = splitEvenly(ssfEmployee)
  const e = splitEvenly(ssfEmployer)
  const t = splitEvenly(tds)
  const nets = g.map((v, i) => v.minus(s[i]).minus(t[i]))
  const ledger = advanceLedger(options.advances ?? [], nets)
  const advanceDeducted = ledger.reduce((sum, r) => sum.plus(r.deduction), new Decimal(0))
  const net = gross.minus(ssfEmployee).minus(tds)
  const payableTotal = ledger.reduce((sum, r) => sum.plus(r.payable), new Decimal(0))

  const months: MonthRow[] = FISCAL_MONTHS.map((month, i) => ({
    month,
    gross: money(g[i]),
    ssfEmployee: money(s[i]),
    tds: money(t[i]),
    net: money(nets[i]),
    ssfEmployer: money(e[i]),
    advanceActive: ledger[i].active,
    openingAdvance: money(ledger[i].opening),
    deductionMade: money(ledger[i].deduction),
    closingAdvance: money(ledger[i].closing),
    payable: money(ledger[i].payable)
  }))

  return {
    annual: {
      gross: money(gross),
      ssfBase: money(ssfBase),
      ssfEmployee: money(ssfEmployee),
      ssfEmployer: money(ssfEmployer),
      cit: money(cit),
      taxableIncome: money(taxable),
      taxBeforeCredit: money(taxBeforeCredit),
      femaleTaxCredit: money(credit),
      tds: money(tds),
      net: money(net),
      advanceDeducted: money(advanceDeducted),
      payable: money(payableTotal)
    },
    months
  }
}
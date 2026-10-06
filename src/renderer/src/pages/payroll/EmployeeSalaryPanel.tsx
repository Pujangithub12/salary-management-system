import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { calculateSchedule, type AdvanceInput, type TaxSlabInput } from '@shared/payroll'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { CheckField, Field } from '@/components/field'
import { Table, Td, Th } from '@/components/data-table'

interface Component {
  id: string
  name: string
  code: string
  ssfApplicable: boolean
}

interface Structure {
  fiscalYear: string
  ssfEnrolled: boolean
  citAnnual: string
  femaleTaxCredit: boolean
  items: { componentId: string; annualAmount: string }[]
  advances: { month: number; openingAdvance: string | null; deductionMade: string }[]
  components: Component[]
  slabs: TaxSlabInput[]
}

interface AllowanceRow {
  key: number
  componentId: string
  amount: string
}

interface AdvanceCell {
  opening: string
  deduction: string
}

const AMOUNT = /^\d+(\.\d{1,2})?$/
const isAmount = (v: string): boolean => AMOUNT.test(v.trim())
const isBlankOrAmount = (v: string): boolean => v.trim() === '' || isAmount(v)

let rowKey = 1
const blankRow = (): AllowanceRow => ({ key: rowKey++, componentId: '', amount: '' })

// Display only (lakh/crore grouping); all calculation happens in src/shared/payroll.ts with decimal.js.
const fmt = (v: string): string =>
  Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone ?? ''}`}>{fmt(value)}</div>
    </div>
  )
}

export default function EmployeeSalaryPanel({ employeeId }: { employeeId: string }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const canEdit = can('salary.update')
  const key = ['salary-structure', employeeId]

  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api<Structure>('salary-structure:get', employeeId) })

  const [amounts, setAmounts] = useState<Record<string, string>>({}) // Basic / SSF components, by component id
  const [rows, setRows] = useState<AllowanceRow[]>([blankRow()])
  const [ssf, setSsf] = useState(true)
  const [cit, setCit] = useState('')
  const [female, setFemale] = useState(false)
  const [adv, setAdv] = useState<Record<number, AdvanceCell>>({})

  useEffect(() => {
    if (!data) return
    const ssfIds = new Set(data.components.filter((c) => c.ssfApplicable).map((c) => c.id))
    const base: Record<string, string> = {}
    const extra: AllowanceRow[] = []
    for (const i of data.items) {
      if (ssfIds.has(i.componentId)) base[i.componentId] = i.annualAmount
      else extra.push({ key: rowKey++, componentId: i.componentId, amount: i.annualAmount })
    }
    setAmounts(base)
    setRows(extra.length ? extra : [blankRow()])
    setSsf(data.ssfEnrolled)
    setCit(Number(data.citAnnual) === 0 ? '' : data.citAnnual)
    setFemale(data.femaleTaxCredit)
    setAdv(
      Object.fromEntries(
        data.advances.map((a) => [
          a.month,
          { opening: a.openingAdvance ?? '', deduction: Number(a.deductionMade) === 0 ? '' : a.deductionMade }
        ])
      )
    )
  }, [data])

  const baseComps = useMemo(() => data?.components.filter((c) => c.ssfApplicable) ?? [], [data])
  // Allowance types for the dropdown; "Others" always last.
  const allowanceComps = useMemo(
    () =>
      (data?.components.filter((c) => !c.ssfApplicable) ?? []).sort(
        (a, b) => Number(a.code === 'OTHERS') - Number(b.code === 'OTHERS') || a.name.localeCompare(b.name)
      ),
    [data]
  )
  const usedIds = new Set(rows.map((r) => r.componentId).filter(Boolean))

  const citValue = cit.trim() === '' ? '0' : cit.trim()
  const citBad = !isAmount(citValue)

  const advInputs: AdvanceInput[] = Array.from({ length: 12 }, (_, i) => {
    const c = adv[i + 1]
    const o = (c?.opening ?? '').trim()
    const d = (c?.deduction ?? '').trim()
    return { month: i + 1, openingAdvance: isAmount(o) ? o : null, deductionMade: isAmount(d) ? d : '0' }
  })

  const schedule = useMemo(() => {
    if (!data) return null
    const byId = new Map(data.components.map((c) => [c.id, c]))
    const items = [
      ...baseComps.flatMap((c) => {
        const v = (amounts[c.id] ?? '').trim()
        return AMOUNT.test(v) ? [{ code: c.code, name: c.name, annualAmount: v, ssfApplicable: true }] : []
      }),
      ...rows.flatMap((r) => {
        const c = byId.get(r.componentId)
        const v = r.amount.trim()
        return c && AMOUNT.test(v) ? [{ code: c.code, name: c.name, annualAmount: v, ssfApplicable: false }] : []
      })
    ]
    return calculateSchedule(items, data.slabs, ssf, {
      citAnnual: citBad ? '0' : citValue,
      femaleTaxCredit: female,
      advances: advInputs
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, baseComps, amounts, rows, ssf, cit, female, adv])

  const rowError = (r: AllowanceRow): string | undefined => {
    if (r.amount.trim() === '') return undefined
    if (!isAmount(r.amount)) return 'Enter a valid amount'
    if (!r.componentId) return 'Select an allowance type'
    return undefined
  }

  const advCells = Object.values(adv)
  const hasInvalid =
    citBad ||
    Object.values(amounts).some((v) => !isBlankOrAmount(v)) ||
    rows.some((r) => rowError(r)) ||
    advCells.some((c) => !isBlankOrAmount(c.opening) || !isBlankOrAmount(c.deduction)) ||
    !!schedule?.months.some((m) => Number(m.closingAdvance) < 0)

  const save = useMutation({
    mutationFn: () =>
      api('salary-structure:save', {
        employeeId,
        data: {
          ssfEnrolled: ssf,
          citAnnual: citValue,
          femaleTaxCredit: female,
          items: [
            ...Object.entries(amounts).filter(([, v]) => isAmount(v)).map(([componentId, v]) => ({ componentId, annualAmount: v.trim() })),
            ...rows.filter((r) => r.componentId && isAmount(r.amount)).map((r) => ({ componentId: r.componentId, annualAmount: r.amount.trim() }))
          ],
          advances: advInputs
            .filter((a) => a.openingAdvance !== null || Number(a.deductionMade) > 0)
            .map((a) => ({ month: a.month, openingAdvance: a.openingAdvance, deductionMade: a.deductionMade }))
        }
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key })
      toast.success('Salary saved')
    },
    onError: (e) => toast.error(e.message)
  })

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!data || !schedule) return null

  const setRow = (k: number, patch: Partial<AllowanceRow>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)))
  const removeRow = (k: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== k) : [blankRow()]))
  const setCell = (month: number, patch: Partial<AdvanceCell>) =>
    setAdv((a) => ({ ...a, [month]: { ...(a[month] ?? { opening: '', deduction: '' }), ...patch } }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Fiscal year <Badge tone="blue">{data.fiscalYear}</Badge> · Shrawan to Ashadh
        </div>
        {canEdit && (
          <Button onClick={() => save.mutate()} disabled={save.isPending || hasInvalid}>
            {save.isPending ? 'Saving…' : 'Save salary'}
          </Button>
        )}
      </div>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Annual salary</h3>
        {baseComps.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {baseComps.map((c) => {
              const v = amounts[c.id] ?? ''
              return (
                <Field key={c.id} label={`${c.name} (${c.code}) · SSF`} error={!isBlankOrAmount(v) ? 'Enter a valid amount' : undefined}>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={v}
                    disabled={!canEdit}
                    onChange={(e) => setAmounts((a) => ({ ...a, [c.id]: e.target.value }))}
                  />
                </Field>
              )
            })}
          </div>
        )}

        <h4 className="mb-2 mt-5 text-sm font-medium">Allowances</h4>
        <div className="space-y-3">
          {rows.map((r) => {
            const err = rowError(r)
            return (
              <div key={r.key} className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
                <Select
                  value={r.componentId}
                  disabled={!canEdit}
                  aria-label="Allowance type"
                  onChange={(e) => setRow(r.key, { componentId: e.target.value })}
                >
                  <option value="">Select allowance type…</option>
                  {allowanceComps
                    .filter((c) => c.id === r.componentId || !usedIds.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
                <div className="space-y-1">
                  <Input
                    inputMode="decimal"
                    placeholder="Annual amount"
                    value={r.amount}
                    disabled={!canEdit}
                    aria-label="Allowance amount"
                    onChange={(e) => setRow(r.key, { amount: e.target.value })}
                  />
                  {err && (
                    <p role="alert" className="text-xs text-destructive">
                      {err}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button variant="ghost" size="icon" aria-label="Remove allowance" onClick={() => removeRow(r.key)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows((rs) => [...rs, blankRow()])}>
            <Plus className="h-4 w-4" /> Add allowance
          </Button>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4">
          <Field label="CIT contribution (annual)" error={citBad ? 'Enter a valid amount' : undefined}>
            <Input inputMode="decimal" placeholder="0.00" value={cit} disabled={!canEdit} onChange={(e) => setCit(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          <CheckField
            label="Contributes to SSF (11% employee, 20% employer on SSF components; the 1% social security tax is waived)"
            checked={ssf}
            disabled={!canEdit}
            onChange={(e) => setSsf(e.target.checked)}
          />
          <CheckField
            label="Female tax credit (10% rebate on annual tax)"
            checked={female}
            disabled={!canEdit}
            onChange={(e) => setFemale(e.target.checked)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        <Summary label="Annual gross" value={schedule.annual.gross} />
        <Summary label="Annual SSF (employee)" value={schedule.annual.ssfEmployee} />
        <Summary label="Annual TDS" value={schedule.annual.tds} />
        <Summary label="Annual net" value={schedule.annual.net} tone="text-primary" />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th className="text-right">Gross</Th>
              <Th className="text-right">SSF (employee)</Th>
              <Th className="text-right">TDS</Th>
              <Th className="text-right">Net salary</Th>
              <Th className="text-right">Payable salary</Th>
              <Th className="text-right">SSF (employer)</Th>
            </tr>
          </thead>
          <tbody>
            {schedule.months.map((m) => (
              <tr key={m.month} className="hover:bg-muted/50">
                <Td className="font-medium">{m.month}</Td>
                <Td className="text-right">{fmt(m.gross)}</Td>
                <Td className="text-right">{fmt(m.ssfEmployee)}</Td>
                <Td className="text-right">{fmt(m.tds)}</Td>
                <Td className="text-right">{fmt(m.net)}</Td>
                <Td className="text-right font-semibold">{fmt(m.payable)}</Td>
                <Td className="text-right text-muted-foreground">{fmt(m.ssfEmployer)}</Td>
              </tr>
            ))}
            <tr className="bg-muted font-semibold">
              <Td>Total</Td>
              <Td className="text-right">{fmt(schedule.annual.gross)}</Td>
              <Td className="text-right">{fmt(schedule.annual.ssfEmployee)}</Td>
              <Td className="text-right">{fmt(schedule.annual.tds)}</Td>
              <Td className="text-right">{fmt(schedule.annual.net)}</Td>
              <Td className="text-right">{fmt(schedule.annual.payable)}</Td>
              <Td className="text-right">{fmt(schedule.annual.ssfEmployer)}</Td>
            </tr>
          </tbody>
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold">Advances</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Payable salary = net salary minus the closing advance.
        </p>
        <Table>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th className="text-right">Opening advance</Th>
              <Th className="text-right">Deduction made</Th>
              <Th className="text-right">Closing advance</Th>
            </tr>
          </thead>
          <tbody>
            {schedule.months.map((m, i) => {
              const c = adv[i + 1]
              const negative = Number(m.closingAdvance) < 0
              return (
                <tr key={m.month}>
                  <Td className="font-medium">{m.month}</Td>
                  <Td>
                    <Input
                      className="ml-auto w-36 text-right"
                      inputMode="decimal"
                      placeholder={m.advanceActive ? fmt(m.openingAdvance) : ''}
                      value={c?.opening ?? ''}
                      disabled={!canEdit}
                      aria-label={`${m.month} opening advance`}
                      onChange={(e) => setCell(i + 1, { opening: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <Input
                      className="ml-auto w-36 text-right"
                      inputMode="decimal"
                      value={c?.deduction ?? ''}
                      disabled={!canEdit}
                      aria-label={`${m.month} deduction made`}
                      onChange={(e) => setCell(i + 1, { deduction: e.target.value })}
                    />
                  </Td>
                  <Td className={`text-right ${negative ? 'font-semibold text-destructive' : ''}`}>
                    {m.advanceActive ? fmt(m.closingAdvance) : '—'}
                    {negative && <div className="text-xs font-normal">Deduction is more than the advance</div>}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Taxable income {fmt(schedule.annual.taxableIncome)}.
        {female && ` Female tax credit of ${fmt(schedule.annual.femaleTaxCredit)} applied to a tax of ${fmt(schedule.annual.taxBeforeCredit)}.`} Employer SSF is a company cost
        and is not deducted from the employee&apos;s pay.
      </p>
    </div>
  )
}
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Eye } from 'lucide-react'
import { contractSchema, type ContractInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { useToast } from '@/components/toast'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/field'
import type { Employee } from './types'

interface Defaults {
  contractDate: string
  startDate: string
  signatoryName: string
  signatoryTitle: string
  designation: string | null
}

interface Preview {
  html: string
  values: ContractInput
}

export default function ContractDialog({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const toast = useToast()
  const [preview, setPreview] = useState<Preview | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['contract-defaults', employee.id],
    queryFn: () => api<Defaults>('contracts:defaults', employee.id),
    gcTime: 0
  })

  const download = useMutation({
    mutationFn: (v: ContractInput) => api<{ path: string } | null>('contracts:generate', { employeeId: employee.id, data: v }),
    onSuccess: (res) => {
      if (!res) return // user cancelled the save dialog
      toast.success('Contract saved as PDF')
      onDone()
    },
    onError: (e) => toast.error(e.message)
  })

  return (
    <DialogContent
      title={preview ? 'Preview employment agreement' : 'Generate employment agreement'}
      description={`${employee.fullName} (${employee.employeeCode}) · ${employee.designation?.title ?? 'no designation'}`}
      className={preview ? 'max-w-4xl' : 'max-w-2xl'}
    >
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && <ContractForm employee={employee} defaults={data} hidden={!!preview} onCancel={onDone} onPreview={setPreview} />}
      {preview && (
        <div className="space-y-3">
          <iframe
            title="Contract preview"
            srcDoc={preview.html}
            sandbox=""
            className="h-[68vh] w-full rounded-md border bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Page breaks and the page-number footer are added in the downloaded PDF.
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setPreview(null)}>
              <ArrowLeft className="h-4 w-4" /> Back to edit
            </Button>
            <Button onClick={() => download.mutate(preview.values)} disabled={download.isPending}>
              <Download className="h-4 w-4" /> {download.isPending ? 'Saving…' : 'Download PDF'}
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  )
}

function ContractForm({
  employee,
  defaults,
  hidden,
  onCancel,
  onPreview
}: {
  employee: Employee
  defaults: Defaults
  hidden: boolean
  onCancel: () => void
  onPreview: (p: Preview) => void
}) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<ContractInput>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractDate: defaults.contractDate,
      startDate: defaults.startDate,
      monthlySalary: '' as unknown as number,
      payDay: 5,
      bonusPercent: 0,
      benefits: 'Social Security Fund (SSF) contributions as per applicable law',
      probationMonths: 3,
      noticeDays: 30,
      nonSolicitMonths: 12,
      annualLeaveDays: 18,
      sickLeaveDays: 12,
      urgentLeaveDays: 12,
      signatoryName: defaults.signatoryName,
      signatoryTitle: defaults.signatoryTitle
    }
  })

  const render = useMutation({
    mutationFn: async (v: ContractInput) => ({
      html: await api<string>('contracts:preview', { employeeId: employee.id, data: v }),
      values: v
    }),
    onSuccess: onPreview
  })

  const onSubmit = handleSubmit(
    (v) => render.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError))),
    () => toast.error('Please correct the highlighted fields')
  )
  const e = errors

  if (!defaults.designation) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          This employee has no designation. Edit the employee and choose a designation, then generate the contract.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={hidden ? 'hidden' : 'space-y-4'} noValidate>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Effective date" required error={e.contractDate?.message}>
          <Input type="date" {...register('contractDate')} />
        </Field>
        <Field label="Employment starts" required error={e.startDate?.message}>
          <Input type="date" {...register('startDate')} />
        </Field>
        <Field label="Monthly salary (NPR)" required error={e.monthlySalary?.message}>
          <Input type="number" min="0" step="0.01" {...register('monthlySalary')} />
        </Field>
        <Field label="Salary paid on day" error={e.payDay?.message}>
          <Input type="number" min="1" max="31" {...register('payDay')} />
        </Field>
        <Field label="Annual bonus up to (% of base)" error={e.bonusPercent?.message}>
          <Input type="number" min="0" max="100" step="0.5" {...register('bonusPercent')} />
        </Field>
        <Field label="Probation (months)" error={e.probationMonths?.message}>
          <Input type="number" min="0" {...register('probationMonths')} />
        </Field>
        <Field label="Resignation notice (days)" error={e.noticeDays?.message}>
          <Input type="number" min="1" {...register('noticeDays')} />
        </Field>
        <Field label="Non-solicitation (months)" error={e.nonSolicitMonths?.message}>
          <Input type="number" min="0" {...register('nonSolicitMonths')} />
        </Field>
        <Field label="Annual leave (days)" error={e.annualLeaveDays?.message}>
          <Input type="number" min="0" {...register('annualLeaveDays')} />
        </Field>
        <Field label="Sick leave (days)" error={e.sickLeaveDays?.message}>
          <Input type="number" min="0" {...register('sickLeaveDays')} />
        </Field>
        <Field label="Urgent leave (days)" error={e.urgentLeaveDays?.message}>
          <Input type="number" min="0" {...register('urgentLeaveDays')} />
        </Field>
        <Field label="Benefits package (leave blank to omit)" error={e.benefits?.message} className="col-span-3">
          <Input {...register('benefits')} />
        </Field>
        <Field label="Company signatory" required error={e.signatoryName?.message} className="col-span-2">
          <Input placeholder="e.g. Ramesh Shrestha" {...register('signatoryName')} />
        </Field>
        <Field label="Signatory title" required error={e.signatoryTitle?.message}>
          <Input placeholder="e.g. Managing Director" {...register('signatoryTitle')} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        The signatory defaults come from Settings → Company. Preview the PDF first, then download it.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={render.isPending}>
          <Eye className="h-4 w-4" /> {render.isPending ? 'Preparing preview…' : 'Preview'}
        </Button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { separationSchema, type SeparationInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { useToast } from '@/components/toast'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/field'
import { DocumentPreview } from '@/components/document-preview'
import type { Employee } from './types'

interface Defaults {
  agreementDate: string
  terminationDate: string | null
  signatoryName: string
  signatoryTitle: string
  designation: string | null
  status: string
}

interface Preview {
  html: string
  values: SeparationInput
}

/** Separation agreement for an employee who has been terminated or has resigned: form, preview, download. */
export default function SeparationDialog({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const toast = useToast()
  const [preview, setPreview] = useState<Preview | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['separation-defaults', employee.id],
    queryFn: () => api<Defaults>('separation:defaults', employee.id),
    gcTime: 0
  })

  const download = useMutation({
    mutationFn: (v: SeparationInput) => api<{ path: string } | null>('separation:generate', { employeeId: employee.id, data: v }),
    onSuccess: (res) => {
      if (!res) return // user cancelled the save dialog
      toast.success('Separation agreement saved as PDF')
      onDone()
    },
    onError: (e) => toast.error(e.message)
  })

  return (
    <DialogContent
      title={preview ? 'Preview separation agreement' : 'Separation agreement'}
      description={`${employee.fullName} (${employee.employeeCode}) · ${employee.designation?.title ?? 'no designation'}`}
      className={preview ? 'max-w-4xl' : 'max-w-2xl'}
    >
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && <SeparationForm employee={employee} defaults={data} hidden={!!preview} onCancel={onDone} onPreview={setPreview} />}
      {preview && (
        <DocumentPreview
          html={preview.html}
          onBack={() => setPreview(null)}
          onDownload={() => download.mutate(preview.values)}
          downloading={download.isPending}
        />
      )}
    </DialogContent>
  )
}

function SeparationForm({
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
  } = useForm<SeparationInput>({
    resolver: zodResolver(separationSchema),
    defaultValues: {
      agreementDate: defaults.agreementDate,
      terminationDate: defaults.terminationDate ?? '',
      severanceAmount: '' as unknown as number,
      severanceDays: 15,
      healthCoverMonths: 0,
      accruedLeaveDays: 0,
      nonSolicitMonths: 12,
      reviewDays: 21,
      revocationDays: 7,
      signatoryName: defaults.signatoryName,
      signatoryTitle: defaults.signatoryTitle
    }
  })

  const render = useMutation({
    mutationFn: async (v: SeparationInput) => ({
      html: await api<string>('separation:preview', { employeeId: employee.id, data: v }),
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
        <p className="text-sm text-destructive">This employee has no designation. Edit the employee and choose one, then create the agreement.</p>
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
        <Field label="Agreement date" required error={e.agreementDate?.message}>
          <Input type="date" {...register('agreementDate')} />
        </Field>
        <Field label="Termination date" required error={e.terminationDate?.message}>
          <Input type="date" {...register('terminationDate')} />
        </Field>
        <Field label="Severance (NPR)" error={e.severanceAmount?.message}>
          <Input type="number" min="0" step="0.01" {...register('severanceAmount')} />
        </Field>
        <Field label="Pay severance within (days)" error={e.severanceDays?.message}>
          <Input type="number" min="0" {...register('severanceDays')} />
        </Field>
        <Field label="Health cover (months)" error={e.healthCoverMonths?.message}>
          <Input type="number" min="0" {...register('healthCoverMonths')} />
        </Field>
        <Field label="Accrued leave cash-out (days)" error={e.accruedLeaveDays?.message}>
          <Input type="number" min="0" step="0.5" {...register('accruedLeaveDays')} />
        </Field>
        <Field label="Non-solicitation (months)" error={e.nonSolicitMonths?.message}>
          <Input type="number" min="0" {...register('nonSolicitMonths')} />
        </Field>
        <Field label="Review period (days)" error={e.reviewDays?.message}>
          <Input type="number" min="0" {...register('reviewDays')} />
        </Field>
        <Field label="Revocation period (days)" error={e.revocationDays?.message}>
          <Input type="number" min="0" {...register('revocationDays')} />
        </Field>
        <Field label="Company signatory" required error={e.signatoryName?.message} className="col-span-2">
          <Input {...register('signatoryName')} />
        </Field>
        <Field label="Signatory title" required error={e.signatoryTitle?.message}>
          <Input {...register('signatoryTitle')} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter at least one benefit. Set a period to 0 to leave that clause out of the agreement.
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

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { terminateSchema, type TerminateInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/field'
import SeparationDialog from './SeparationDialog'
import type { Employee } from './types'

/**
 * Step 1: record the termination (status + last day).
 * Step 2: offer the separation agreement, which is the PDF the user can preview and download.
 */
export default function TerminateDialog({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [terminated, setTerminated] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<TerminateInput>({
    resolver: zodResolver(terminateSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), status: 'TERMINATED' }
  })

  const terminate = useMutation({
    mutationFn: (v: TerminateInput) => api('employees:terminate', { id: employee.id, data: v }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['employee-options'] })
      toast.success('Employment ended')
      if (can('contract.generate')) setTerminated(true)
      else onDone()
    }
  })

  if (terminated) return <SeparationDialog employee={employee} onDone={onDone} />

  const onSubmit = handleSubmit((v) => terminate.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError))))

  return (
    <DialogContent
      title="Terminate employment"
      description={`${employee.fullName} (${employee.employeeCode}) · ${employee.company.name}`}
      className="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-muted-foreground">
          The employee is marked as having left on the date below. Their records and history are kept. After this you can create the
          separation agreement PDF.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Last working day" required error={errors.date?.message}>
            <Input type="date" {...register('date')} />
          </Field>
          <Field label="Reason" required error={errors.status?.message}>
            <Select {...register('status')}>
              <option value="TERMINATED">Terminated by company</option>
              <option value="RESIGNED">Resigned</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={terminate.isPending}>
            {terminate.isPending ? 'Saving…' : 'Terminate employee'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

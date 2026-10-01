import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EMPLOYEE_STATUSES, EMPLOYEE_TYPES, GENDERS, employeeSchema, type EmployeeInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { humanize, toDateInput } from '@/lib/utils'
import { useToast } from '@/components/toast'
import { useOrgLookups } from '@/hooks/useList'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { DialogContent } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/field'
import { ImagePicker } from '@/components/image-picker'
import type { Employee } from './types'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="space-y-3">
    <legend className="mb-1 border-b pb-1 text-sm font-semibold text-primary w-full">{title}</legend>
    <div className="grid grid-cols-3 gap-3">{children}</div>
  </fieldset>
)

const empty: EmployeeInput = {
  employeeCode: '', fullName: '', panNumber: '', ssfNumber: '', citizenshipNumber: '', gender: null,
  dateOfBirth: '', mobile: '', email: '', address: '', emergencyContact: '', photoPath: '',
  departmentId: '', designationId: '', employeeType: 'PERMANENT', status: 'ACTIVE', dateJoined: '',
  dateLeft: '', managerId: '', grade: '', bankName: '', bankAccountNumber: '', bankAccountHolder: '', bankBranch: ''
}

export default function EmployeeForm({ item, onDone }: { item: Employee | null; onDone: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const lookups = useOrgLookups()
  const managers = useQuery({
    queryKey: ['employee-options'],
    queryFn: () => api<{ id: string; fullName: string; employeeCode: string }[]>('employees:options')
  })
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: item
      ? {
          ...empty,
          ...Object.fromEntries(Object.entries(item).filter(([, v]) => v !== null && typeof v !== 'object')),
          dateOfBirth: toDateInput(item.dateOfBirth),
          dateJoined: toDateInput(item.dateJoined),
          dateLeft: toDateInput(item.dateLeft)
        }
      : empty
  })

  const save = useMutation({
    mutationFn: (v: EmployeeInput) => (item ? api('employees:update', { id: item.id, data: v }) : api('employees:create', v)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] })
      void qc.invalidateQueries({ queryKey: ['employee-options'] })
      toast.success('Employee saved')
      onDone()
    }
  })

  const onSubmit = handleSubmit(
    (v) => save.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError))),
    () => toast.error('Please correct the highlighted fields')
  )
  const e = errors

  return (
    <DialogContent title={item ? `Edit ${item.fullName}` : 'Add employee'} className="max-w-3xl">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Section title="Personal information">
          <div className="col-span-3">
            <Controller
              control={control}
              name="photoPath"
              render={({ field }) => <ImagePicker round label="Photo" value={field.value} onChange={field.onChange} />}
            />
          </div>
          <Field label="Employee ID" required error={e.employeeCode?.message}>
            <Input {...register('employeeCode')} />
          </Field>
          <Field label="Full name" required error={e.fullName?.message} className="col-span-2">
            <Input {...register('fullName')} />
          </Field>
          <Field label="PAN number" error={e.panNumber?.message}>
            <Input {...register('panNumber')} />
          </Field>
          <Field label="SSF number" error={e.ssfNumber?.message}>
            <Input {...register('ssfNumber')} />
          </Field>
          <Field label="Citizenship number" error={e.citizenshipNumber?.message}>
            <Input {...register('citizenshipNumber')} />
          </Field>
          <Field label="Gender" error={e.gender?.message}>
            <Select {...register('gender', { setValueAs: (v) => v || null })}>
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {humanize(g)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date of birth" error={e.dateOfBirth?.message}>
            <Input type="date" {...register('dateOfBirth')} />
          </Field>
          <Field label="Mobile" error={e.mobile?.message}>
            <Input {...register('mobile')} />
          </Field>
          <Field label="Email" error={e.email?.message}>
            <Input {...register('email')} />
          </Field>
          <Field label="Emergency contact" error={e.emergencyContact?.message}>
            <Input {...register('emergencyContact')} />
          </Field>
          <Field label="Address" error={e.address?.message} className="col-span-3">
            <Textarea rows={2} {...register('address')} />
          </Field>
        </Section>

        <Section title="Employment">
          <Field label="Department" error={e.departmentId?.message}>
            <Select {...register('departmentId')}>
              <option value="">—</option>
              {lookups.data?.departments
                .filter((d) => d.isActive || d.id === item?.departmentId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Designation" error={e.designationId?.message}>
            <Select {...register('designationId')}>
              <option value="">—</option>
              {lookups.data?.designations
                .filter((d) => d.isActive || d.id === item?.designationId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Grade / level" error={e.grade?.message}>
            <Input {...register('grade')} />
          </Field>
          <Field label="Employee type" error={e.employeeType?.message}>
            <Select {...register('employeeType')}>
              {EMPLOYEE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" error={e.status?.message}>
            <Select {...register('status')}>
              {EMPLOYEE_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Manager / supervisor" error={e.managerId?.message}>
            <Select {...register('managerId')}>
              <option value="">—</option>
              {managers.data
                ?.filter((m) => m.id !== item?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.employeeCode})
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Date joined" required error={e.dateJoined?.message}>
            <Input type="date" {...register('dateJoined')} />
          </Field>
          <Field label="Date left" error={e.dateLeft?.message}>
            <Input type="date" {...register('dateLeft')} />
          </Field>
        </Section>

        <Section title="Bank information">
          <Field label="Bank name">
            <Input {...register('bankName')} />
          </Field>
          <Field label="Account number">
            <Input {...register('bankAccountNumber')} />
          </Field>
          <Field label="Account holder name">
            <Input {...register('bankAccountHolder')} />
          </Field>
          <Field label="Branch">
            <Input {...register('bankBranch')} />
          </Field>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save employee'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companySchema, type CompanyInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { CheckField, Field } from '@/components/field'
import { ImagePicker } from '@/components/image-picker'
import { PageHeader } from '@/components/data-table'

const BLANK = { name: '', registrationNumber: '', panVatNumber: '', address: '', phone: '', email: '', logoPath: '', bankName: '', bankAccountNumber: '', bankBranch: '', currentFiscalYear: '', tagline: '', website: '', signatoryName: '', signatoryTitle: '', isActive: true }

type Company = Record<keyof CompanyInput, string | boolean | null> & { id: string }

export default function CompanyPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const isNew = id === 'new'
  const readOnly = !can(isNew ? 'company.create' : 'company.update')
  const { data } = useQuery({ queryKey: ['company', id], queryFn: () => api<Company>('company:get', id), enabled: !isNew })
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty }
  } = useForm<CompanyInput>({ resolver: zodResolver(companySchema) })

  useEffect(() => {
    if (isNew) reset(BLANK as CompanyInput)
  }, [isNew, reset])

  useEffect(() => {
    if (!data) return
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? '']))
    reset({ ...clean, isActive: data.isActive as boolean } as CompanyInput)
  }, [data, reset])

  const save = useMutation({
    mutationFn: (v: CompanyInput) => (isNew ? api('company:create', v) : api('company:update', { id, data: v })),
    onSuccess: () => {
      for (const key of ['company', 'companies', 'shell', 'lookups-org']) void qc.invalidateQueries({ queryKey: [key] })
      toast.success(isNew ? 'Company created' : 'Company saved')
      if (isNew) navigate('/companies')
    }
  })

  const onSubmit = handleSubmit((v) => save.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError))))

  return (
    <>
      <PageHeader
        title={isNew ? 'Add company' : 'Edit company'}
        subtitle="Company details used on contracts, payslips and reports"
        actions={
          <Button variant="outline" asChild>
            <Link to="/companies">Back to companies</Link>
          </Button>
        }
      />
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={readOnly} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                control={control}
                name="logoPath"
                render={({ field }) => <ImagePicker label="Logo" value={field.value} onChange={field.onChange} />}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company name" required error={errors.name?.message}>
                  <Input {...register('name')} />
                </Field>
                <Field label="Registration number" error={errors.registrationNumber?.message}>
                  <Input {...register('registrationNumber')} />
                </Field>
                <Field label="PAN / VAT number" error={errors.panVatNumber?.message}>
                  <Input {...register('panVatNumber')} />
                </Field>
                <Field label="Fiscal year" error={errors.currentFiscalYear?.message}>
                  <Input placeholder="e.g. 2082/83" {...register('currentFiscalYear')} />
                </Field>
                <Field label="Tagline" error={errors.tagline?.message}>
                  <Input placeholder="e.g. Build · Innovate · Grow" {...register('tagline')} />
                </Field>
                <Field label="Website" error={errors.website?.message}>
                  <Input {...register('website')} />
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  <Input {...register('phone')} />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <Input {...register('email')} />
                </Field>
              </div>
              <Field label="Address" error={errors.address?.message}>
                <Textarea {...register('address')} />
              </Field>
              <CheckField label="Active" {...register('isActive')} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Authorised signatory (employment contracts)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Name">
                <Input placeholder="e.g. Ramesh Shrestha" {...register('signatoryName')} />
              </Field>
              <Field label="Title">
                <Input placeholder="e.g. Managing Director" {...register('signatoryTitle')} />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bank</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <Field label="Bank name">
                <Input {...register('bankName')} />
              </Field>
              <Field label="Account number">
                <Input {...register('bankAccountNumber')} />
              </Field>
              <Field label="Branch">
                <Input {...register('bankBranch')} />
              </Field>
            </CardContent>
          </Card>
        </fieldset>
        {!readOnly && (
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={save.isPending || (!isNew && !isDirty)}>
              {isNew ? 'Create company' : 'Save changes'}
            </Button>
          </div>
        )}
      </form>
    </>
  )
}

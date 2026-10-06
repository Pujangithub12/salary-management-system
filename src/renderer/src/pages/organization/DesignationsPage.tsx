import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { designationSchema, type DesignationInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { useList, useOrgLookups } from '@/hooks/useList'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { CheckField, Field } from '@/components/field'
import { CompanyField, CompanySelect } from '@/components/company-field'
import { PageHeader, Pagination, SearchBox, StateRow, Table, Td, Th } from '@/components/data-table'

interface Designation {
  id: string
  companyId: string
  company: { id: string; name: string }
  title: string
  code: string
  grade: string | null
  description: string | null
  departmentId: string | null
  department: { id: string; name: string } | null
  isActive: boolean
  _count: { employees: number }
}

export default function DesignationsPage() {
  const { can } = useAuth()
  const [departmentId, setDepartmentId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const list = useList<Designation>('designations', 'designations:list', { departmentId: departmentId || undefined, companyId: companyId || undefined })
  const lookups = useOrgLookups()
  const multiCompany = (lookups.data?.companies.length ?? 0) > 1
  const [editing, setEditing] = useState<Designation | 'new' | null>(null)
  const { data, isLoading, error } = list.query

  return (
    <>
      <PageHeader
        title="Designations"
        subtitle="Job posts and grades"
        actions={
          can('designation.create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Add designation
            </Button>
          )
        }
      />
      <Card>
        <div className="flex gap-3 p-3">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search title or code" />
          {multiCompany && <CompanySelect value={companyId} onChange={setCompanyId} all />}
          <Select className="w-52" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Department filter">
            <option value="">All departments</option>
            {lookups.data?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Title</Th>
              {multiCompany && <Th>Company</Th>}
              <Th>Department</Th>
              <Th>Grade</Th>
              <Th>Employees</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            <StateRow cols={8} loading={isLoading} error={error?.message} empty={!isLoading && !data?.items.length} />
            {data?.items.map((d) => (
              <tr key={d.id}>
                <Td className="font-mono">{d.code}</Td>
                <Td className="font-medium">{d.title}</Td>
                {multiCompany && <Td>{d.company.name}</Td>}
                <Td>{d.department?.name ?? '—'}</Td>
                <Td>{d.grade ?? '—'}</Td>
                <Td>{d._count.employees}</Td>
                <Td>
                  <Badge tone={d.isActive ? 'green' : 'gray'}>{d.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td className="text-right">
                  {can('designation.update') && (
                    <Button variant="ghost" size="icon" aria-label={`Edit ${d.title}`} onClick={() => setEditing(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={data?.total ?? 0} onPage={list.setPage} />
      </Card>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <DesignationForm item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}

function DesignationForm({ item, onDone }: { item: Designation | null; onDone: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const lookups = useOrgLookups()
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = useForm<DesignationInput>({
    resolver: zodResolver(designationSchema),
    defaultValues: item
      ? {
          companyId: item.companyId,
          title: item.title,
          code: item.code,
          departmentId: item.departmentId ?? '',
          grade: item.grade ?? '',
          description: item.description ?? '',
          isActive: item.isActive
        }
      : { companyId: '', title: '', code: '', departmentId: '', grade: '', description: '', isActive: true }
  })

  const formCompany = watch('companyId')

  const save = useMutation({
    mutationFn: (v: DesignationInput) =>
      item ? api('designations:update', { id: item.id, data: v }) : api('designations:create', v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['designations'] })
      void qc.invalidateQueries({ queryKey: ['lookups-org'] })
      toast.success('Designation saved')
      onDone()
    }
  })

  const onSubmit = handleSubmit((v) =>
    save.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError)))
  )

  return (
    <DialogContent title={item ? 'Edit designation' : 'Add designation'}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <CompanyField register={register} setValue={setValue} getValues={getValues} locked={!!item} error={errors.companyId?.message} onChange={() => setValue('departmentId', '')} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Job title" required error={errors.title?.message}>
            <Input {...register('title')} />
          </Field>
          <Field label="Code" required error={errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Department" error={errors.departmentId?.message}>
            <Select {...register('departmentId')}>
              <option value="">— None —</option>
              {lookups.data?.departments
                .filter((d) => d.companyId === formCompany)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Grade" error={errors.grade?.message}>
            <Input {...register('grade')} />
          </Field>
        </div>
        <Field label="Description" error={errors.description?.message}>
          <Textarea {...register('description')} />
        </Field>
        <CheckField label="Active" {...register('isActive')} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

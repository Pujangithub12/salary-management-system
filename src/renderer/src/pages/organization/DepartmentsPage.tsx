import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { departmentSchema, type DepartmentInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { useList } from '@/hooks/useList'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { CheckField, Field } from '@/components/field'
import { PageHeader, Pagination, SearchBox, StateRow, Table, Td, Th } from '@/components/data-table'

interface Department {
  id: string
  name: string
  code: string
  description: string | null
  isActive: boolean
  _count: { employees: number }
}

export default function DepartmentsPage() {
  const { can } = useAuth()
  const list = useList<Department>('departments', 'departments:list')
  const [editing, setEditing] = useState<Department | 'new' | null>(null)
  const { data, isLoading, error } = list.query

  return (
    <>
      <PageHeader
        title="Departments"
        actions={
          can('department.create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Add department
            </Button>
          )
        }
      />
      <Card>
        <div className="p-3">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search name or code" />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Employees</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            <StateRow cols={6} loading={isLoading} error={error?.message} empty={!isLoading && !data?.items.length} />
            {data?.items.map((d) => (
              <tr key={d.id}>
                <Td className="font-mono">{d.code}</Td>
                <Td className="font-medium">{d.name}</Td>
                <Td>{d.description}</Td>
                <Td>{d._count.employees}</Td>
                <Td>
                  <Badge tone={d.isActive ? 'green' : 'gray'}>{d.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td className="text-right">
                  {can('department.update') && (
                    <Button variant="ghost" size="icon" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
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
        {editing && <DepartmentForm item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}

function DepartmentForm({ item, onDone }: { item: Department | null; onDone: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: item
      ? { name: item.name, code: item.code, description: item.description ?? '', isActive: item.isActive }
      : { name: '', code: '', description: '', isActive: true }
  })

  const save = useMutation({
    mutationFn: (v: DepartmentInput) =>
      item ? api('departments:update', { id: item.id, data: v }) : api('departments:create', v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] })
      void qc.invalidateQueries({ queryKey: ['lookups-org'] })
      toast.success('Department saved')
      onDone()
    }
  })

  const onSubmit = handleSubmit((v) =>
    save.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError)))
  )

  return (
    <DialogContent title={item ? 'Edit department' : 'Add department'}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Code" required error={errors.code?.message}>
            <Input {...register('code')} />
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

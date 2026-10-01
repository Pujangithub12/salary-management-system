import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import {
  CALCULATION_METHODS,
  COMPONENT_TYPES,
  salaryComponentSchema,
  type SalaryComponentInput
} from '@shared/schemas'
import { api } from '@/lib/api'
import { humanize } from '@/lib/utils'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { useList } from '@/hooks/useList'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { CheckField, Field } from '@/components/field'
import { PageHeader, Pagination, SearchBox, StateRow, Table, Td, Th } from '@/components/data-table'

interface Component {
  id: string
  name: string
  code: string
  type: 'EARNING' | 'DEDUCTION'
  calculationMethod: 'FIXED' | 'PERCENTAGE' | 'FORMULA'
  formula: string | null
  isTaxable: boolean
  ssfApplicable: boolean
  employeeContribution: boolean
  employerContribution: boolean
  isActive: boolean
}

const yes = (v: boolean) => (v ? 'Yes' : '—')

export default function SalaryComponentsPage() {
  const { can } = useAuth()
  const [type, setType] = useState('')
  const list = useList<Component>('salary-components', 'salary-components:list', { type: type || undefined })
  const [editing, setEditing] = useState<Component | 'new' | null>(null)
  const { data, isLoading, error } = list.query

  return (
    <>
      <PageHeader
        title="Salary Components"
        subtitle="Earnings and deductions used to build salary structures"
        actions={
          can('salary.create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Add component
            </Button>
          )
        }
      />
      <Card>
        <div className="flex gap-3 p-3">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search name or code" />
          <Select className="w-44" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type filter">
            <option value="">All types</option>
            {COMPONENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Calculation</Th>
              <Th>Taxable</Th>
              <Th>SSF</Th>
              <Th>Emp. contrib.</Th>
              <Th>Employer contrib.</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            <StateRow cols={10} loading={isLoading} error={error?.message} empty={!isLoading && !data?.items.length} />
            {data?.items.map((c) => (
              <tr key={c.id}>
                <Td className="font-mono">{c.code}</Td>
                <Td className="font-medium">{c.name}</Td>
                <Td>
                  <Badge tone={c.type === 'EARNING' ? 'blue' : 'amber'}>{humanize(c.type)}</Badge>
                </Td>
                <Td>
                  {humanize(c.calculationMethod)}
                  {c.formula && <div className="font-mono text-xs text-muted-foreground">{c.formula}</div>}
                </Td>
                <Td>{yes(c.isTaxable)}</Td>
                <Td>{yes(c.ssfApplicable)}</Td>
                <Td>{yes(c.employeeContribution)}</Td>
                <Td>{yes(c.employerContribution)}</Td>
                <Td>
                  <Badge tone={c.isActive ? 'green' : 'gray'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td className="text-right">
                  {can('salary.update') && (
                    <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
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
        {editing && <ComponentForm item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}

function ComponentForm({ item, onDone }: { item: Component | null; onDone: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors }
  } = useForm<SalaryComponentInput>({
    resolver: zodResolver(salaryComponentSchema),
    defaultValues: item
      ? { ...item, formula: item.formula ?? '' }
      : {
          name: '',
          code: '',
          type: 'EARNING',
          calculationMethod: 'FIXED',
          formula: '',
          isTaxable: true,
          ssfApplicable: false,
          employeeContribution: false,
          employerContribution: false,
          isActive: true
        }
  })
  const method = watch('calculationMethod')

  const save = useMutation({
    mutationFn: (v: SalaryComponentInput) =>
      item ? api('salary-components:update', { id: item.id, data: v }) : api('salary-components:create', v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['salary-components'] })
      toast.success('Salary component saved')
      onDone()
    }
  })

  const onSubmit = handleSubmit((v) =>
    save.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError)))
  )

  return (
    <DialogContent title={item ? 'Edit salary component' : 'Add salary component'}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <Field label="Code" required error={errors.code?.message}>
            <Input {...register('code')} />
          </Field>
          <Field label="Type" required error={errors.type?.message}>
            <Select {...register('type')}>
              {COMPONENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Calculation method" required error={errors.calculationMethod?.message}>
            <Select {...register('calculationMethod')}>
              {CALCULATION_METHODS.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {method !== 'FIXED' && (
          <Field
            label={method === 'PERCENTAGE' ? 'Percentage expression' : 'Formula'}
            required
            error={errors.formula?.message}
          >
            <Input
              className="font-mono"
              placeholder={method === 'PERCENTAGE' ? 'e.g. basic_salary * 10 / 100' : 'e.g. min(basic_salary * 0.1, 5000)'}
              {...register('formula')}
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <CheckField label="Taxable" {...register('isTaxable')} />
          <CheckField label="SSF applicable" {...register('ssfApplicable')} />
          <CheckField label="Employee contribution" {...register('employeeContribution')} />
          <CheckField label="Employer contribution" {...register('employerContribution')} />
          <CheckField label="Active" {...register('isActive')} />
        </div>
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

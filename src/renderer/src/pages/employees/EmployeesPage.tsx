import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, FileText, Pencil, Plus, ScrollText, UserMinus, UserX } from 'lucide-react'
import { EMPLOYEE_STATUSES, EMPLOYEE_TYPES } from '@shared/schemas'
import { api } from '@/lib/api'
import { formatDate, humanize } from '@/lib/utils'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { useList, useOrgLookups } from '@/hooks/useList'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/input'
import { PageHeader, Pagination, SearchBox, StateRow, Table, Td, Th } from '@/components/data-table'
import { fileUrl } from '@/components/image-picker'
import EmployeeForm from './EmployeeForm'
import EmployeeView from './EmployeeView'
import ContractDialog from './ContractDialog'
import TerminateDialog from './TerminateDialog'
import SeparationDialog from './SeparationDialog'
import type { Employee } from './types'

const statusTone = { ACTIVE: 'green', INACTIVE: 'gray', RESIGNED: 'amber', TERMINATED: 'red' } as const

export default function EmployeesPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const lookups = useOrgLookups()
  const [filters, setFilters] = useState({ companyId: '', status: '', employeeType: '', departmentId: '', designationId: '' })
  const list = useList<Employee>('employees', 'employees:list', {
    companyId: filters.companyId || undefined,
    status: filters.status || undefined,
    employeeType: filters.employeeType || undefined,
    departmentId: filters.departmentId || undefined,
    designationId: filters.designationId || undefined
  })
  const [editing, setEditing] = useState<Employee | 'new' | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [contractFor, setContractFor] = useState<Employee | null>(null)
  const [terminateFor, setTerminateFor] = useState<Employee | null>(null)
  const [separationFor, setSeparationFor] = useState<Employee | null>(null)
  const { data, isLoading, error } = list.query
  const setFilter = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }))
  const multiCompany = (lookups.data?.companies.length ?? 0) > 1
  const sort = { sortBy: list.sortBy, sortDir: list.sortDir, onSort: list.toggleSort }

  const deactivate = useMutation({
    mutationFn: (id: string) => api('employees:deactivate', id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee deactivated')
    },
    onError: (e) => toast.error(e.message)
  })

  return (
    <>
      <PageHeader
        title="Employees"
        actions={
          can('employee.create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Add employee
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 p-3">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder="Name, ID, PAN, SSF, mobile" />
          {(lookups.data?.companies.length ?? 0) > 0 && (
            <Select className="w-48" value={filters.companyId} onChange={setFilter('companyId')} aria-label="Company filter">
              <option value="">All companies</option>
              {lookups.data?.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          <Select className="w-40" value={filters.status} onChange={setFilter('status')} aria-label="Status filter">
            <option value="">All statuses</option>
            {EMPLOYEE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
          <Select className="w-40" value={filters.employeeType} onChange={setFilter('employeeType')} aria-label="Type filter">
            <option value="">All types</option>
            {EMPLOYEE_TYPES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
          <Select className="w-48" value={filters.departmentId} onChange={setFilter('departmentId')} aria-label="Department filter">
            <option value="">All departments</option>
            {lookups.data?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select className="w-48" value={filters.designationId} onChange={setFilter('designationId')} aria-label="Designation filter">
            <option value="">All designations</option>
            {lookups.data?.designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
        </div>
        <Table>
          <thead>
            <tr>
              <Th sortKey="employeeCode" {...sort}>ID</Th>
              <Th sortKey="fullName" {...sort}>Name</Th>
              {multiCompany && <Th>Company</Th>}
              <Th>Department</Th>
              <Th>Designation</Th>
              <Th sortKey="employeeType" {...sort}>Type</Th>
              <Th sortKey="dateJoined" {...sort}>Joined</Th>
              <Th sortKey="status" {...sort}>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            <StateRow cols={9} loading={isLoading} error={error?.message} empty={!isLoading && !data?.items.length} />
            {data?.items.map((e) => (
              <tr key={e.id} className="hover:bg-muted/50">
                <Td className="font-mono">{e.employeeCode}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {e.photoPath ? (
                      <img src={fileUrl(e.photoPath)} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                        {e.fullName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="font-medium">{e.fullName}</span>
                  </div>
                </Td>
                {multiCompany && <Td>{e.company.name}</Td>}
                <Td>{e.department?.name ?? '—'}</Td>
                <Td>{e.designation?.title ?? '—'}</Td>
                <Td>{humanize(e.employeeType)}</Td>
                <Td>{formatDate(e.dateJoined)}</Td>
                <Td>
                  <Badge tone={statusTone[e.status]}>{humanize(e.status)}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="icon" aria-label={`View ${e.fullName}`} onClick={() => setViewing(e.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {can('employee.update') && (
                    <Button variant="ghost" size="icon" aria-label={`Edit ${e.fullName}`} onClick={() => setEditing(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {can('contract.generate') && (
                    <Button variant="ghost" size="icon" aria-label={`Generate contract for ${e.fullName}`} title="Generate employment contract" onClick={() => setContractFor(e)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  {can('employee.terminate') && e.status !== 'TERMINATED' && e.status !== 'RESIGNED' && (
                    <Button variant="ghost" size="icon" aria-label={`Terminate ${e.fullName}`} title="Terminate employment" onClick={() => setTerminateFor(e)}>
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  {can('contract.generate') && (e.status === 'TERMINATED' || e.status === 'RESIGNED') && (
                    <Button variant="ghost" size="icon" aria-label={`Separation agreement for ${e.fullName}`} title="Separation agreement (PDF)" onClick={() => setSeparationFor(e)}>
                      <ScrollText className="h-4 w-4" />
                    </Button>
                  )}
                  {can('employee.delete') && e.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Deactivate ${e.fullName}`}
                      onClick={() => {
                        if (window.confirm(`Deactivate ${e.fullName}? Their records are kept.`)) deactivate.mutate(e.id)
                      }}
                    >
                      <UserX className="h-4 w-4 text-destructive" />
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
        {editing && <EmployeeForm item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <Dialog open={!!contractFor} onOpenChange={(o) => !o && setContractFor(null)}>
        {contractFor && <ContractDialog employee={contractFor} onDone={() => setContractFor(null)} />}
      </Dialog>
      <Dialog open={!!terminateFor} onOpenChange={(o) => !o && setTerminateFor(null)}>
        {terminateFor && <TerminateDialog employee={terminateFor} onDone={() => setTerminateFor(null)} />}
      </Dialog>
      <Dialog open={!!separationFor} onOpenChange={(o) => !o && setSeparationFor(null)}>
        {separationFor && <SeparationDialog employee={separationFor} onDone={() => setSeparationFor(null)} />}
      </Dialog>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        {viewing && <EmployeeView id={viewing} />}
      </Dialog>
    </>
  )
}

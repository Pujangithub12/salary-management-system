import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { humanize } from '@/lib/utils'
import { useList } from '@/hooks/useList'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { PageHeader, Pagination, SearchBox, StateRow, Table, Td, Th } from '@/components/data-table'
import EmployeeSalaryPanel from './EmployeeSalaryPanel'

interface PayrollEmployee {
  id: string
  employeeCode: string
  fullName: string
  status: 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED'
  department: { id: string; name: string } | null
  designation: { id: string; title: string } | null
}

const statusTone = { ACTIVE: 'green', INACTIVE: 'gray', RESIGNED: 'amber', TERMINATED: 'red' } as const

export default function PayrollPage() {
  const list = useList<PayrollEmployee>('payroll-employees', 'employees:list', { status: 'ACTIVE' })
  const [selected, setSelected] = useState<PayrollEmployee | null>(null)
  const { data, isLoading, error } = list.query
  const sort = { sortBy: list.sortBy, sortDir: list.sortDir, onSort: list.toggleSort }

  return (
    <>
      <PageHeader title="Payroll" subtitle="Annual salary, SSF, TDS and advances for each employee" />
      <Card>
        <div className="flex flex-wrap gap-3 p-3">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder="Name, ID, PAN, SSF, mobile" />
        </div>
        <Table>
          <thead>
            <tr>
              <Th sortKey="employeeCode" {...sort}>ID</Th>
              <Th sortKey="fullName" {...sort}>Name</Th>
              <Th>Department</Th>
              <Th>Designation</Th>
              <Th sortKey="status" {...sort}>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            <StateRow cols={6} loading={isLoading} error={error?.message} empty={!isLoading && !data?.items.length} />
            {data?.items.map((e) => (
              <tr key={e.id} className="hover:bg-muted/50">
                <Td className="font-mono">{e.employeeCode}</Td>
                <Td className="font-medium">{e.fullName}</Td>
                <Td>{e.department?.name ?? '—'}</Td>
                <Td>{e.designation?.title ?? '—'}</Td>
                <Td>
                  <Badge tone={statusTone[e.status]}>{humanize(e.status)}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelected(e)}>
                    <Wallet className="h-4 w-4" /> Salary
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={data?.total ?? 0} onPage={list.setPage} />
      </Card>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent title={selected.fullName} description={`${selected.employeeCode} · Salary and payroll`} className="max-w-5xl">
            <EmployeeSalaryPanel employeeId={selected.id} />
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
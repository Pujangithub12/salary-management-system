import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { PageHeader, StateRow, Table, Td, Th } from '@/components/data-table'

interface CompanyRow {
  id: string
  name: string
  panVatNumber: string | null
  phone: string | null
  email: string | null
  isActive: boolean
  _count: { employees: number }
}

export default function CompaniesPage() {
  const { can } = useAuth()
  const { data, isLoading, error } = useQuery({ queryKey: ['companies'], queryFn: () => api<CompanyRow[]>('companies:list') })

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle="Each employee belongs to one company"
        actions={
          can('company.create') && (
            <Button asChild>
              <Link to="/companies/new">
                <Plus className="h-4 w-4" /> Add company
              </Link>
            </Button>
          )
        }
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>PAN / VAT</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Employees</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            <StateRow cols={7} loading={isLoading} error={error?.message} empty={!isLoading && !data?.length} />
            {data?.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.name}</Td>
                <Td>{c.panVatNumber ?? '—'}</Td>
                <Td>{c.phone ?? '—'}</Td>
                <Td>{c.email ?? '—'}</Td>
                <Td>{c._count.employees}</Td>
                <Td>
                  <Badge tone={c.isActive ? 'green' : 'gray'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td className="text-right">
                  {can('company.update') && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/companies/${c.id}`} aria-label={`Edit ${c.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  )
}

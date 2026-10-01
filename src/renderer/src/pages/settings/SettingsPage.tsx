import { Link } from 'react-router-dom'
import { Briefcase, Building2, Layers, UserCog, Wallet } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/data-table'

const ITEMS = [
  { to: '/company', title: 'Company', text: 'Name, logo, PAN/VAT, bank and fiscal year', icon: Building2, perm: 'company.view' },
  { to: '/departments', title: 'Departments', text: 'Organisation units', icon: Layers, perm: 'department.view' },
  { to: '/designations', title: 'Designations', text: 'Job posts and grades', icon: Briefcase, perm: 'designation.view' },
  { to: '/salary-components', title: 'Salary Components', text: 'Earnings and deductions', icon: Wallet, perm: 'salary.view' },
  { to: '/users', title: 'Users', text: 'Accounts and roles', icon: UserCog, perm: 'users.view' }
]

export default function SettingsPage() {
  const { can } = useAuth()
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ITEMS.filter((i) => can(i.perm)).map((i) => (
          <Link key={i.to} to={i.to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary">
                  <i.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold">{i.title}</div>
                  <div className="text-sm text-muted-foreground">{i.text}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}

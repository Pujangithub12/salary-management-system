import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, CalendarClock, Users, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, Td, Th } from '@/components/data-table'

interface Summary {
  total: number
  active: number
  inactive: number
  departments: { name: string; value: number }[]
  salaryTrend: { month: string; gross: number; net: number }[]
  recentPayroll: {
    id: string
    employee: string
    department: string
    period: string
    amount: number
    status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'LOCKED'
  }[]
  pendingLeave: number | null
  grossSalary: number | null
  netSalary: number | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PIE_COLORS = ['#2b5cd1', '#e5484d', '#17a673', '#f5a524', '#8e4ec6', '#3bb2e0', '#64748b']
const statusTone = { APPROVED: 'green', DRAFT: 'amber', CALCULATED: 'blue', LOCKED: 'red' } as const
const npr = (v: number | null) => (v === null ? '—' : `NPR ${v.toLocaleString('en-US')}`)

function Kpi({ label, value, icon: Icon, tint, note }: { label: string; value: string; icon: typeof Users; tint: string; note?: string }) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="text-base font-medium">{label}</span>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-2 text-3xl font-semibold text-[#14234f]">{value}</div>
        {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
      </CardContent>
    </Card>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">{children}</div>
)

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Summary>('dashboard:summary') })

  if (error) return <p className="text-destructive">{error.message}</p>
  const d = data
  const trend = d?.salaryTrend.length ? d.salaryTrend : MONTHS.map((month) => ({ month, gross: 0, net: 0 }))
  const noTrend = !d?.salaryTrend.length

  return (
    <>
      {/* Full-bleed banner: cancels the page padding from the layout. */}
      <div className="-mx-6 -mt-6 mb-6 bg-primary px-6 py-2 text-base font-medium text-white">KPI Summary Dashboard</div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Employees" value={isLoading ? '…' : String(d?.total ?? 0)} icon={Users} tint="bg-blue-100 text-blue-600" note={d ? `${d.active} active · ${d.inactive} inactive` : undefined} />
        <Kpi label="Monthly Gross Salary" value={npr(d?.grossSalary ?? null)} icon={Wallet} tint="bg-blue-100 text-blue-600" note={d?.grossSalary === null ? 'Available after payroll is calculated' : undefined} />
        <Kpi label="Net Salary Payout" value={npr(d?.netSalary ?? null)} icon={Banknote} tint="bg-blue-100 text-blue-600" note={d?.netSalary === null ? 'Available after payroll is calculated' : undefined} />
        <Kpi label="Pending Leave Requests" value={d?.pendingLeave === null || d?.pendingLeave === undefined ? '—' : String(d.pendingLeave)} icon={CalendarClock} tint="bg-orange-100 text-orange-600" note={d?.pendingLeave === null ? 'Leave module not set up yet' : undefined} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <Card className="shadow-md">
            <CardHeader className="border-0 pb-0">
              <CardTitle className="text-lg">Salary trend</CardTitle>
            </CardHeader>
            <CardContent className="relative h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => v.toLocaleString('en-US')} />
                  <Tooltip formatter={(v) => npr(Number(v))} />
                  <Bar dataKey="gross" name="Gross" fill="#2b5cd1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="net" name="Net" fill="#3bb2e0" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {noTrend && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  No payroll data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="border-0 pb-0">
              <CardTitle className="text-lg">Department distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {d?.departments.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.departments} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={1}>
                      {d.departments.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} employees`, n]} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty>No active employees yet</Empty>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start shadow-md">
          <CardHeader className="border-0">
            <CardTitle className="text-lg">Recent Payroll</CardTitle>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Employee Name</Th>
                <Th>Department</Th>
                <Th>Pay Period</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {d?.recentPayroll.map((p) => (
                <tr key={p.id}>
                  <Td>{p.employee}</Td>
                  <Td>{p.department}</Td>
                  <Td>{p.period}</Td>
                  <Td>{npr(p.amount)}</Td>
                  <Td>
                    <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                  </Td>
                </tr>
              ))}
              {!d?.recentPayroll.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-16 text-center text-muted-foreground">
                    No payroll has been calculated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  )
}

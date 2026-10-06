import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  CalendarCheck,
  ChevronDown,
  Clock,
  FileBarChart,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Scale,
  Settings,
  Users
} from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fileUrl } from '@/components/image-picker'

interface Shell {
  name: string
  logoPath: string | null
  fiscalYear: string | null
}

const SETTINGS_PERMS = ['company.view', 'department.view', 'designation.view', 'salary.view', 'users.view']

// `soon` items belong to modules that are not built yet; they are shown but not clickable.
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users, perms: ['employee.view'] },
  { to: '/payroll', label: 'Payroll', icon: Banknote, perms: ['salary.view'] },
  { label: 'Attendance', icon: Clock, soon: true },
  { label: 'Leave', icon: CalendarCheck, soon: true },
  { label: 'Taxes', icon: Scale, soon: true },
  { label: 'Loans', icon: HandCoins, soon: true },
  { label: 'Reports', icon: FileBarChart, soon: true },
  { to: '/settings', label: 'Settings', icon: Settings, perms: SETTINGS_PERMS }
] as const

const itemClass = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px]'

function Logo({ shell, size }: { shell?: Shell; size: number }) {
  return shell?.logoPath ? (
    <img src={fileUrl(shell.logoPath)} alt="" style={{ width: size, height: size }} className="rounded-lg bg-white object-contain" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-lg bg-white text-lg font-bold text-primary"
      aria-hidden
    >
      {(shell?.name ?? 'C').charAt(0).toUpperCase()}
    </div>
  )
}

export default function AppLayout() {
  const { user, logout, can } = useAuth()
  const [menu, setMenu] = useState(false)
  const { data: shell } = useQuery({ queryKey: ['shell'], queryFn: () => api<Shell>('app:shell') })

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 px-4 py-4 text-white">
          <Logo shell={shell} size={40} />
          <span className="truncate text-lg font-medium">{shell?.name ?? 'Company'}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 pt-2">
          {NAV.map((n) => {
            const Icon = n.icon
            if ('soon' in n) {
              return (
                <div key={n.label} className={cn(itemClass, 'cursor-not-allowed opacity-50')} title="Coming soon">
                  <Icon className="h-5 w-5" />
                  {n.label}
                </div>
              )
            }
            if ('perms' in n && !can(...n.perms)) return null
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) => cn(itemClass, 'hover:bg-white/10', isActive && 'bg-white/15 text-white')}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="p-4">
          <button
            onClick={() => void logout()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/10 py-2.5 text-sm font-medium tracking-wide text-white hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" /> LOGOUT
          </button>
          <div className="mt-4 flex justify-center border-t border-white/10 pt-4">
            <Logo shell={shell} size={36} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[74px] shrink-0 items-center justify-between bg-card px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-[#14234f]">Salary Management System</h1>
            {shell?.fiscalYear && (
              <span className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white">
                Active fiscal year {shell.fiscalYear}
              </span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              onBlur={() => setTimeout(() => setMenu(false), 150)}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted"
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
                {user?.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="text-left leading-tight">
                <span className="block text-base font-medium">{user?.fullName}</span>
                <span className="block text-xs text-muted-foreground">{user?.roleName}</span>
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-lg border bg-card p-1 shadow-lg">
                <button
                  role="menuitem"
                  onClick={() => void logout()}
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
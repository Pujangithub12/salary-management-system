import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import EmployeesPage from '@/pages/employees/EmployeesPage'
import DepartmentsPage from '@/pages/organization/DepartmentsPage'
import DesignationsPage from '@/pages/organization/DesignationsPage'
import SalaryComponentsPage from '@/pages/salary/SalaryComponentsPage'
import CompanyPage from '@/pages/settings/CompanyPage'
import CompaniesPage from '@/pages/settings/CompaniesPage'
import UsersPage from '@/pages/settings/UsersPage'
import SettingsPage from '@/pages/settings/SettingsPage'

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>
  if (!user) return <LoginPage />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="designations" element={<DesignationsPage />} />
        <Route path="salary-components" element={<SalaryComponentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:id" element={<CompanyPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export const PERMISSIONS = {
  'company.view': 'View company settings',
  'company.update': 'Update company settings',
  'department.view': 'View departments',
  'department.create': 'Create departments',
  'department.update': 'Update departments',
  'designation.view': 'View designations',
  'designation.create': 'Create designations',
  'designation.update': 'Update designations',
  'employee.view': 'View employees',
  'employee.create': 'Create employees',
  'employee.update': 'Update employees',
  'employee.delete': 'Deactivate employees',
  'contract.generate': 'Generate employment contracts',
  'salary.view': 'View salary components',
  'salary.create': 'Create salary components',
  'salary.update': 'Update salary components',
  'users.view': 'View users',
  'users.create': 'Create users',
  'users.update': 'Update users',
  'audit.view': 'View audit logs'
} as const

export type PermissionCode = keyof typeof PERMISSIONS
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionCode[]

const views = ALL_PERMISSIONS.filter((p) => p.endsWith('.view') && !p.startsWith('users') && p !== 'audit.view')
const prefixed = (...prefixes: string[]): PermissionCode[] =>
  ALL_PERMISSIONS.filter((p) => prefixes.some((x) => p.startsWith(x + '.')))

export const SYSTEM_ROLES: { name: string; description: string; permissions: PermissionCode[] }[] = [
  { name: 'Super Admin', description: 'Full access', permissions: ALL_PERMISSIONS },
  {
    name: 'Admin',
    description: 'Employees, payroll, reports and settings',
    permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith('users.') || p === 'users.view')
  },
  {
    name: 'HR',
    description: 'Employees, departments and designations',
    permissions: [...prefixed('employee', 'department', 'designation', 'contract'), 'company.view']
  },
  {
    name: 'Accountant',
    description: 'Salary setup and payroll',
    permissions: [...prefixed('salary'), 'employee.view', 'department.view', 'designation.view', 'company.view']
  },
  { name: 'Viewer', description: 'Read-only access', permissions: views }
]

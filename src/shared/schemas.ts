import { z } from 'zod'

// Empty strings from forms become undefined so optional fields stay clean.
const optText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
const reqText = (label: string) => z.string().trim().min(1, `${label} is required`)
const optDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), 'Invalid date')
const optEmail = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\S+@\S+\.\S+$/.test(v), 'Invalid email')

export const EMPLOYEE_TYPES = ['PERMANENT', 'TEMPORARY', 'CONTRACT', 'PART_TIME'] as const
export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED'] as const
export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const
export const COMPONENT_TYPES = ['EARNING', 'DEDUCTION'] as const
export const CALCULATION_METHODS = ['FIXED', 'PERCENTAGE', 'FORMULA'] as const

export const loginSchema = z.object({
  username: reqText('Username'),
  password: z.string().min(1, 'Password is required')
})

export const companySchema = z.object({
  name: reqText('Company name'),
  registrationNumber: optText,
  panVatNumber: optText,
  address: optText,
  phone: optText,
  email: optEmail,
  logoPath: optText,
  bankName: optText,
  bankAccountNumber: optText,
  bankBranch: optText,
  currentFiscalYear: optText,
  isActive: z.boolean().default(true)
})

export const departmentSchema = z.object({
  name: reqText('Name'),
  code: reqText('Code').transform((v) => v.toUpperCase()),
  description: optText,
  isActive: z.boolean().default(true)
})

export const designationSchema = z.object({
  title: reqText('Job title'),
  code: reqText('Code').transform((v) => v.toUpperCase()),
  departmentId: optText,
  grade: optText,
  description: optText,
  isActive: z.boolean().default(true)
})

export const employeeSchema = z.object({
  employeeCode: reqText('Employee ID'),
  fullName: reqText('Full name'),
  panNumber: optText,
  ssfNumber: optText,
  citizenshipNumber: optText,
  gender: z.enum(GENDERS).optional().nullable(),
  dateOfBirth: optDate,
  mobile: optText,
  email: optEmail,
  address: optText,
  emergencyContact: optText,
  photoPath: optText,
  departmentId: optText,
  designationId: optText,
  employeeType: z.enum(EMPLOYEE_TYPES).default('PERMANENT'),
  status: z.enum(EMPLOYEE_STATUSES).default('ACTIVE'),
  dateJoined: z.string().min(1, 'Date joined is required').refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  dateLeft: optDate,
  managerId: optText,
  grade: optText,
  bankName: optText,
  bankAccountNumber: optText,
  bankAccountHolder: optText,
  bankBranch: optText
})

export const salaryComponentSchema = z
  .object({
    name: reqText('Name'),
    code: reqText('Code').transform((v) => v.toUpperCase().replace(/\s+/g, '_')),
    type: z.enum(COMPONENT_TYPES),
    calculationMethod: z.enum(CALCULATION_METHODS).default('FIXED'),
    formula: optText,
    isTaxable: z.boolean().default(true),
    ssfApplicable: z.boolean().default(false),
    employeeContribution: z.boolean().default(false),
    employerContribution: z.boolean().default(false),
    isActive: z.boolean().default(true)
  })
  .refine((v) => v.calculationMethod === 'FIXED' || !!v.formula, {
    path: ['formula'],
    message: 'Formula / percentage is required for this calculation method'
  })

export const userSchema = z.object({
  username: reqText('Username').min(3, 'At least 3 characters'),
  fullName: reqText('Full name'),
  roleId: reqText('Role'),
  password: z.string().min(8, 'At least 8 characters').optional().or(z.literal('')),
  isActive: z.boolean().default(true)
})

export const listQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  status: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  employeeType: z.string().optional(),
  type: z.string().optional()
})

export type LoginInput = z.input<typeof loginSchema>
export type CompanyInput = z.input<typeof companySchema>
export type DepartmentInput = z.input<typeof departmentSchema>
export type DesignationInput = z.input<typeof designationSchema>
export type EmployeeInput = z.input<typeof employeeSchema>
export type SalaryComponentInput = z.input<typeof salaryComponentSchema>
export type UserInput = z.input<typeof userSchema>
export type ListQuery = z.input<typeof listQuerySchema>

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }

export interface SessionUser {
  id: string
  username: string
  fullName: string
  roleName: string
  permissions: string[]
}

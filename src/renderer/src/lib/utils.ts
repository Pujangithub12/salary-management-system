import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

export const formatDate = (v?: string | Date | null): string =>
  v ? new Date(v).toISOString().slice(0, 10) : '—'

export const toDateInput = (v?: string | Date | null): string => (v ? new Date(v).toISOString().slice(0, 10) : '')

export const humanize = (v: string): string =>
  v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ')

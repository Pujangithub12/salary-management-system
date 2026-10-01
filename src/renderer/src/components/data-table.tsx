import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="overflow-x-auto">
    <table className={cn('w-full text-left text-sm', className)} {...p} />
  </div>
)

export const Th = ({
  sortKey,
  sortBy,
  sortDir,
  onSort,
  className,
  children
}: {
  sortKey?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  className?: string
  children?: React.ReactNode
}) => (
  <th
    className={cn('whitespace-nowrap border-b bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}
    aria-sort={sortKey && sortBy === sortKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
  >
    {sortKey && onSort ? (
      <button className="inline-flex items-center gap-1 uppercase cursor-pointer" onClick={() => onSort(sortKey)}>
        {children}
        {sortBy === sortKey && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    ) : (
      children
    )}
  </th>
)

export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('border-b px-3 py-2 align-middle', className)} {...p} />
)

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-64">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input className="pl-8" value={value} placeholder={placeholder ?? 'Search…'} onChange={(e) => onChange(e.target.value)} aria-label="Search" />
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between border-t px-4 py-2 text-sm text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          Page {page} / {pages}
        </span>
        <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  )
}

export function StateRow({ cols, loading, error, empty }: { cols: number; loading?: boolean; error?: string; empty?: boolean }) {
  if (!loading && !error && !empty) return null
  return (
    <tr>
      <td colSpan={cols} className={cn('px-3 py-10 text-center text-muted-foreground', error && 'text-destructive')}>
        {loading ? 'Loading…' : error ? error : 'No records found.'}
      </td>
    </tr>
  )
}

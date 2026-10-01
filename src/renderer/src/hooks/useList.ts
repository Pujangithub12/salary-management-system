import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Paged } from '@shared/schemas'
import { api } from '@/lib/api'
import { useDebounce } from './useDebounce'

/** Server-side paginated, searchable, sortable list backed by an IPC channel. */
export function useList<T>(key: string, channel: string, filters: Record<string, string | undefined> = {}, pageSize = 20) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const debouncedSearch = useDebounce(search)
  const filterKey = JSON.stringify(filters)

  useEffect(() => setPage(1), [debouncedSearch, filterKey])

  const params = { page, pageSize, search: debouncedSearch || undefined, sortBy, sortDir, ...filters }
  const query = useQuery({
    queryKey: [key, params],
    queryFn: () => api<Paged<T>>(channel, params),
    placeholderData: keepPreviousData
  })

  const toggleSort = (k: string) => {
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(k)
      setSortDir('asc')
    }
  }

  return { query, page, setPage, pageSize, search, setSearch, sortBy, sortDir, toggleSort }
}

export interface OrgLookups {
  departments: { id: string; name: string; code: string; isActive: boolean }[]
  designations: { id: string; title: string; code: string; departmentId: string | null; isActive: boolean }[]
}

export function useOrgLookups() {
  return useQuery({ queryKey: ['lookups-org'], queryFn: () => api<OrgLookups>('lookups:organization') })
}

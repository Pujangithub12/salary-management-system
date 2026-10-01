import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDate, humanize } from '@/lib/utils'
import { DialogContent } from '@/components/ui/dialog'
import { fileUrl } from '@/components/image-picker'
import type { Employee } from './types'

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="font-medium">{value || '—'}</dd>
  </div>
)

export default function EmployeeView({ id }: { id: string }) {
  const { data: e, isLoading, error } = useQuery({ queryKey: ['employee', id], queryFn: () => api<Employee>('employees:get', id) })

  return (
    <DialogContent title={e?.fullName ?? 'Employee'} description={e ? `${e.employeeCode} · ${humanize(e.status)}` : undefined} className="max-w-2xl">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {e && (
        <div className="space-y-5">
          {e.photoPath && <img src={fileUrl(e.photoPath)} alt={e.fullName} className="h-24 w-24 rounded-full object-cover" />}
          <dl className="grid grid-cols-3 gap-4">
            <Row label="PAN" value={e.panNumber} />
            <Row label="SSF number" value={e.ssfNumber} />
            <Row label="Citizenship no." value={e.citizenshipNumber} />
            <Row label="Gender" value={e.gender && humanize(e.gender)} />
            <Row label="Date of birth" value={e.dateOfBirth && formatDate(e.dateOfBirth)} />
            <Row label="Mobile" value={e.mobile} />
            <Row label="Email" value={e.email} />
            <Row label="Emergency contact" value={e.emergencyContact} />
            <Row label="Address" value={e.address} />
            <Row label="Department" value={e.department?.name} />
            <Row label="Designation" value={e.designation?.title} />
            <Row label="Grade" value={e.grade} />
            <Row label="Type" value={humanize(e.employeeType)} />
            <Row label="Date joined" value={formatDate(e.dateJoined)} />
            <Row label="Date left" value={e.dateLeft && formatDate(e.dateLeft)} />
            <Row label="Supervisor" value={e.manager && `${e.manager.fullName} (${e.manager.employeeCode})`} />
            <Row label="Bank" value={e.bankName} />
            <Row label="Account number" value={e.bankAccountNumber} />
            <Row label="Account holder" value={e.bankAccountHolder} />
            <Row label="Bank branch" value={e.bankBranch} />
          </dl>
        </div>
      )}
    </DialogContent>
  )
}

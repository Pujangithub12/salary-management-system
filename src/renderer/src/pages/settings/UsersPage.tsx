import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { userSchema, type UserInput } from '@shared/schemas'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/toast'
import { applyServerErrors } from '@/hooks/useFormSubmit'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { CheckField, Field } from '@/components/field'
import { PageHeader, StateRow, Table, Td, Th } from '@/components/data-table'

interface User {
  id: string
  username: string
  fullName: string
  isActive: boolean
  lastLoginAt: string | null
  roleId: string
  role: { id: string; name: string }
}
interface Role {
  id: string
  name: string
  description: string | null
  permissions: unknown[]
}

export default function UsersPage() {
  const { can } = useAuth()
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const { data, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: () => api<User[]>('users:list') })

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Accounts that can sign in to this computer"
        actions={
          can('users.create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Add user
            </Button>
          )
        }
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Username</Th>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Last login</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            <StateRow cols={6} loading={isLoading} error={error?.message} empty={!isLoading && !data?.length} />
            {data?.map((u) => (
              <tr key={u.id}>
                <Td className="font-mono">{u.username}</Td>
                <Td className="font-medium">{u.fullName}</Td>
                <Td>{u.role.name}</Td>
                <Td>{formatDate(u.lastLoginAt)}</Td>
                <Td>
                  <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                </Td>
                <Td className="text-right">
                  {can('users.update') && (
                    <Button variant="ghost" size="icon" aria-label={`Edit ${u.username}`} onClick={() => setEditing(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <UserForm item={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}

function UserForm({ item, onDone }: { item: User | null; onDone: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api<Role[]>('roles:list') })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: item
      ? { username: item.username, fullName: item.fullName, roleId: item.roleId, password: '', isActive: item.isActive }
      : { username: '', fullName: '', roleId: '', password: '', isActive: true }
  })

  const save = useMutation({
    mutationFn: (v: UserInput) => (item ? api('users:update', { id: item.id, data: v }) : api('users:create', v)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User saved')
      onDone()
    }
  })

  const onSubmit = handleSubmit((v) => save.mutateAsync(v).catch((e) => toast.error(applyServerErrors(e, setError))))

  return (
    <DialogContent title={item ? 'Edit user' : 'Add user'}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Username" required error={errors.username?.message}>
            <Input autoComplete="off" {...register('username')} />
          </Field>
          <Field label="Full name" required error={errors.fullName?.message}>
            <Input {...register('fullName')} />
          </Field>
          <Field label="Role" required error={errors.roleId?.message}>
            <Select {...register('roleId')}>
              <option value="">Select role…</option>
              {roles.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={item ? 'New password (leave blank to keep)' : 'Password'} required={!item} error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </Field>
        </div>
        <CheckField label="Active" {...register('isActive')} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

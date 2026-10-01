import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings } from 'lucide-react'
import { loginSchema, type LoginInput } from '@shared/schemas'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/field'

export default function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (v) => {
    setError('')
    try {
      await login(v.username, v.password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  })

  return (
    <div className="flex h-screen items-center justify-center bg-sidebar">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Salary Management System</h1>
          </div>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Username" error={errors.username?.message}>
              <Input autoFocus autoComplete="username" {...register('username')} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <Input type="password" autoComplete="current-password" {...register('password')} />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

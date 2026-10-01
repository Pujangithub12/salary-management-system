import * as React from 'react'
import type { SessionUser } from '@shared/schemas'
import { api, setSessionExpiredHandler } from '@/lib/api'

interface AuthState {
  user: SessionUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  can: (...perms: string[]) => boolean
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    api<SessionUser | null>('auth:me')
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  const value = React.useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (username, password) => setUser(await api<SessionUser>('auth:login', { username, password })),
      logout: async () => {
        await api('auth:logout')
        setUser(null)
      },
      // UI hint only; every handler re-checks permissions in the main process.
      can: (...perms) => !!user && perms.some((p) => user.permissions.includes(p))
    }),
    [user, loading]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

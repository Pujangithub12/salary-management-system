import * as React from 'react'
import { cn } from '@/lib/utils'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

const ToastContext = React.createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const push = React.useCallback((message: string, tone: Toast['tone']) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  const value = React.useMemo(
    () => ({ success: (m: string) => push(m, 'success'), error: (m: string) => push(m, 'error') }),
    [push]
  )
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-md px-4 py-2 text-sm text-white shadow-lg',
              t.tone === 'success' ? 'bg-success' : 'bg-destructive'
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

import type { SessionUser } from '@shared/schemas'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000

let current: SessionUser | null = null
let lastActivity = 0

export const startSession = (user: SessionUser): void => {
  current = user
  lastActivity = Date.now()
}

export const endSession = (): void => {
  current = null
}

/** Returns the signed-in user and refreshes the idle timer; null if signed out or expired. */
export const getSession = (): SessionUser | null => {
  if (!current) return null
  if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
    current = null
    return null
  }
  lastActivity = Date.now()
  return current
}

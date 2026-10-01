import type { ApiResult } from '@shared/schemas'

export class ApiError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message)
  }
}

let onSessionExpired: (() => void) | undefined
export const setSessionExpiredHandler = (fn: () => void): void => {
  onSessionExpired = fn
}

/** Calls a main-process handler; resolves with the data or throws ApiError. */
export async function api<T>(channel: string, payload?: unknown): Promise<T> {
  const res: ApiResult<T> = await window.api.invoke<T>(channel, payload)
  if (res.ok) return res.data
  if (res.error === 'SESSION_EXPIRED') {
    onSessionExpired?.()
    throw new ApiError('Your session has expired. Please sign in again.')
  }
  throw new ApiError(res.error, res.fieldErrors)
}

import type { ApiResult } from '../shared/schemas'

declare global {
  interface Window {
    api: {
      invoke: <T = unknown>(channel: string, payload?: unknown) => Promise<ApiResult<T>>
    }
  }
}

export {}

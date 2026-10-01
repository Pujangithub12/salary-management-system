import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/lib/api'

/** Maps server-side validation errors onto form fields; returns the message to show as a toast otherwise. */
export function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>): string {
  if (e instanceof ApiError) {
    if (e.fieldErrors) {
      for (const [k, msg] of Object.entries(e.fieldErrors)) setError(k as Path<T>, { message: msg })
    }
    return e.message
  }
  return 'Unexpected error occurred'
}

import * as React from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-md border bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-9', className)} {...props} />
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} rows={3} className={cn(base, 'py-2', className)} {...props} />
)
Textarea.displayName = 'Textarea'

/** Native select styled like the other inputs: reliable keyboard handling and zero extra dependencies. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(base, 'h-9', className)} {...props} />
)
Select.displayName = 'Select'

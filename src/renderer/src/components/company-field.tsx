import { useEffect } from 'react'
import type { FieldValues, Path, PathValue, UseFormGetValues, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { useOrgLookups } from '@/hooks/useList'
import { Select } from '@/components/ui/input'
import { Field } from '@/components/field'

/** Filter dropdown for list pages ("All companies" + each company). */
export function CompanySelect({ value, onChange, all }: { value: string; onChange: (v: string) => void; all?: boolean }) {
  const { data } = useOrgLookups()
  return (
    <Select className="w-52" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Company filter">
      {all && <option value="">All companies</option>}
      {data?.companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  )
}

/**
 * Company picker for create/edit forms. A record keeps the company it was created under,
 * so the field is locked when editing. With one company it is pre-selected.
 */
export function CompanyField<T extends FieldValues>({
  register,
  setValue,
  getValues,
  locked,
  error,
  onChange
}: {
  register: UseFormRegister<T>
  setValue: UseFormSetValue<T>
  getValues: UseFormGetValues<T>
  locked: boolean
  error?: string
  onChange?: () => void
}) {
  const { data } = useOrgLookups()
  const companies = data?.companies.filter((c) => c.isActive || locked) ?? []
  const name = 'companyId' as Path<T>

  useEffect(() => {
    if (!locked && companies.length === 1 && !getValues(name)) setValue(name, companies[0].id as PathValue<T, Path<T>>)
  }, [locked, companies, getValues, setValue, name])

  return (
    <Field label="Company" required error={error}>
      <Select
        // Not `disabled`: react-hook-form drops disabled fields from the submitted values.
        className={locked ? 'pointer-events-none opacity-60' : undefined}
        tabIndex={locked ? -1 : undefined}
        aria-readonly={locked}
        {...register(name, { onChange })}
      >
        <option value="">Select company…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </Field>
  )
}

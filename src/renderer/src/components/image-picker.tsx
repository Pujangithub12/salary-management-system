import { ImagePlus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

export const fileUrl = (name?: string | null): string | undefined => (name ? `appfile://${name}` : undefined)

export function ImagePicker({
  label,
  value,
  onChange,
  round
}: {
  label: string
  value?: string | null
  onChange: (name: string | null) => void
  round?: boolean
}) {
  const pick = async () => {
    const name = await api<string | null>('files:pickImage')
    if (name) onChange(name)
  }
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-20 w-20 items-center justify-center overflow-hidden border bg-muted ${round ? 'rounded-full' : 'rounded-md'}`}
      >
        {value ? (
          <img src={fileUrl(value)} alt={label} className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" size="sm" onClick={() => void pick()}>
          Choose {label.toLowerCase()}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="h-3 w-3" /> Remove
          </Button>
        )}
      </div>
    </div>
  )
}

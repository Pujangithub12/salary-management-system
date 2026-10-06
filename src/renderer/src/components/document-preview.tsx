import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** On-screen preview of a generated document with "Back to edit" and "Download PDF" actions. */
export function DocumentPreview({
  html,
  onBack,
  onDownload,
  downloading
}: {
  html: string
  onBack: () => void
  onDownload: () => void
  downloading: boolean
}) {
  return (
    <div className="space-y-3">
      {/* sandbox="" blocks scripts and navigation: the HTML is display-only. */}
      <iframe title="Document preview" srcDoc={html} sandbox="" className="h-[68vh] w-full rounded-md border bg-muted" />
      <p className="text-xs text-muted-foreground">Page breaks and the page-number footer are added in the downloaded PDF.</p>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to edit
        </Button>
        <Button onClick={onDownload} disabled={downloading}>
          <Download className="h-4 w-4" /> {downloading ? 'Saving…' : 'Download PDF'}
        </Button>
      </div>
    </div>
  )
}

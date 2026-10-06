import { escapeHtml as e } from './format'

// Building blocks shared by the employment agreement and the separation agreement.

export interface CompanyHeader {
  name: string
  address: string | null
  phone: string | null
  email: string | null
  logoDataUri: string | null
}

export interface Item {
  label: string
  /** Trusted HTML: every dynamic value is escaped with `e()` or wrapped by `b()` before it gets here. */
  text: string
  /** Optional HTML shown right below the item (used for tables). */
  after?: string
}

export interface Section {
  title: string
  items: Item[]
}

export const b = (s: string): string => `<strong>${e(s)}</strong>`

export const sectionHtml = (s: Section, n: number): string => `
  <section>
    <h2>${n}. ${e(s.title.toUpperCase())}</h2>
    ${s.items.map((it, i) => `<p><strong>${n}.${i + 1} ${e(it.label)}:</strong> ${it.text}</p>${it.after ?? ''}`).join('')}
  </section>`

/** Three-column table; cells are plain text and get escaped here. */
export const tableHtml = (headers: [string, string, string], rows: [string, string, string][]): string => `<table>
    <thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([a, c, d]) => `<tr><td><strong>${e(a)}</strong></td><td>${e(c)}</td><td>${e(d)}</td></tr>`).join('')}</tbody>
  </table>`

export function letterheadHtml(c: CompanyHeader): string {
  // Address, contact number and email share one line, separated by a middle dot.
  const contactLine = [c.address && e(c.address), c.phone && `Contact: ${e(c.phone)}`, c.email && e(c.email)]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ')
  return `<div class="letterhead">
    ${c.logoDataUri ? `<img class="logo" src="${c.logoDataUri}" alt="" />` : ''}
    <div class="company">
      <div class="name">${e(c.name)}</div>
      ${contactLine ? `<div>${contactLine}</div>` : ''}
    </div>
  </div>`
}

export const signaturesHtml = (signer: { name: string; title: string }, employeeName: string): string => `
  <div class="sign">
    <div>
      <div class="who">For the Employer:</div>
      <div class="line"></div>
      <div class="cap">Authorized Signature</div>
      <div class="meta">Name: ${e(signer.name)}<br />Title: ${e(signer.title)}<br />Date: ________________________</div>
    </div>
    <div>
      <div class="who">Employee:</div>
      <div class="line"></div>
      <div class="cap">Employee Signature</div>
      <div class="meta">Name: ${e(employeeName)}<br />Date: ________________________</div>
    </div>
  </div>`

const STYLES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, 'Liberation Serif', serif;
    font-size: 10.5pt; line-height: 1.5; color: #1f2937;
    text-align: justify; text-justify: inter-word;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .letterhead { display: flex; align-items: center; gap: 14pt; margin: 0 0 4pt; text-align: left; }
  .logo { display: block; max-height: 54pt; max-width: 160pt; object-fit: contain; flex: none; }
  .company .name { font-size: 16pt; font-weight: bold; color: #111c33; }
  .company div { font-size: 9pt; color: #3b4660; line-height: 1.45; }
  h1 { margin: 0 0 3pt; text-align: center; font-size: 18pt; letter-spacing: 0.5pt; color: #111c33; }
  .rule { border: 0; border-top: 2.5pt solid #111c33; margin: 0 0 16pt; }
  p { margin: 0 0 7pt; }
  .parties {
    display: grid; grid-template-columns: 62pt 1fr 62pt 1fr; gap: 7pt 6pt; align-items: start;
    margin: 6pt 0 14pt; padding: 12pt 14pt; background: #f6f8fb; border: 0.75pt solid #c8d2e0; border-left: 4pt solid #111c33;
    text-align: left;
  }
  .parties.wide { grid-template-columns: 62pt 1fr 100pt 1fr; }
  .parties .k { font-weight: bold; color: #2f4066; }
  section { margin-bottom: 11pt; }
  h2 {
    margin: 0 0 7pt; padding-bottom: 3pt; border-bottom: 0.75pt solid #c8d2e0;
    font-size: 11pt; letter-spacing: 1pt; color: #111c33; text-align: left; break-after: avoid;
  }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 8pt 0 10pt; font-size: 10pt; text-align: left; break-inside: avoid; }
  th, td { border: 0.75pt solid #c8d2e0; padding: 6pt 9pt; }
  th { background: #eef2f8; text-align: left; }
  th:nth-child(1), td:nth-child(1) { width: 30%; }
  th:nth-child(3), td:nth-child(3) { width: 26%; }
  .sign { display: flex; gap: 28pt; margin-top: 22pt; break-inside: avoid; text-align: left; }
  .sign > div { flex: 1; }
  .sign .who { color: #55627f; }
  .sign .line { border-bottom: 1.25pt solid #111c33; height: 30pt; }
  .sign .cap { margin-top: 4pt; font-weight: bold; color: #111c33; }
  .sign .meta { color: #55627f; font-size: 9.5pt; line-height: 1.6; }
`

// On-screen only: shows the content on an A4 sheet using the same margins as the PDF.
const PREVIEW_CSS = `
  html { background: #6b7280; }
  body { max-width: 210mm; min-height: 297mm; margin: 14px auto; padding: 10mm 21.6mm 16mm; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.35); }
`

export const wrapDocument = (body: string, preview: boolean | undefined): string => `<!doctype html>
<html><head><meta charset="utf-8" />
<style>${STYLES}${preview ? PREVIEW_CSS : ''}</style></head>
<body>
${body}
</body></html>`

/** Footer drawn by Chromium on every page: "<label> — Name" and "Page X of Y". */
export function buildFooterHtml(label: string, employeeName: string): string {
  return `<div style="width:100%;margin:0 60px;padding-top:6px;border-top:1px solid #c8d2e0;font-family:'Times New Roman',serif;font-size:9px;color:#6b7a99;display:flex;justify-content:space-between;">
    <span>${e(label)} — ${e(employeeName)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`
}

import type { z } from 'zod'
import type { contractSchema } from '@shared/schemas'
import { amountInWords, escapeHtml as e, money, ordinal, usDate } from './format'

export type ContractTerms = z.output<typeof contractSchema>

export interface ContractParties {
  company: { name: string; address: string | null; phone: string | null; email: string | null; logoDataUri: string | null }
  employee: {
    fullName: string
    address: string | null
    designation: string
    manager: { fullName: string; designation: string | null } | null
  }
}

interface Item {
  label: string
  /** Trusted HTML: every dynamic value is escaped with `e()` or wrapped by `b()` before it gets here. */
  text: string
  /** Optional HTML shown right below the item (used for the compensation table). */
  after?: string
}

interface Section {
  title: string
  items: Item[]
}

const b = (s: string) => `<strong>${e(s)}</strong>`

function compensationTable(t: ContractTerms): string {
  const rows: [string, string, string][] = [
    ['Base Remuneration', `NPR ${money(t.monthlySalary)} per month (NPR ${money(t.monthlySalary * 12)} per annum)`, 'Monthly']
  ]
  if (t.bonusPercent > 0) {
    rows.push(['Performance Incentive', `Discretionary annual bonus up to ${t.bonusPercent}% of base salary`, 'Annual Review'])
  }
  if (t.benefits) rows.push(['Benefits Package', t.benefits, 'Standard Schedule'])
  return `<table>
    <thead><tr><th>Compensation Component</th><th>Details &amp; Frequency</th><th>Schedule</th></tr></thead>
    <tbody>${rows.map(([a, c, d]) => `<tr><td><strong>${e(a)}</strong></td><td>${e(c)}</td><td>${e(d)}</td></tr>`).join('')}</tbody>
  </table>`
}

function buildSections(p: ContractParties, t: ContractTerms): Section[] {
  const mgr = p.employee.manager
  const reportsTo = mgr ? b(mgr.designation ? `${mgr.fullName}, ${mgr.designation}` : mgr.fullName) : 'the Employer’s management'

  const term: Item[] = [
    {
      label: 'Employment Term',
      text: `Employment shall commence on ${b(usDate(t.startDate))} and shall continue on an "at-will" basis, meaning either party may terminate the employment relationship at any time, with or without cause or advance notice, subject to statutory obligations.`
    }
  ]
  if (t.probationMonths > 0) {
    term.push({
      label: 'Probationary Period',
      text: `The first ${b(`${t.probationMonths} month${t.probationMonths > 1 ? 's' : ''}`)} of employment shall constitute a probationary period, during which the Employer will assess the Employee's suitability for continued employment.`
    })
  }

  const covenants: Item[] = []
  if (t.nonSolicitMonths > 0) {
    covenants.push({
      label: 'Non-Solicitation',
      text: `During employment and for a period of ${b(`${t.nonSolicitMonths} months`)} following termination for any reason, the Employee agrees not to solicit, recruit, or hire any current employees, contractors, or clients of the Employer.`
    })
  }
  covenants.push({
    label: 'Conflict of Interest',
    text: 'The Employee shall not engage in any outside business activity or employment that directly competes with the Employer or creates a conflict of interest during the period of employment.'
  })

  return [
    {
      title: 'Position and Duties',
      items: [
        {
          label: 'Title',
          text: `The Employer agrees to employ the Employee in the position of ${b(p.employee.designation)}. The Employee accepts such employment upon the terms and conditions set forth herein.`
        },
        {
          label: 'Duties',
          text: 'The Employee shall perform all duties customary to the position, as well as those assigned by management from time to time. The Employee agrees to devote their full working time, attention, and effort to the performance of these duties.'
        },
        { label: 'Reporting', text: `The Employee will report directly to ${reportsTo} or as otherwise directed by the Employer.` }
      ]
    },
    { title: 'Term and Probationary Period', items: term },
    {
      title: 'Compensation and Benefits',
      items: [
        {
          label: 'Base Salary',
          text: `The Employer shall pay the Employee a base monthly salary of ${b(`NPR ${money(t.monthlySalary)} (${amountInWords(t.monthlySalary)} Nepalese Rupees)`)}, payable on the ${e(ordinal(t.payDay))} day of each month through bank transfer, in accordance with the Employer's regular payroll practice.`,
          after: compensationTable(t)
        },
        {
          label: 'Leave Entitlements',
          text: `The Employee shall be entitled to ${b(String(t.annualLeaveDays))} days of paid annual leave, ${b(String(t.sickLeaveDays))} days of paid sick leave and ${b(String(t.urgentLeaveDays))} days of paid urgent leave per year, accrued pro-rata, in addition to standard public holidays observed by the company.`
        }
      ]
    },
    {
      title: 'Confidentiality & Intellectual Property',
      items: [
        {
          label: 'Confidential Information',
          text: 'The Employee acknowledges that during employment, they will have access to proprietary information, trade secrets, customer lists, and business strategies. The Employee agrees not to disclose or use any Confidential Information outside the scope of their employment duties, during or after employment, without prior written consent.'
        },
        {
          label: 'Invention Assignment',
          text: 'All intellectual property, designs, developments, algorithms, and works of authorship created or developed by the Employee in connection with their employment duties shall remain the sole and exclusive property of the Employer.'
        }
      ]
    },
    { title: 'Restrictive Covenants', items: covenants },
    {
      title: 'Termination of Employment',
      items: [
        { label: 'Resignation', text: `The Employee agrees to provide at least ${b(`${t.noticeDays} days`)} written notice prior to resignation.` },
        {
          label: 'Termination for Cause',
          text: 'The Employer may terminate employment immediately without notice or severance pay for cause, including but not limited to gross misconduct, breach of contract, or illegal actions.'
        },
        {
          label: 'Severance',
          text: 'Severance benefits, if applicable upon termination without cause, shall comply with relevant employment legislation and company policy.'
        }
      ]
    },
    {
      title: 'General Provisions',
      items: [
        { label: 'Governing Law', text: `This Agreement shall be governed by and construed in accordance with the laws of ${b('Nepal')}.` },
        {
          label: 'Entire Agreement',
          text: 'This Agreement constitutes the entire understanding between the parties regarding employment and supersedes all prior agreements, oral or written.'
        },
        {
          label: 'Severability',
          text: 'If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.'
        }
      ]
    }
  ]
}

const sectionHtml = (s: Section, n: number) => `
  <section>
    <h2>${n}. ${e(s.title.toUpperCase())}</h2>
    ${s.items.map((it, i) => `<p><strong>${n}.${i + 1} ${e(it.label)}:</strong> ${it.text}</p>${it.after ?? ''}`).join('')}
  </section>`

export function buildContractHtml(p: ContractParties, t: ContractTerms, options: { preview?: boolean } = {}): string {
  const sections = buildSections(p, t)
  const { company: c, employee: emp } = p
  // Address, contact number and email share one line, separated by a middle dot.
  const contactLine = [c.address && e(c.address), c.phone && `Contact: ${e(c.phone)}`, c.email && e(c.email)]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ')

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
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
  .parties .k { font-weight: bold; color: #2f4066; }
  section { margin-bottom: 11pt; }
  h2 {
    margin: 0 0 7pt; padding-bottom: 3pt; border-bottom: 0.75pt solid #c8d2e0;
    font-size: 11pt; letter-spacing: 1pt; color: #111c33; text-align: left; break-after: avoid;
  }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 10pt; font-size: 10pt; text-align: left; break-inside: avoid; }
  th, td { border: 0.75pt solid #c8d2e0; padding: 6pt 9pt; }
  th { background: #eef2f8; text-align: left; }
  th:nth-child(1), td:nth-child(1) { width: 28%; white-space: nowrap; }
  th:nth-child(3), td:nth-child(3) { width: 21%; }
  .sign { display: flex; gap: 28pt; margin-top: 22pt; break-inside: avoid; text-align: left; }
  .sign > div { flex: 1; }
  .sign .who { color: #55627f; }
  .sign .line { border-bottom: 1.25pt solid #111c33; height: 30pt; }
  .sign .cap { margin-top: 4pt; font-weight: bold; color: #111c33; }
  .sign .meta { color: #55627f; font-size: 9.5pt; line-height: 1.6; }
${options.preview ? PREVIEW_CSS : ''}
</style></head>
<body>
  <div class="letterhead">
    ${c.logoDataUri ? `<img class="logo" src="${c.logoDataUri}" alt="" />` : ''}
    <div class="company">
      <div class="name">${e(c.name)}</div>
      ${contactLine ? `<div>${contactLine}</div>` : ''}
    </div>
  </div>
  <h1>EMPLOYMENT AGREEMENT</h1>
  <hr class="rule" />

  <p>This Employment Agreement (the "Agreement") is entered into and made effective as of ${b(usDate(t.contractDate))} (the "Effective Date"), by and between:</p>

  <div class="parties">
    <span class="k">Employer:</span><span>${e(c.name)}</span>
    <span class="k">Employee:</span><span>${e(emp.fullName)}</span>
    <span class="k">Address:</span><span>${e(c.address ?? '—')}</span>
    <span class="k">Address:</span><span>${e(emp.address ?? '—')}</span>
  </div>

  ${sections.map((s, i) => sectionHtml(s, i + 1)).join('')}

  <div class="sign">
    <div>
      <div class="who">For the Employer:</div>
      <div class="line"></div>
      <div class="cap">Authorized Signature</div>
      <div class="meta">Name: ${e(t.signatoryName)}<br />Title: ${e(t.signatoryTitle)}<br />Date: ________________________</div>
    </div>
    <div>
      <div class="who">Employee:</div>
      <div class="line"></div>
      <div class="cap">Employee Signature</div>
      <div class="meta">Name: ${e(emp.fullName)}<br />Date: ________________________</div>
    </div>
  </div>
</body></html>`
}

// On-screen only: shows the content on an A4 sheet using the same margins as the PDF.
const PREVIEW_CSS = `
  html { background: #6b7280; }
  body { max-width: 210mm; min-height: 297mm; margin: 14px auto; padding: 10mm 21.6mm 16mm; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.35); }
`

/** Footer drawn by Chromium on every page: "Employment Agreement — Name" and "Page X of Y". */
export function buildFooterHtml(employeeName: string): string {
  return `<div style="width:100%;margin:0 60px;padding-top:6px;border-top:1px solid #c8d2e0;font-family:'Times New Roman',serif;font-size:9px;color:#6b7a99;display:flex;justify-content:space-between;">
    <span>Employment Agreement — ${e(employeeName)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`
}

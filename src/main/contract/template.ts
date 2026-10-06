import type { z } from 'zod'
import type { contractSchema } from '@shared/schemas'
import { amountInWords, escapeHtml as e, money, ordinal, usDate } from './format'
import {
  b,
  letterheadHtml,
  sectionHtml,
  signaturesHtml,
  tableHtml,
  wrapDocument,
  type CompanyHeader,
  type Item,
  type Section
} from './common'

export type ContractTerms = z.output<typeof contractSchema>

export interface ContractParties {
  company: CompanyHeader
  employee: {
    fullName: string
    address: string | null
    designation: string
    manager: { fullName: string; designation: string | null } | null
  }
}

function compensationTable(t: ContractTerms): string {
  const rows: [string, string, string][] = [
    ['Base Remuneration', `NPR ${money(t.monthlySalary)} per month (NPR ${money(t.monthlySalary * 12)} per annum)`, 'Monthly']
  ]
  if (t.bonusPercent > 0) {
    rows.push(['Performance Incentive', `Discretionary annual bonus up to ${t.bonusPercent}% of base salary`, 'Annual Review'])
  }
  if (t.benefits) rows.push(['Benefits Package', t.benefits, 'Standard Schedule'])
  return tableHtml(['Compensation Component', 'Details & Frequency', 'Schedule'], rows)
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

export function buildContractHtml(p: ContractParties, t: ContractTerms, options: { preview?: boolean } = {}): string {
  const sections = buildSections(p, t)
  const { company: c, employee: emp } = p

  return wrapDocument(
    `${letterheadHtml(c)}
  <h1>EMPLOYMENT AGREEMENT</h1>
  <hr class="rule" />

  <p>This Employment Agreement (the "Agreement") is entered into and made effective as of ${b(usDate(t.contractDate))} (the "Effective Date"), by and between:</p>

  <div class="parties">
    <span class="k">Employer:</span><span>${e(c.name)}</span>
    <span class="k">Employee:</span><span>${e(emp.fullName)}</span>
    <span class="k">Address:</span><span>${e(c.address ?? '—')}</span>
    <span class="k">Address:</span><span>${e(emp.address ?? '—')}</span>
  </div>

  ${sections.map((sec, i) => sectionHtml(sec, i + 1)).join('')}
  ${signaturesHtml({ name: t.signatoryName, title: t.signatoryTitle }, emp.fullName)}`,
    options.preview
  )
}

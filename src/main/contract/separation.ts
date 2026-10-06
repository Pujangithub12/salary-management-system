import type { z } from 'zod'
import type { separationSchema } from '@shared/schemas'
import { amountInWords, escapeHtml as e, money, usDate } from './format'
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

export type SeparationTerms = z.output<typeof separationSchema>

export interface SeparationParties {
  company: CompanyHeader
  employee: { fullName: string; designation: string }
}

function benefitsTable(t: SeparationTerms): string {
  const rows: [string, string, string][] = []
  if (t.severanceAmount > 0) {
    rows.push([
      'Severance Payment',
      `NPR ${money(t.severanceAmount)} (${amountInWords(t.severanceAmount)} Nepalese Rupees)`,
      `Lump sum within ${t.severanceDays} days after the date of this Agreement`
    ])
  }
  if (t.healthCoverMonths > 0) {
    rows.push([
      'Health / Insurance Coverage',
      `Employer contribution toward ${t.healthCoverMonths} month${t.healthCoverMonths > 1 ? 's' : ''} premium`,
      'Paid directly to the insurer / benefit administrator'
    ])
  }
  if (t.accruedLeaveDays > 0) {
    rows.push(['Accrued Leave Cash-out', `${t.accruedLeaveDays} days accrued paid leave`, 'Included in final paycheck'])
  }
  return tableHtml(['Benefit Description', 'Amount / Details', 'Payment Terms'], rows)
}

function buildSections(t: SeparationTerms): Section[] {
  const ongoing: Item[] = [
    {
      label: 'Confidentiality',
      text: 'The Employee agrees that all terms of this Agreement and all confidential business information acquired during employment shall remain strictly confidential, except as required by law.'
    },
    {
      label: 'Non-Disparagement',
      text: 'The Employee agrees not to make any false, negative, or disparaging statements regarding the Employer, its management, or its business operations publicly or privately.'
    }
  ]
  if (t.nonSolicitMonths > 0) {
    ongoing.push({
      label: 'Non-Solicitation',
      text: `For a period of ${b(`${t.nonSolicitMonths} months`)} following the Separation Date, the Employee shall not solicit or encourage any current employee or client to sever their relationship with the Employer.`
    })
  }

  const acknowledgments: Item[] = []
  if (t.reviewDays > 0) {
    acknowledgments.push({
      label: 'Consideration Period',
      text: `The Employee acknowledges that they have been given at least ${b(`${t.reviewDays} days`)} to review and consider this Agreement and have been advised to consult with an independent legal adviser prior to signing.`
    })
  }
  if (t.revocationDays > 0) {
    acknowledgments.push({
      label: 'Revocation Period',
      text: `The Employee understands they may revoke this Agreement within ${b(`${t.revocationDays} days`)} after signing by delivering written notice to the Employer.`
    })
  }
  acknowledgments.push({
    label: 'Governing Law',
    text: `This Agreement shall be governed by and interpreted in accordance with the laws of ${b('Nepal')}.`
  })

  return [
    {
      title: 'Separation of Employment',
      items: [
        {
          label: 'Termination Date',
          text: `The Employee’s employment with the Employer will officially terminate effective ${b(usDate(t.terminationDate))} (the "Separation Date"). As of the Separation Date, the Employee shall cease performing any work or representing the Employer in any official capacity.`
        },
        {
          label: 'Final Paycheck',
          text: 'Regardless of whether the Employee executes this Agreement, the Employee will receive all earned, unpaid base salary and accrued, unused leave through the Separation Date, subject to standard deductions and withholdings, on the next scheduled payroll date.'
        }
      ]
    },
    {
      title: 'Severance Benefits & Terms',
      items: [
        {
          label: 'Consideration',
          text: 'In exchange for the Employee’s execution of this Agreement and compliance with all terms herein, the Employer agrees to provide the following severance package:',
          after: benefitsTable(t)
        },
        {
          label: 'Tax Withholding',
          text: 'All payments described in this Agreement shall be subject to standard applicable tax withholdings under the laws of Nepal.'
        }
      ]
    },
    {
      title: 'Return of Company Property',
      items: [
        {
          label: 'Equipment & Documents',
          text: 'On or before the Separation Date, the Employee agrees to return to the Employer all company-owned property, including but not limited to laptops, mobile devices, security badges, access keys, financial records, customer lists, and proprietary documents.'
        },
        {
          label: 'Digital Assets',
          text: 'The Employee confirms that they have deleted or returned all confidential digital files and credentials belonging to the Employer and have not retained duplicate copies.'
        }
      ]
    },
    {
      title: 'General Release of Claims',
      items: [
        {
          label: 'Release by Employee',
          text: 'In consideration for the severance benefits provided under Section 2, the Employee voluntarily releases and forever discharges the Employer, its officers, directors, employees, agents, and affiliates from any and all claims, demands, liabilities, or causes of action arising out of or related to their employment or the termination thereof.'
        },
        {
          label: 'Scope of Release',
          text: 'This release includes, but is not limited to, claims under applicable employment laws, breach of contract, or wrongful termination, to the extent permitted by law.'
        }
      ]
    },
    { title: 'Ongoing Obligations', items: ongoing },
    { title: 'Acknowledgments & Governing Law', items: acknowledgments }
  ]
}

export function buildSeparationHtml(p: SeparationParties, t: SeparationTerms, options: { preview?: boolean } = {}): string {
  const { company: c, employee: emp } = p

  return wrapDocument(
    `${letterheadHtml(c)}
  <h1>SEPARATION AGREEMENT</h1>
  <hr class="rule" />

  <p>This Separation Agreement and General Release (the "Agreement") is entered into between ${b(c.name)} (the "Employer") and ${b(emp.fullName)} (the "Employee") as of ${b(usDate(t.agreementDate))}.</p>

  <div class="parties wide">
    <span class="k">Employer:</span><span>${e(c.name)}</span>
    <span class="k">Employee:</span><span>${e(emp.fullName)}</span>
    <span class="k">Position:</span><span>${e(emp.designation)}</span>
    <span class="k">Termination Date:</span><span>${e(usDate(t.terminationDate))}</span>
  </div>

  ${buildSections(t).map((sec, i) => sectionHtml(sec, i + 1)).join('')}
  ${signaturesHtml({ name: t.signatoryName, title: t.signatoryTitle }, emp.fullName)}`,
    options.preview
  )
}

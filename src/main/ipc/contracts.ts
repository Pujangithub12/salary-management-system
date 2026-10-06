import { app, BrowserWindow, dialog, shell } from 'electron'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { filesDir, prisma } from '../db'
import { contractSchema, separationSchema } from '@shared/schemas'
import { buildContractHtml } from '../contract/template'
import { buildSeparationHtml } from '../contract/separation'
import { buildFooterHtml } from '../contract/common'
import { AppError, audit, handle } from './handler'

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

function logoDataUri(name: string | null): string | null {
  if (!name) return null
  try {
    const data = readFileSync(join(filesDir(), name)).toString('base64')
    return `data:${MIME[extname(name).toLowerCase()] ?? 'image/png'};base64,${data}`
  } catch {
    return null // a missing logo file should not block the contract
  }
}

/** Renders HTML to an A4 PDF (with a page-numbered footer) in an invisible window. */
async function htmlToPdf(html: string, footer: string): Promise<Buffer> {
  const tmp = join(app.getPath('temp'), `contract-${randomUUID()}.html`)
  writeFileSync(tmp, html, 'utf8')
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } })
  try {
    await win.loadFile(tmp)
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: footer,
      // Inches: 0.25in top, 0.85in sides, 0.9in bottom leaves room for the footer.
      margins: { top: 0.25, bottom: 0.9, left: 0.85, right: 0.85 }
    })
  } finally {
    win.destroy()
    try {
      unlinkSync(tmp)
    } catch {
      /* temp file cleanup is best effort */
    }
  }
}

const slug = (v: string) => v.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export function registerContracts(): void {
  // Pre-fills the "Generate contract" form from the company and employee records.
  handle<string, unknown>('contracts:defaults', { perm: 'contract.generate' }, async (employeeId) => {
    const emp = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: { designation: true, company: true }
    })
    return {
      contractDate: isoDate(new Date()),
      startDate: isoDate(emp.dateJoined),
      signatoryName: emp.company.signatoryName ?? '',
      signatoryTitle: emp.company.signatoryTitle ?? '',
      designation: emp.designation?.title ?? null
    }
  })

  // Loads the records and builds the contract HTML; shared by preview and download so they never differ.
  async function build(input: { employeeId: string; data: unknown }, preview: boolean) {
    const terms = contractSchema.parse(input.data)
    const emp = await prisma.employee.findUniqueOrThrow({
      where: { id: z.string().parse(input.employeeId) },
      include: { company: true, designation: true, manager: { include: { designation: true } } }
    })
    const company = emp.company
    if (!emp.designation) throw new AppError('Assign a designation to this employee before generating a contract')

    const html = buildContractHtml(
      {
        company: { name: company.name, address: company.address, phone: company.phone, email: company.email, logoDataUri: logoDataUri(company.logoPath) },
        employee: {
          fullName: emp.fullName,
          address: emp.address,
          designation: emp.designation.title,
          manager: emp.manager ? { fullName: emp.manager.fullName, designation: emp.manager.designation?.title ?? null } : null
        }
      },
      terms,
      { preview }
    )
    return { terms, emp, html }
  }

  // HTML shown on screen before the user downloads; nothing is written to disk.
  handle<{ employeeId: string; data: unknown }, string>('contracts:preview', { perm: 'contract.generate' }, async (input) => {
    return (await build(input, true)).html
  })

  handle<{ employeeId: string; data: unknown }, { path: string } | null>(
    'contracts:generate',
    { perm: 'contract.generate' },
    async (input, user) => {
      const { terms, emp, html } = await build(input, false)
      const pdf = await htmlToPdf(html, buildFooterHtml('Employment Agreement', emp.fullName))

      const parent = BrowserWindow.getFocusedWindow() ?? undefined
      const options = {
        title: 'Save employment agreement',
        defaultPath: join(app.getPath('documents'), `Employment-Agreement-${slug(emp.employeeCode)}-${slug(emp.fullName)}.pdf`),
        filters: [{ name: 'PDF document', extensions: ['pdf'] }]
      }
      const res = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
      if (res.canceled || !res.filePath) return null

      writeFileSync(res.filePath, pdf)
      await audit(user, 'GENERATE_CONTRACT', 'employee', emp.id, undefined, { monthlySalary: terms.monthlySalary, file: res.filePath })
      shell.showItemInFolder(res.filePath)
      return { path: res.filePath }
    }
  )

  // ---------------------------------------------------------------- Separation agreement
  const header = (company: { name: string; address: string | null; phone: string | null; email: string | null; logoPath: string | null }) => ({
    name: company.name,
    address: company.address,
    phone: company.phone,
    email: company.email,
    logoDataUri: logoDataUri(company.logoPath)
  })

  handle<string, unknown>('separation:defaults', { perm: 'contract.generate' }, async (employeeId) => {
    const emp = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId }, include: { designation: true, company: true } })
    return {
      agreementDate: isoDate(new Date()),
      terminationDate: emp.dateLeft ? isoDate(emp.dateLeft) : null,
      signatoryName: emp.company.signatoryName ?? '',
      signatoryTitle: emp.company.signatoryTitle ?? '',
      designation: emp.designation?.title ?? null,
      status: emp.status
    }
  })

  async function buildSeparation(input: { employeeId: string; data: unknown }, preview: boolean) {
    const terms = separationSchema.parse(input.data)
    const emp = await prisma.employee.findUniqueOrThrow({
      where: { id: z.string().parse(input.employeeId) },
      include: { company: true, designation: true }
    })
    if (emp.status !== 'TERMINATED' && emp.status !== 'RESIGNED') throw new AppError('Terminate the employee before creating a separation agreement')
    if (!emp.designation) throw new AppError('Assign a designation to this employee before generating the agreement')
    const html = buildSeparationHtml(
      { company: header(emp.company), employee: { fullName: emp.fullName, designation: emp.designation.title } },
      terms,
      { preview }
    )
    return { terms, emp, html }
  }

  handle<{ employeeId: string; data: unknown }, string>('separation:preview', { perm: 'contract.generate' }, async (input) => {
    return (await buildSeparation(input, true)).html
  })

  handle<{ employeeId: string; data: unknown }, { path: string } | null>(
    'separation:generate',
    { perm: 'contract.generate' },
    async (input, user) => {
      const { terms, emp, html } = await buildSeparation(input, false)
      const pdf = await htmlToPdf(html, buildFooterHtml('Separation Agreement', emp.fullName))

      const parent = BrowserWindow.getFocusedWindow() ?? undefined
      const options = {
        title: 'Save separation agreement',
        defaultPath: join(app.getPath('documents'), `Separation-Agreement-${slug(emp.employeeCode)}-${slug(emp.fullName)}.pdf`),
        filters: [{ name: 'PDF document', extensions: ['pdf'] }]
      }
      const res = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
      if (res.canceled || !res.filePath) return null

      writeFileSync(res.filePath, pdf)
      await audit(user, 'GENERATE_SEPARATION', 'employee', emp.id, undefined, { severance: terms.severanceAmount, file: res.filePath })
      shell.showItemInFolder(res.filePath)
      return { path: res.filePath }
    }
  )
}

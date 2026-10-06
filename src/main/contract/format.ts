const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below100(n: number): string {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')
}

function below1000(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  return [h ? `${ONES[h]} Hundred` : '', r ? below100(r) : ''].filter(Boolean).join(' ')
}

/** South-Asian grouping (Thousand, Lakh, Crore), as used for Nepali rupee amounts. */
export function amountInWords(amount: number): string {
  let rupees = Math.floor(amount)
  const paisa = Math.round((amount - rupees) * 100)
  if (rupees === 0 && paisa === 0) return 'Zero'

  const parts: string[] = []
  const units: [number, string][] = [
    [10_000_000, 'Crore'],
    [100_000, 'Lakh'],
    [1000, 'Thousand']
  ]
  for (const [size, name] of units) {
    const q = Math.floor(rupees / size)
    if (q) parts.push(`${q >= 100 ? amountInWords(q) : below100(q)} ${name}`)
    rupees %= size
  }
  if (rupees) parts.push(below1000(rupees))
  let words = parts.join(' ')
  if (paisa) words += `${words ? ' and ' : ''}${below100(paisa)} Paisa`
  return words
}

export function ordinal(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "June 1, 2025" */
export const usDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

export const money = (n: number): string => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

export const escapeHtml = (v: string): string =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

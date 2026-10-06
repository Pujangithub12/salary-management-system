import { z } from 'zod'

const moneyText = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')

export const salaryStructureSchema = z.object({
  ssfEnrolled: z.boolean().default(true),
  citAnnual: moneyText.default('0'),
  femaleTaxCredit: z.boolean().default(false),
  advances: z
    .array(
      z.object({
        month: z.number().int().min(1).max(12),
        openingAdvance: moneyText.nullable(),
        deductionMade: moneyText
      })
    )
    .max(12)
    .default([]),
  items: z
    .array(z.object({ componentId: z.string().trim().min(1, 'Component is required'), annualAmount: moneyText }))
    .max(50)
})

export type SalaryStructureInput = z.input<typeof salaryStructureSchema>
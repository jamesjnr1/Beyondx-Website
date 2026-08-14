// Mobile money details for the dispatch payment step.
export const MOMO_NUMBER   = '054 521 3741'
export const MOMO_NAME     = 'ELIKEM AMA NHAYO'
export const BEYONDX_PHONE = '+233 54 521 3741'

// The worker keeps 100% of the task rate; a flat service fee sits on top.
export const PLATFORM_FEE_FLAT = 20 // GH₵20 per completed job

// Transport tiers — must match proximity.js on the backend
export const TRANSPORT_TIERS = {
  local:     { label: 'Local',             allowance: 0,  description: 'Metro area — no transport charge' },
  regional:  { label: 'Regional',          allowance: 20, description: 'Cross-suburb — two trotro legs there and back' },
  extended:  { label: 'Extended regional', allowance: 50, description: 'Full journey each way — Nsawam / Aburi / Dodowa' },
  intercity: { label: 'Intercity',         allowance: 80, description: 'Long-distance assignment — full round-trip bus fare' },
} as const

export const INTERCITY_MIN_JOB_VALUE = 150 // GH₵ — intercity blocked below this

export type PayMethod = { id: string; name: string; ussd: string }

export const PAY_METHODS: PayMethod[] = [
  { id: 'mtn', name: 'MTN Mobile Money', ussd: '*170#' },
  { id: 'telecel', name: 'Telecel Cash', ussd: '*110#' },
  { id: 'airtel', name: 'AirtelTigo Money', ussd: '*500#' },
]

export const durationLabel = (days: number) =>
  days === 0.5 ? 'Half Day' : days === 1 ? '1 Day' : `${days} Days`

export const feeSplit = (taskRate: number) => {
  const fee = PLATFORM_FEE_FLAT
  return { workerReceives: taskRate, fee, total: taskRate + fee }
}

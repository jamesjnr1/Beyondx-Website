// Mobile money details for the dispatch payment step.
export const MOMO_NUMBER   = '054 521 3741'
export const MOMO_NAME     = 'ELIKEM AMA NHAYO'
export const BEYONDX_PHONE = '+233 54 521 3741'

// The worker keeps 100% of the task rate; a flat service fee sits on top.
export const PLATFORM_FEE_FLAT = 20 // GH₵20 per completed job

// Transport tiers — must match proximity.js on the backend
export const TRANSPORT_TIERS = {
  local:     { label: 'Local',             allowance: 8,   description: 'Metro area — small flat contribution' },
  regional:  { label: 'Regional',          allowance: 40,  description: 'Cross-suburb — round-trip trotro with transfer' },
  extended:  { label: 'Extended regional', allowance: 90,  description: 'Intercity bus round trip plus waiting and taxi buffer' },
  intercity: { label: 'Intercity',         allowance: 200, description: 'Full round-trip bus fare, food, and transit day compensation' },
} as const

export const INTERCITY_MIN_JOB_VALUE = 200 // GH₵ — job must justify a full transit day

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

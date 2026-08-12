// Mobile money details for the dispatch payment step.
// Mirrors beyondxco.com — payments are verified manually by BeyondX.
export const MOMO_NUMBER = '054 521 3741'
export const BEYONDX_PHONE = '+233 54 521 3741'
// The worker keeps 100% of the task rate; the service fee sits on top of it.
export const PLATFORM_FEE = 0.15

export type PayMethod = { id: string; name: string; ussd: string }

export const PAY_METHODS: PayMethod[] = [
  { id: 'mtn', name: 'MTN Mobile Money', ussd: '*170#' },
  { id: 'telecel', name: 'Telecel Cash', ussd: '*110#' },
  { id: 'airtel', name: 'AirtelTigo Money', ussd: '*500#' },
]

export const durationLabel = (days: number) =>
  days === 0.5 ? 'Half Day' : days === 1 ? '1 Day' : `${days} Days`

export const feeSplit = (taskRate: number) => {
  const fee = Math.round(taskRate * PLATFORM_FEE)
  // The worker receives the full task rate; the employer pays the fee on top.
  return { workerReceives: taskRate, fee, total: taskRate + fee }
}

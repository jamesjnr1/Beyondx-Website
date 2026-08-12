// src/lib/config.ts
//
// Platform switches. Change the value, redeploy, done.

/**
 * Dispatch is paused while we build up the employer side of the marketplace.
 *
 * TEMPORARILY ON for testing — set back to `false` before real employers use
 * the site, or they will be able to dispatch workers for real.
 */
export const DISPATCH_ENABLED = true

/** Shown wherever dispatch would normally be offered. */
export const DISPATCH_PAUSED_MESSAGE =
  'Dispatch opens once enough employers have joined. We are onboarding employers now — you can still post a task, and we will be in touch as soon as dispatch goes live.'

/**
 * Referrals are paused until there is enough work flowing to pay rewards on.
 * Set this to `true` to turn the referral programme back on.
 */
export const REFERRALS_ENABLED = false

/** Shown on the worker dashboard while referrals are paused. */
export const REFERRALS_PAUSED_MESSAGE =
  'Our referral rewards programme is coming soon. Once there is steady work on the platform, you will be able to invite people and earn for every person who joins and gets verified.'

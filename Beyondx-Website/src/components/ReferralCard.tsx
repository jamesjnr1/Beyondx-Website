import { useState } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'
import { referral } from '../lib/api'
import { REFERRALS_ENABLED, REFERRALS_PAUSED_MESSAGE } from '../lib/config'

const REWARD = 20

export default function ReferralCard({ code, referrals = 0 }: { code: string; referrals?: number }) {
  if (!REFERRALS_ENABLED) {
    return (
      <div className="mt-6 overflow-hidden rounded-2xl bg-forest-700/95 p-6 text-cream-50 shadow-sm sm:p-7">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-cream-50/15 px-3 py-1 text-xs font-medium">
          <Gift size={14} aria-hidden="true" /> Refer &amp; Earn
        </span>
        <h3 className="font-serif text-xl font-medium leading-snug">Coming soon</h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-cream-50/80">{REFERRALS_PAUSED_MESSAGE}</p>
      </div>
    )
  }

  return <ActiveReferralCard code={code} referrals={referrals} />
}

function ActiveReferralCard({ code, referrals = 0 }: { code: string; referrals?: number }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const url = referral.linkFor(code)
  const shown = url.replace(/^https:\/\//, '')
  const earned = referrals * REWARD

  const message = `Join me on BeyondX and find paid work in Ghana. Sign up here: ${url}`

  const copy = async () => {
    setFailed(false)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        // Fallback for older mobile browsers and non-HTTPS contexts.
        const ta = document.createElement('textarea')
        ta.value = url
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!ok) throw new Error('copy failed')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Tell the person instead of failing silently — they can still select the link.
      setFailed(true)
      setTimeout(() => setFailed(false), 4000)
    }
  }

  const share = async () => {
    // Native share sheet on phones (WhatsApp, SMS); WhatsApp web elsewhere.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join me on BeyondX', text: message, url })
        return
      } catch {
        /* dismissed — fall through to WhatsApp */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-forest-700 text-cream-50 shadow-sm">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="max-w-md">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-cream-50/15 px-3 py-1 text-xs font-medium">
            <Gift size={14} aria-hidden="true" /> Refer &amp; Earn
          </span>
          <h3 className="font-serif text-2xl font-medium leading-tight">
            Earn GH&#8373;{REWARD}.00 for every person you bring to BeyondX.
          </h3>
          <p className="mt-1.5 text-sm text-cream-50/80">
            Share your link. When they sign up and get verified, GH&#8373;{REWARD}.00 is added to your earnings.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><span className="font-semibold">{referrals}</span> <span className="text-cream-50/70">referrals</span></span>
            <span><span className="font-semibold">GH&#8373; {earned.toLocaleString()}</span> <span className="text-cream-50/70">earned</span></span>
          </div>
        </div>

        <div className="w-full shrink-0 sm:w-auto">
          <label htmlFor="referral-link" className="mb-2 block text-xs uppercase tracking-wide text-cream-50/60">
            Your referral link
          </label>
          <div className="flex items-center gap-2 rounded-xl bg-cream-50/10 p-2 ring-1 ring-cream-50/20">
            <input
              id="referral-link"
              readOnly
              value={shown}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 truncate bg-transparent px-2 text-sm font-medium text-cream-50 outline-none sm:max-w-[13rem]"
            />
            <button
              onClick={copy}
              aria-label="Copy referral link"
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-cream-50 px-3 py-2 text-sm font-semibold text-forest-700 transition-all hover:bg-white active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-50/70"
            >
              {copied ? <><Check size={15} aria-hidden="true" /> Copied</> : <><Copy size={15} aria-hidden="true" /> Copy</>}
            </button>
          </div>

          <button
            onClick={share}
            aria-label="Share referral link"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cream-50/30 px-3 py-2 text-sm font-medium text-cream-50 transition-colors hover:bg-cream-50/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-50/70"
          >
            <Share2 size={15} aria-hidden="true" /> Share
          </button>

          <p aria-live="polite" className="mt-1.5 min-h-[1rem] text-xs text-cream-50/70">
            {copied ? 'Link copied.' : failed ? 'Could not copy — tap the link above to select it.' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

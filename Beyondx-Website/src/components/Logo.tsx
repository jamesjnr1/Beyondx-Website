/**
 * BeyondX logo — official lockup (mark + wordmark), background removed.
 *
 * Two transparent variants live in /public:
 *   • beyondx-logo.png        — original (dark). Use on light backgrounds.
 *   • beyondx-logo-light.png  — reversed (cream + green arrow). Use on dark backgrounds.
 *
 * `tone` selects the variant:
 *   tone="dark"  → dark logo   (footer, scrolled navbar, any light section)
 *   tone="light" → cream logo  (over the dark hero)
 */

type LogoProps = {
  tone?: 'light' | 'dark'
  /** tailwind height class for the lockup (default h-9 ≈ 36px) */
  className?: string
}

export default function Logo({ tone = 'dark', className = 'h-9' }: LogoProps) {
  const src = tone === 'light' ? '/beyondx-logo-light.png' : '/beyondx-logo.png'
  return (
    <img
      src={src}
      alt="BeyondX"
      className={`${className} w-auto select-none`}
      draggable={false}
    />
  )
}

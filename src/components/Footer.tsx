import { Instagram, Linkedin, Music2, Twitter, Mail, MapPin } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from './auth/AuthContext'

const socials = [
  { icon: Instagram, href: 'https://instagram.com/beyondx26', label: 'Instagram' },
  { icon: Music2, href: 'https://www.tiktok.com/@beyondx26', label: 'TikTok' },
  { icon: Twitter, href: 'https://x.com/beyondx26', label: 'X' },
  { icon: Linkedin, href: 'https://www.linkedin.com/company/beyondx26/?viewAsMember=true', label: 'LinkedIn' },
]

/** Dark footer: about and socials, quick links, contact, then the vetting note. */
export default function Footer() {
  const { go, open } = useAuth()
  const link = 'text-left text-sm text-cream-100/70 transition-colors hover:text-forest-300'

  const nav: { label: string; onClick: () => void }[] = [
    { label: 'Home', onClick: () => go('home') },
    { label: 'Meet the Team', onClick: () => go('team') },
    { label: 'Gallery', onClick: () => go('gallery') },
    { label: 'News & Events', onClick: () => go('news') },
    { label: 'Hire an Xpert', onClick: () => open('employer-login') },
    { label: 'Find work', onClick: () => open('worker-login') },
    { label: 'Worker Login', onClick: () => open('worker-login') },
    { label: 'Employer Login', onClick: () => open('employer-login') },
  ]

  return (
    <footer className="bg-ink-900 py-14 text-cream-50">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <div className="max-w-sm">
            <Logo tone="light" />
            <p className="mt-4 text-sm leading-relaxed text-cream-100/60">
              Reliable, verified Xperts, selected and managed by BeyondX across Ghana.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {socials.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="rounded-lg border border-cream-50/15 p-2 text-cream-100/70 transition-colors hover:border-forest-400/50 hover:text-forest-300">
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-3">
            {nav.map((n) => (
              <button key={n.label} type="button" onClick={n.onClick} className={link}>{n.label}</button>
            ))}
          </nav>

          <ul className="space-y-3 text-sm text-cream-100/70">
            <li className="flex items-center gap-2.5">
              <MapPin size={16} aria-hidden="true" className="shrink-0 text-forest-300" />
              Greater Accra, Ghana
            </li>
            <li>
              <a href="mailto:beyondx26@gmail.com" className="flex items-center gap-2.5 transition-colors hover:text-forest-300">
                <Mail size={16} aria-hidden="true" className="shrink-0 text-forest-300" />
                beyondx26@gmail.com
              </a>
            </li>
          </ul>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-cream-50/10 pt-6 text-xs text-cream-100/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} BeyondX. Where Work Meets Skill.</p>
          <p className="max-w-xl sm:text-right">
            Every Xpert on this platform is individually vetted by our team before being listed.
          </p>
        </div>
      </div>
    </footer>
  )
}

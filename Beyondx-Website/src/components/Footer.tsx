import { Instagram, Linkedin, Music2, Twitter, Mail, MapPin } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from './auth/AuthContext'

const socials = [
  { icon: Instagram, href: 'https://instagram.com/beyondx26', label: 'Instagram' },
  { icon: Music2, href: 'https://www.tiktok.com/@beyondx26', label: 'TikTok' },
  { icon: Twitter, href: 'https://x.com/beyondx26', label: 'X' },
  { icon: Linkedin, href: 'https://www.linkedin.com/company/beyondx26/?viewAsMember=true', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:beyondx26@gmail.com', label: 'Email' },
]

export default function Footer() {
  const { go, open } = useAuth()
  const linkCls = 'text-left transition-colors hover:text-forest-600'

  return (
    <footer className="border-t border-ink-900/8 bg-cream-100 py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo tone="dark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-700/70 text-pretty">
              Verified, skill-matched workers connected with employers across Ghana.
            </p>

            {/* Contact folded in here on mobile instead of its own stacked
                column below — same information, far less scrolling. From
                `md:` up it reverts to the separate Contact column, which has
                room to breathe alongside Pages and Access. */}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700/70 md:hidden">
              <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" /> Greater Accra, Ghana</span>
              <a href="mailto:beyondx26@gmail.com" className="inline-flex items-center gap-1 transition-colors hover:text-forest-600">
                <Mail size={13} aria-hidden="true" /> beyondx26@gmail.com
              </a>
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="rounded-lg border border-ink-900/10 p-2 text-ink-700 transition-colors hover:bg-forest-600/5 hover:text-forest-600">
                  <Icon size={18} />
                </a>
              ))}
            </div>
            <p className="mt-3 hidden text-xs text-ink-700/60 md:block">TikTok · IG · X: @beyondx26 · LinkedIn: Beyond X</p>
          </div>

          {/* Pages and Access repeat the main nav and the auth entry points —
              both already reachable from the header on mobile, so they're
              hidden there and only shown from `md:` up. */}
          <div className="hidden md:block">
            <h4 className="mb-4 text-sm font-semibold text-ink-900">Pages</h4>
            <ul className="space-y-2.5 text-sm text-ink-700/70">
              <li><button onClick={() => go('home')} className={linkCls}>Home</button></li>
              <li><button onClick={() => go('team')} className={linkCls}>Meet the Team</button></li>
              <li><button onClick={() => go('gallery')} className={linkCls}>Gallery</button></li>
            </ul>
          </div>

          <div className="hidden md:block">
            <h4 className="mb-4 text-sm font-semibold text-ink-900">Access</h4>
            <ul className="space-y-2.5 text-sm text-ink-700/70">
              <li><button onClick={() => open('employer-login')} className={linkCls}>Hire a worker</button></li>
              <li><button onClick={() => open('worker-login')} className={linkCls}>Find work</button></li>
              <li><button onClick={() => open('worker-login')} className={linkCls}>Worker Login</button></li>
              <li><button onClick={() => open('employer-login')} className={linkCls}>Employer Login</button></li>
            </ul>
          </div>

          <div className="hidden md:block">
            <h4 className="mb-4 text-sm font-semibold text-ink-900">Contact</h4>
            <ul className="space-y-2.5 text-sm text-ink-700/70">
              <li>Greater Accra, Ghana</li>
              <li><a href="mailto:beyondx26@gmail.com" className="transition-colors hover:text-forest-600">beyondx26@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-900/8 pt-5 sm:mt-12 sm:pt-6">
          <p className="text-xs leading-relaxed text-ink-700/60 text-pretty">
            Every worker on this platform is individually vetted by our team before
            being listed. © {new Date().getFullYear()} BeyondX. Same Hands. New Start.
          </p>
        </div>
      </div>
    </footer>
  )
}

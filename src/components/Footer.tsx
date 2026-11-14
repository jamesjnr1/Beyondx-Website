import { Instagram, Linkedin, Music2, Twitter, Mail, MapPin, ArrowUpRight } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from './auth/AuthContext'
import { container } from './site/ui'

const socials = [
  { icon: Instagram, href: 'https://instagram.com/beyondx26', label: 'Instagram' },
  { icon: Music2, href: 'https://www.tiktok.com/@beyondx26', label: 'TikTok' },
  { icon: Twitter, href: 'https://x.com/beyondx26', label: 'X' },
  { icon: Linkedin, href: 'https://www.linkedin.com/company/beyondx26/?viewAsMember=true', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:beyondx26@gmail.com', label: 'Email' },
]

/** Footer: one plain dark surface, the logo, links to the real pages and the name across the full width. */
export default function Footer() {
  const { go, open } = useAuth()
  const linkCls = 'text-left transition-colors hover:text-cream-50'
  const colTitle = 'mb-3.5 text-sm font-semibold text-cream-50'

  return (
    <footer className="bg-ink-950 text-cream-200/65">
      <div className={container}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:py-16">
          <div className="col-span-2 md:col-span-1">
            <Logo tone="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-pretty">
              Reliable, verified Xperts — selected and managed by BeyondX across Ghana.
            </p>
            <p className="mt-3 text-sm font-semibold text-cream-50">Where Work Meets Skill.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {socials.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="rounded-lg border border-cream-50/10 p-2 text-cream-200/80 transition-colors hover:border-cream-50/30 hover:text-cream-50">
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Pages">
            <h2 className={colTitle}>Pages</h2>
            <ul className="space-y-2.5 text-sm">
              <li><button onClick={() => go('home')} className={linkCls}>Home</button></li>
              <li><button onClick={() => go('team')} className={linkCls}>Meet the Team</button></li>
              <li><button onClick={() => go('gallery')} className={linkCls}>Gallery</button></li>
              <li><button onClick={() => go('news')} className={linkCls}>News &amp; Events</button></li>
            </ul>
          </nav>

          <nav aria-label="Access">
            <h2 className={colTitle}>Access</h2>
            <ul className="space-y-2.5 text-sm">
              <li><button onClick={() => open('employer-login')} className={linkCls}>Hire an Xpert</button></li>
              <li><button onClick={() => open('worker-login')} className={linkCls}>Sign up to be an Xpert</button></li>
              <li><button onClick={() => open('employer-login')} className={linkCls}>Employer Login</button></li>
              <li><button onClick={() => open('worker-login')} className={linkCls}>Worker Login</button></li>
            </ul>
          </nav>

          <div className="col-span-2 md:col-span-1">
            <h2 className={colTitle}>Contact</h2>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2"><MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-cream-200/40" /> Greater Accra, Ghana</li>
              <li>
                <a href="mailto:beyondx26@gmail.com" className="flex items-start gap-2 transition-colors hover:text-cream-50">
                  <Mail size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-cream-200/40" /> beyondx26@gmail.com
                </a>
              </li>
            </ul>
            <button onClick={() => open('employer-login')} className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cream-50 underline-offset-4 hover:underline">
              Request an Xpert
              <ArrowUpRight size={15} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* The name across the full width: decoration, drawn by CSS so it is not read out twice */}
        <div aria-hidden="true" className="[container-type:inline-size]">
          <p data-wordmark="BeyondX" className="whitespace-nowrap font-serif text-[22cqw] font-medium leading-[0.8] tracking-[-0.03em] text-ink-800 before:content-[attr(data-wordmark)]" />
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-cream-50/10 py-5 text-xs text-cream-200/50 lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} BeyondX. Every Xpert on this platform is individually vetted by our team before being assigned.</p>
          <p>TikTok · IG · X: @beyondx26 · LinkedIn: Beyond X</p>
        </div>
      </div>
    </footer>
  )
}

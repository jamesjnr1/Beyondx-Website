import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type TextSize = 'normal' | 'large' | 'xlarge'

export type A11ySettings = {
  textSize: TextSize
  contrast: boolean
  underlineLinks: boolean
  reduceMotion: boolean
  dyslexiaFont: boolean
}

const DEFAULTS: A11ySettings = {
  textSize: 'normal',
  contrast: false,
  underlineLinks: false,
  reduceMotion: false,
  dyslexiaFont: false,
}

const KEY = 'beyondx-a11y'

type Ctx = {
  settings: A11ySettings
  update: <K extends keyof A11ySettings>(k: K, v: A11ySettings[K]) => void
  reset: () => void
}

const A11yCtx = createContext<Ctx>({ settings: DEFAULTS, update: () => {}, reset: () => {} })

function load(): A11ySettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

const DM_SANS_ID = 'a11y-dm-sans'
const DM_SANS_HREF =
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'

// DM Sans is only needed when the easier-to-read setting is on, so it is fetched
// on demand rather than added to every page load.
function ensureDmSans() {
  if (typeof document === 'undefined' || document.getElementById(DM_SANS_ID)) return
  const link = document.createElement('link')
  link.id = DM_SANS_ID
  link.rel = 'stylesheet'
  link.href = DM_SANS_HREF
  document.head.appendChild(link)
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(load)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('a11y-contrast', settings.contrast)
    root.classList.toggle('a11y-underline', settings.underlineLinks)
    root.classList.toggle('a11y-reduce-motion', settings.reduceMotion)
    root.classList.toggle('a11y-dyslexia', settings.dyslexiaFont)
    if (settings.dyslexiaFont) ensureDmSans()
    root.classList.remove('a11y-text-large', 'a11y-text-xlarge')
    if (settings.textSize === 'large') root.classList.add('a11y-text-large')
    if (settings.textSize === 'xlarge') root.classList.add('a11y-text-xlarge')
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* storage unavailable — settings still apply for this session */
    }
  }, [settings])

  const update = <K extends keyof A11ySettings>(k: K, v: A11ySettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }))

  return (
    <A11yCtx.Provider value={{ settings, update, reset: () => setSettings(DEFAULTS) }}>
      {children}
    </A11yCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useA11y = () => useContext(A11yCtx)

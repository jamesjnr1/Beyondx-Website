import { useEffect, useRef, useState } from 'react'
import { Accessibility, X, Check } from 'lucide-react'
import { useA11y, type TextSize } from './AccessibilityContext'

const SIZES: { id: TextSize; label: string; sample: string }[] = [
  { id: 'normal', label: 'Normal', sample: 'A' },
  { id: 'large', label: 'Large', sample: 'A' },
  { id: 'xlarge', label: 'Largest', sample: 'A' },
]

function Toggle({
  id, label, description, checked, onChange,
}: { id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink-900">{label}</label>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-700">{description}</span>
      </span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/50 ${
          checked ? 'bg-forest-600' : 'bg-ink-900/20'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 h-5 w-5 rounded-full bg-cream-50 shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </div>
  )
}

export default function AccessibilityMenu() {
  const { settings, update, reset } = useA11y()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Accessibility options"
        className="fixed bottom-4 left-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-forest-600 text-cream-50 shadow-lg transition-all hover:bg-forest-500 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-600/40 sm:bottom-6 sm:left-6"
      >
        <Accessibility size={26} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[70] bg-ink-950/40" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-title"
            className="fixed bottom-0 left-0 right-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-cream-50 p-5 shadow-2xl outline-none sm:bottom-24 sm:left-6 sm:right-auto sm:w-[22rem] sm:rounded-2xl"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 id="a11y-title" className="font-serif text-lg font-medium text-ink-900">Accessibility</h2>
              <button
                onClick={() => { setOpen(false); btnRef.current?.focus() }}
                aria-label="Close accessibility options"
                className="rounded-lg p-1.5 text-ink-700 transition-colors hover:bg-ink-900/5"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-ink-700">
              Adjust how BeyondX looks. Your choices are saved on this device.
            </p>

            <div className="mb-2">
              <span id="a11y-textsize-label" className="mb-2 block text-sm font-medium text-ink-900">Text size</span>
              <div role="radiogroup" aria-labelledby="a11y-textsize-label" className="grid grid-cols-3 gap-2">
                {SIZES.map((s, i) => {
                  const active = settings.textSize === s.id
                  return (
                    <button
                      key={s.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => update('textSize', s.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/50 ${
                        active ? 'border-forest-600 bg-forest-600/5' : 'border-ink-900/15 hover:bg-ink-900/5'
                      }`}
                    >
                      <span aria-hidden="true" className={`font-semibold text-ink-900 ${['text-sm', 'text-base', 'text-xl'][i]}`}>
                        {s.sample}
                      </span>
                      <span className="text-xs text-ink-700">{s.label}</span>
                      {active && <Check size={13} aria-hidden="true" className="text-forest-600" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="divide-y divide-ink-900/10">
              <Toggle
                id="a11y-contrast"
                label="High contrast"
                description="Stronger colours and darker text for easier reading."
                checked={settings.contrast}
                onChange={(v) => update('contrast', v)}
              />
              <Toggle
                id="a11y-underline"
                label="Underline links"
                description="Adds underlines so links stand out from normal text."
                checked={settings.underlineLinks}
                onChange={(v) => update('underlineLinks', v)}
              />
              <Toggle
                id="a11y-motion"
                label="Reduce motion"
                description="Turns off animations and movement across the site."
                checked={settings.reduceMotion}
                onChange={(v) => update('reduceMotion', v)}
              />
              <Toggle
                id="a11y-dyslexia"
                label="Easier-to-read font"
                description="Switches to a plainer font with more spacing between letters."
                checked={settings.dyslexiaFont}
                onChange={(v) => update('dyslexiaFont', v)}
              />
            </div>

            <button
              onClick={reset}
              className="mt-4 w-full rounded-full border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/50"
            >
              Reset to default
            </button>
          </div>
        </>
      )}
    </>
  )
}

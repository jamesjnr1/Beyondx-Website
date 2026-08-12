import { useRef, useState } from 'react'
import { Camera, Check } from 'lucide-react'

export type ProfileField = {
  name: string
  label: string
  kind?: 'text' | 'tel' | 'textarea' | 'select'
  options?: string[]
  placeholder?: string
  full?: boolean
}

export default function ProfileEditor({
  heading,
  initials,
  fields,
  defaults,
}: {
  heading: string
  initials: string
  fields: ProfileField[]
  defaults: Record<string, string>
}) {
  const [avatar, setAvatar] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(defaults)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setAvatar(URL.createObjectURL(file))
  }
  const set = (k: string) => (v: string) => setValues((s) => ({ ...s, [k]: v }))
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div className="mt-6 max-w-3xl rounded-2xl bg-cream-50 p-6 shadow-sm ring-1 ring-ink-900/5 sm:p-8">
      <h2 className="mb-6 font-serif text-xl font-medium text-ink-900">{heading}</h2>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-forest-600 text-2xl font-bold text-cream-50">
            {avatar ? <img src={avatar} alt="Profile" className="h-full w-full object-cover" /> : initials}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-cream-50 shadow ring-2 ring-cream-50 transition-colors hover:bg-forest-500">
            <Camera size={15} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
        </div>
        <div className="text-center sm:text-left">
          <p className="font-serif text-lg font-medium text-ink-900">Profile photo</p>
          <button onClick={() => fileRef.current?.click()} className="text-sm font-medium text-forest-700 hover:text-forest-600">
            Upload a picture
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.name} className={`block ${f.full ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1 block text-xs font-medium text-ink-700">{f.label}</span>
            {f.kind === 'textarea' ? (
              <textarea rows={3} value={values[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.name)(e.target.value)}
                className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600" />
            ) : f.kind === 'select' ? (
              <select value={values[f.name] ?? ''} onChange={(e) => set(f.name)(e.target.value)}
                className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600">
                {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.kind ?? 'text'} value={values[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.name)(e.target.value)}
                className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600" />
            )}
          </label>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} className="rounded-full bg-forest-600 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98]">
          Save changes
        </button>
        {saved && <span className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700"><Check size={16} /> Profile saved</span>}
      </div>
    </div>
  )
}

import { useEffect, useState, type ReactNode, type FormEvent, type InputHTMLAttributes } from 'react'
import { X, ShieldCheck, ChevronLeft, ChevronRight, Mail, UserRound, Building2, Camera, Check } from 'lucide-react'
import Logo from '../Logo'
import { useAuth, type AuthView } from './AuthContext'
import { auth, session, referral, contact, media, ApiError } from '../../lib/api'
import OnboardingQuestions from './OnboardingQuestions'
import * as v from '../../lib/validate'
import { categories, remoteCategories } from '../../data'
import { REMOTE_JOBS_ENABLED } from '../../lib/config'
import GoogleSignInButton from './GoogleSignInButton'
import { supabase } from '../../lib/supabase'
import { getVisitorId } from '../../lib/track'
import { finishEmployerRegistration } from './employerVerification'

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern',
  'Northern', 'Volta', 'Upper East', 'Upper West', 'Brong-Ahafo',
]

const INDUSTRIES = [
  'Construction & Real Estate', 'Events & Hospitality', 'Agriculture & Farming',
  'Retail & Trade', 'Logistics & Delivery', 'Cleaning & Facility Management',
  'Healthcare & Social Services', 'Education', 'Manufacturing', 'Other',
]

const COMPANY_SIZES = [
  '1–5 employees', '6–20 employees', '21–50 employees',
  '51–200 employees', '200+ employees',
]
const FIELD_SKILLS = categories.map((c) => c.title)
const REMOTE_SKILLS = remoteCategories.map((c) => c.title)
const RELATIONSHIPS = [
  'Family Member', 'Friend', 'Former Employer',
  'Community/Religious Leader', 'Case Worker / Social Worker', 'Other',
]
// A reference must be someone who can speak to the applicant's work — never a
// family member (the server enforces this too).
const REFERENCE_RELATIONSHIPS = [
  'Former employer', 'Supervisor or trainer', 'Colleague in the same trade', 'Past client', 'Other (not family)',
]
const ID_TYPES = ['Ghana Card', 'Voter ID', 'Passport', "Driver's licence", 'NHIS card']

/** Picks an image, uploads it, and reports the stored URL. */
function ImageUpload({ label, hint, urls, onChange, max = 1, folder }: {
  label: string; hint?: string; urls: string[]; onChange: (urls: string[]) => void; max?: number; folder: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) { setErr('Choose a PNG, JPG or WebP photo.'); return }
    if (file.size > 8 * 1024 * 1024) { setErr('That photo is over 8MB.'); return }
    setErr(null); setBusy(true)
    try {
      const base64: string = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('read')); r.readAsDataURL(file)
      })
      const { url } = await media.upload(base64, file.name, folder)
      onChange(max === 1 ? [url] : [...urls, url].slice(0, max))
    } catch { setErr('Upload failed — please try again.') }
    finally { setBusy(false) }
  }
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mb-2 text-xs text-ink-700/70">{hint}</p>}
      {urls.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {urls.map((u) => (
            <span key={u} className="relative">
              <img src={u} alt="" className="h-16 w-16 rounded-md border border-ink-900/10 object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => onChange(urls.filter((x) => x !== u))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {urls.length < max && (
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink-900/15 px-3 py-2 text-sm font-medium text-ink-800 hover:bg-ink-900/5 ${busy ? 'opacity-60' : ''}`}>
          <Camera size={15} aria-hidden="true" /> {busy ? 'Uploading…' : urls.length ? 'Add another photo' : 'Upload photo'}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} disabled={busy} className="sr-only" />
        </label>
      )}
      {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-700">
      {message}
    </p>
  )
}

function errText(e: unknown) {
  if (e instanceof ApiError) return e.message
  return 'Something went wrong. Please try again.'
}

function Modal({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { close } = useAuth()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [close])

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink-950/60 p-4 backdrop-blur-sm sm:items-center" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="relative my-4 w-full max-w-md rounded-2xl bg-cream-50 p-6 shadow-2xl sm:my-8 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-ink-700 transition-colors hover:bg-ink-900/5 hover:text-ink-900">
          <X size={20} aria-hidden="true" />
        </button>
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo tone="dark" className="h-8" />
          <h2 id="auth-modal-title" className="mt-4 font-serif text-2xl font-medium text-ink-900">{title}</h2>
          <p className="mt-1 text-sm text-ink-700">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, error, hint, ...rest }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const id = `f-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  return (
    <div className="block">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-800">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-ink-900 outline-none transition-colors placeholder:text-ink-700/40 focus:ring-2 disabled:bg-forest-600/5 disabled:text-ink-700 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-ink-900/15 focus:border-forest-500 focus:ring-forest-500/20'}`}
        {...rest}
      />
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-red-700">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-ink-700/60">{hint}</p>}
    </div>
  )
}

function Select({ label, options, value, onChange, error, placeholder }: { label: string; options: string[]; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  const id = `s-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  return (
    <div className="block">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-800">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-ink-900 outline-none transition-colors focus:ring-2 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-ink-900/15 focus:border-forest-500 focus:ring-forest-500/20'}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  )
}

function Submit({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return <button type="submit" disabled={disabled} className="w-full rounded-md bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70">{children}</button>
}

function SwitchLink({ prompt, action, to }: { prompt: string; action: string; to: AuthView }) {
  const { open } = useAuth()
  return (
    <p className="mt-5 text-center text-sm text-ink-700">
      {prompt}{' '}
      <button onClick={() => open(to)} className="font-semibold text-forest-600 hover:text-forest-500">{action}</button>
    </p>
  )
}

function Divider() {
  return <div className="my-4 flex items-center gap-3 text-xs text-ink-700/50"><span className="h-px flex-1 bg-ink-900/10" /> or <span className="h-px flex-1 bg-ink-900/10" /></div>
}

function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-700">
        <span>Step {step} of {total}</span><span>{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/10">
        <div className="h-full rounded-full bg-forest-600 transition-all duration-300" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  )
}

function WorkerLogin() {
  const { go } = useAuth()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'forgot-send' | 'forgot-verify'>('login')
  const [resetCode, setResetCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const API = 'https://beyondx-backend-production-1a08.up.railway.app'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr(null); setBusy(true)
    try {
      const data = await auth.workerLogin(phone.trim(), pin.trim())
      session.saveWorker(data.token, data.worker)
      go('worker-dashboard')
    } catch (e2) { setErr(errText(e2)) } finally { setBusy(false) }
  }

  const sendResetCode = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !phone.trim()) return
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`${API}/api/otp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.trim() }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not send code.')
      setMode('forgot-verify')
    } catch (e2) { setErr(errText(e2)) } finally { setBusy(false) }
  }

  const resetPin = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`${API}/api/auth/worker-reset-pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.trim(), code: resetCode.trim(), newPin: newPin.trim() }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not reset PIN.')
      setSuccess('PIN updated! You can now sign in.'); setMode('login'); setPin(''); setResetCode(''); setNewPin('')
    } catch (e2) { setErr(errText(e2)) } finally { setBusy(false) }
  }

  if (mode === 'forgot-send') return (
    <Modal title="Reset Your PIN" subtitle="Enter your phone number and we'll send you a code">
      <form onSubmit={sendResetCode} className="space-y-4">
        <Field label="Phone Number" type="tel" placeholder="0XX XXX XXXX" value={phone} onChange={setPhone} />
        <FormError message={err} />
        <Submit disabled={busy || !phone.trim()}>{busy ? 'Sending…' : 'Send Reset Code'}</Submit>
      </form>
      <Divider />
      <button onClick={() => { setMode('login'); setErr(null) }} className="w-full text-center text-sm text-ink-700 underline underline-offset-2">Back to login</button>
    </Modal>
  )

  if (mode === 'forgot-verify') return (
    <Modal title="Enter Code & New PIN" subtitle={`We sent a code to ${phone}`}>
      <form onSubmit={resetPin} className="space-y-4">
        <Field label="6-digit code" inputMode="numeric" placeholder="123456" value={resetCode} onChange={setResetCode} />
        <Field label="New PIN" type="password" inputMode="numeric" placeholder="••••" value={newPin} onChange={setNewPin} hint="4–6 digits" />
        <FormError message={err} />
        <Submit disabled={busy}>{busy ? 'Updating…' : 'Set New PIN'}</Submit>
      </form>
      <Divider />
      <button onClick={() => { setMode('forgot-send'); setErr(null) }} className="w-full text-center text-sm text-ink-700 underline underline-offset-2">Resend code</button>
    </Modal>
  )

  return (
    <Modal title="Worker Login" subtitle="Access your BeyondX task dashboard">
      {success && <p className="mb-3 rounded-lg bg-forest-600/10 px-3 py-2 text-sm font-medium text-forest-700">{success}</p>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Phone Number" type="tel" placeholder="0XX XXX XXXX" value={phone} onChange={setPhone} />
        <div>
          <Field label="PIN" type="password" inputMode="numeric" placeholder="••••" value={pin} onChange={setPin} />
          <button type="button" onClick={() => { setMode('forgot-send'); setErr(null); setSuccess(null) }} className="mt-1 text-xs text-forest-700 underline underline-offset-2">Forgot PIN?</button>
        </div>
        <FormError message={err} />
        <Submit disabled={busy}>{busy ? 'Signing in…' : 'Sign In to My Dashboard'}</Submit>
      </form>
      <Divider />
      <SwitchLink prompt="New to BeyondX?" action="Apply to be an Xpert" to="worker-register" />
    </Modal>
  )
}

// ---------- employer account type ----------
type EmployerType = 'individual' | 'enterprise'

function EmployerTypeChoice({ onChoose }: { onChoose: (t: EmployerType) => void }) {
  const options: { type: EmployerType; label: string; desc: string; Icon: typeof UserRound }[] = [
    { type: 'individual', label: 'Individual / Sole Trader', desc: 'You hire workers for your home, personal business, or as a sole trader.', Icon: UserRound },
    { type: 'enterprise', label: 'Business / Enterprise', desc: 'You are registering on behalf of a registered company or organisation.', Icon: Building2 },
  ]
  return (
    <Modal title="Create Employer Account" subtitle="How are you hiring?">
      <div className="grid gap-3">
        {options.map(({ type, label, desc, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChoose(type)}
            className="group flex w-full items-center gap-4 rounded-xl border border-ink-900/12 bg-cream-50 p-5 text-left transition-all hover:border-forest-600/50 hover:bg-forest-600/4 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-600/10 text-forest-700">
              <Icon size={22} aria-hidden="true" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-base font-medium text-ink-900">{label}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-ink-700/80">{desc}</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-700/30 transition-colors group-hover:text-forest-600" />
          </button>
        ))}
      </div>
      <Divider />
      <SwitchLink prompt="Already have an account?" action="Sign In" to="employer-login" />
    </Modal>
  )
}

function EmployerLogin() {
  const { go } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'forgot-send' | 'forgot-verify'>('login')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const API = 'https://beyondx-backend-production-1a08.up.railway.app'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr(null); setBusy(true)
    try {
      const data = await auth.employerLogin(email.trim(), password)
      session.saveEmployer(data.token, data.employer)
      go('employer-dashboard')
    } catch (e2) { setErr(errText(e2)) } finally { setBusy(false) }
  }

  const sendResetCode = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !email.trim()) return
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`${API}/api/auth/employer-forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not send reset email.')
      setMode('forgot-verify')
    } catch (e2) { setErr(errText(e2)) } finally { setBusy(false) }
  }

  const resetPass = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`${API}/api/auth/employer-reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), code: resetCode.trim(), newPassword }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not reset password.')
      setSuccess('Password updated! You can now sign in.'); setMode('login'); setPassword(''); setResetCode(''); setNewPassword('')
    } catch (e2) { setErr(errText(e2)) } finally { setBusy(false) }
  }

  if (mode === 'forgot-send') return (
    <Modal title="Reset Password" subtitle="Enter your email and we'll send a reset code">
      <form onSubmit={sendResetCode} className="space-y-4">
        <Field label="Email Address" type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
        <FormError message={err} />
        <Submit disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send Reset Code'}</Submit>
      </form>
      <Divider />
      <button onClick={() => { setMode('login'); setErr(null) }} className="w-full text-center text-sm text-ink-700 underline underline-offset-2">Back to login</button>
    </Modal>
  )

  if (mode === 'forgot-verify') return (
    <Modal title="Enter Code & New Password" subtitle={`Check your email at ${email}`}>
      <form onSubmit={resetPass} className="space-y-4">
        <Field label="6-digit code" inputMode="numeric" placeholder="123456" value={resetCode} onChange={setResetCode} />
        <Field label="New Password" type="password" placeholder="••••••••" value={newPassword} onChange={setNewPassword} hint="At least 6 characters" />
        <FormError message={err} />
        <Submit disabled={busy}>{busy ? 'Updating…' : 'Set New Password'}</Submit>
      </form>
      <Divider />
      <button onClick={() => { setMode('forgot-send'); setErr(null) }} className="w-full text-center text-sm text-ink-700 underline underline-offset-2">Resend code</button>
    </Modal>
  )

  return (
    <Modal title="Employer Login" subtitle="Sign in to access the worker dispatch platform">
      {success && <p className="mb-3 rounded-lg bg-forest-600/10 px-3 py-2 text-sm font-medium text-forest-700">{success}</p>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email Address" type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
        <div>
          <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
          <button type="button" onClick={() => { setMode('forgot-send'); setErr(null); setSuccess(null) }} className="mt-1 text-xs text-forest-700 underline underline-offset-2">Forgot password?</button>
        </div>
        <FormError message={err} />
        <Submit disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</Submit>
      </form>
      <Divider />
      <SwitchLink prompt="Don't have an account?" action="Create Employer Account" to="employer-register" />
    </Modal>
  )
}

function EmployerRegister() {
  const { open } = useAuth()
  const [accountType, setAccountType] = useState<EmployerType | null>(null)
  const [step, setStep] = useState(1)
  const [f, setF] = useState({
    org: '', contact: '', phone: '', region: '', email: '', password: '',
    // individual verification
    ghanaCard: '',
    // enterprise verification
    businessReg: '', industry: '', companySize: '',
  })
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})
  const [googleVerified, setGoogleVerified] = useState(false)
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const set = (k: keyof typeof f) => (vv: string) => {
    if (k === 'email' && googleVerified) setGoogleVerified(false)
    setF({ ...f, [k]: vv })
  }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const totalSteps = 3  // 1: basic info, 2: verification, 3: email + password

  const validateStep = (n: number) => {
    if (n === 1) {
      const errs = v.check({ org: v.orgName(f.org), contact: v.fullName(f.contact), phone: v.phone(f.phone), region: v.required('Region')(f.region) })
      setFieldErr(errs); return Object.keys(errs).length === 0
    }
    if (n === 2) {
      const errs = accountType === 'individual'
        ? v.check({ ghanaCard: v.ghanaCard(f.ghanaCard) })
        : v.check({ industry: v.required('Industry')(f.industry), companySize: v.required('Company size')(f.companySize) })
      setFieldErr(errs); return Object.keys(errs).length === 0
    }
    const errs = v.check({ email: v.email(f.email), password: v.password(f.password) })
    setFieldErr(errs); return Object.keys(errs).length === 0
  }

  const sendCode = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithOtp({ email: f.email.trim(), options: { shouldCreateUser: true } })
    if (error) throw new Error(error.message)
  }

  const next = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateStep(step)) return
    if (step < totalSteps) { setStep(step + 1); return }
    if (busy) return
    setErr(null); setBusy(true)
    try {
      if (googleVerified || !supabase) {
        await finishEmployerRegistration({ ...f }, accountType!, f.ghanaCard, f.businessReg)
        open('employer-onboarding')
      } else {
        await sendCode()
        setAwaitingCode(true)
      }
    } catch (e2) {
      setErr(errText(e2))
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    if (!supabase || busy) return
    setCodeErr(null); setBusy(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ email: f.email.trim(), token: code.trim(), type: 'email' })
      if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That code is incorrect or has expired.' : error.message)
      await finishEmployerRegistration({ ...f }, accountType!, f.ghanaCard, f.businessReg)
      await supabase.auth.signOut()
      open('employer-onboarding')
    } catch (e2) {
      setCodeErr(e2 instanceof Error ? e2.message : 'Could not verify that code.')
    } finally {
      setBusy(false)
    }
  }

  // Choose account type first
  if (!accountType) return <EmployerTypeChoice onChoose={(t) => { setAccountType(t); setStep(1) }} />

  if (awaitingCode) {
    return (
      <Modal title="Enter your code" subtitle="One more step to confirm it's really you">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[9999px] bg-forest-600/10">
            <Mail size={26} className="text-forest-600" />
          </div>
          <p className="text-sm leading-relaxed text-ink-700">
            We sent a code to <span className="font-semibold text-ink-900">{f.email}</span>.
            Enter it below to finish creating your account.
          </p>
          <input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); verifyCode() } }}
            inputMode="numeric" autoFocus placeholder="Enter the code"
            className="w-full rounded-lg border border-ink-900/15 bg-white px-4 py-3 text-center text-lg tracking-widest text-ink-900 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20" />
          <FormError message={codeErr} />
          <button type="button" disabled={busy || !code.trim()} onClick={verifyCode}
            className="w-full rounded-md bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
            {busy ? 'Verifying…' : 'Verify & Create Account'}
          </button>
          <p className="text-xs text-ink-700/70">Didn&rsquo;t get it? Check spam, or</p>
          <button type="button" disabled={resent}
            onClick={async () => { try { await sendCode(); setResent(true) } catch { /* keep screen */ } }}
            className="text-sm font-medium text-forest-700 underline-offset-2 hover:underline disabled:text-ink-700/40 disabled:no-underline">
            {resent ? 'Sent again — check your inbox' : 'Resend the code'}
          </button>
        </div>
      </Modal>
    )
  }

  const typeLabel = accountType === 'individual' ? 'Individual' : 'Business'

  return (
    <Modal
      title={`Create ${typeLabel} Account`}
      subtitle={accountType === 'individual' ? 'Hire vetted workers for your home or business' : 'Set up your company on the BeyondX platform'}
    >
      <Stepper step={step} total={totalSteps} />
      <form onSubmit={next} className="space-y-4">
        {step === 1 && (<>
          <Field label={accountType === 'individual' ? 'Your Name or Trading Name' : 'Company Name'} value={f.org} onChange={set('org')} error={fieldErr.org} placeholder={accountType === 'individual' ? 'e.g. Kofi Mensah Enterprises' : 'e.g. Accra Business Hub Ltd'} />
          <Field label="Primary Contact Person" value={f.contact} onChange={set('contact')} error={fieldErr.contact} />
          <Field label="Phone Number" type="tel" placeholder="0241234567" value={f.phone} onChange={set('phone')} error={fieldErr.phone} />
          <Select label="Region" options={REGIONS} placeholder="Select a region" value={f.region} onChange={set('region')} error={fieldErr.region} />
          <button type="button" onClick={() => { setAccountType(null); setStep(1) }} className="mt-1 flex items-center gap-1 text-xs text-ink-700/60 underline-offset-2 hover:text-ink-700 hover:underline">
            ← Change account type
          </button>
        </>)}

        {step === 2 && accountType === 'individual' && (<>
          <div className="rounded-xl bg-forest-600/6 p-4 border border-forest-600/15">
            <p className="text-sm font-medium text-ink-900">Identity verification</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-700">
              We collect your Ghana Card number to confirm you are a real, traceable individual.
              Your card number is never shared with workers or third parties — it's used only to
              verify your account before your first dispatch.
            </p>
          </div>
          <Field label="Ghana Card Number" placeholder="GHA-123456789-0" value={f.ghanaCard} onChange={set('ghanaCard')} error={fieldErr.ghanaCard} />
          <p className="text-xs text-ink-700/60">Format: GHA-XXXXXXXXX-X (shown on the front of your card)</p>
        </>)}

        {step === 2 && accountType === 'enterprise' && (<>
          <div className="rounded-xl bg-forest-600/6 p-4 border border-forest-600/15">
            <p className="text-sm font-medium text-ink-900">Business verification</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-700">
              We verify registered businesses through the Ghana Registrar General's records.
              Your account will be marked as verified once confirmed — usually within 1 working day.
            </p>
          </div>
          <Field label="Ghana Business Registration Number (optional)" placeholder="e.g. CS-12345" value={f.businessReg} onChange={set('businessReg')} />
          <Select label="Industry" options={INDUSTRIES} placeholder="Select your industry" value={f.industry} onChange={set('industry')} error={fieldErr.industry} />
          <Select label="Company Size" options={COMPANY_SIZES} placeholder="Select size" value={f.companySize} onChange={set('companySize')} error={fieldErr.companySize} />
        </>)}

        {step === 3 && (<>
          <GoogleSignInButton
            onVerified={(profile) => {
              setF((prev) => ({ ...prev, email: profile.email, contact: prev.contact || profile.name }))
              setGoogleVerified(true)
              setFieldErr((prev) => ({ ...prev, email: '' }))
            }}
            onError={(m) => setErr(m)}
          />
          <div className="flex items-center gap-3 text-xs text-ink-700/50">
            <span className="h-px flex-1 bg-ink-900/10" />
            or enter your email
            <span className="h-px flex-1 bg-ink-900/10" />
          </div>
          <div>
            <Field label="Email Address" type="email" placeholder="you@company.com" value={f.email}
              onChange={set('email')} error={fieldErr.email} disabled={googleVerified} />
            {googleVerified && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-forest-700">
                <ShieldCheck size={13} aria-hidden="true" /> Verified by Google
              </p>
            )}
          </div>
          <Field label="Password" type="password" placeholder="At least 8 characters" value={f.password} onChange={set('password')} error={fieldErr.password} />
        </>)}

        <FormError message={err} />
        <div className="mt-5 flex items-center gap-3">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 rounded-md border border-ink-900/15 px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button type="submit" disabled={busy}
            className="flex-1 rounded-md bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70">
            {busy ? 'Creating…' : step < totalSteps ? 'Continue' : 'Create Account'}
          </button>
        </div>
      </form>
      <SwitchLink prompt="Already have an account?" action="Sign In" to="employer-login" />
    </Modal>
  )
}

const XPERT_STEPS = 5

function WorkerRegister() {
  const { open } = useAuth()
  const [step, setStep] = useState(1)
  const [f, setF] = useState({
    name: '', phone: '', homeArea: '', experience: '',
    idType: '', idNumber: '',
    gName: '', gPhone: '', relationship: '',
    rName: '', rPhone: '', rRelationship: '',
    pin: '',
  })
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})
  const [skills, setSkills] = useState<string[]>([])
  const [evidence, setEvidence] = useState<string[]>([])
  const [idPhoto, setIdPhoto] = useState<string[]>([])
  const set = (k: keyof typeof f) => (val: string) => setF({ ...f, [k]: val })
  const toggleSkill = (sk: string) => setSkills((c) => (c.includes(sk) ? c.filter((x) => x !== sk) : [...c, sk]))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const norm = (p: string) => p.replace(/[\s-]/g, '')

  const validateStep = (n: number) => {
    setErr(null)
    let errs: Record<string, string> = {}
    if (n === 1) {
      errs = v.check({ name: v.fullName(f.name), phone: v.phone(f.phone), homeArea: v.required('Area / Neighbourhood')(f.homeArea) })
    } else if (n === 2) {
      if (!skills.length) { setErr('Select at least one skill.'); return false }
      if (f.experience.trim().length < 10) errs.experience = 'Tell us about your experience (at least a sentence).'
      if (!evidence.length) { setFieldErr(errs); setErr('Upload at least one photo of work you have done.'); return false }
    } else if (n === 3) {
      errs = v.check({ idType: v.required('ID type')(f.idType), idNumber: v.required('ID number')(f.idNumber) })
      if (!idPhoto.length) { setFieldErr(errs); setErr('Upload a clear photo of your ID.'); return false }
    } else if (n === 4) {
      errs = v.check({
        gName: v.fullName(f.gName), gPhone: v.phone(f.gPhone),
        relationship: v.required('Relationship to guarantor')(f.relationship),
        rName: v.fullName(f.rName), rPhone: v.phone(f.rPhone),
        rRelationship: v.required('Relationship to reference')(f.rRelationship),
      })
      if (!errs.gPhone && norm(f.gPhone) === norm(f.phone)) errs.gPhone = 'Your guarantor must have a different number from yours.'
      if (!errs.rPhone && norm(f.rPhone) === norm(f.phone)) errs.rPhone = 'Your reference must have a different number from yours.'
      if (!errs.rPhone && norm(f.rPhone) === norm(f.gPhone)) errs.rPhone = 'Your reference must be a different person from your guarantor.'
    } else {
      errs = v.check({ pin: v.pin(f.pin) })
    }
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  const next = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateStep(step)) return
    if (step < XPERT_STEPS) { setStep(step + 1); return }
    if (busy) return
    setErr(null); setBusy(true)
    try {
      const base = {
        fullName: f.name.trim(), phone: norm(f.phone), prisonFacility: '',
        skills, pin: f.pin.trim(),
        guarantorName: f.gName.trim(), guarantorPhone: norm(f.gPhone), guarantorRelationship: f.relationship,
        homeArea: f.homeArea.trim(),
        idType: f.idType, idCardNumber: f.idNumber.trim(), idDocumentUrl: idPhoto[0],
        experienceSummary: f.experience.trim(),
        referenceName: f.rName.trim(), referencePhone: norm(f.rPhone), referenceRelationship: f.rRelationship,
        skillEvidenceUrls: evidence,
        visitorId: getVisitorId(),
      }
      const ref = referral.get()
      const data = await auth.workerRegister({ ...base, ...(ref ? { referredBy: ref } : {}) })
      session.saveWorker(data.token, data.worker)
      referral.clear()
      contact.send({
        name: f.name.trim(),
        phone: f.phone.trim(),
        message:
          `A new Xpert application was submitted and is waiting for review in the admin dashboard.\n\n` +
          `Name: ${f.name.trim()}\nPhone: ${f.phone.trim()}\n` +
          (googleEmail ? `Email: ${googleEmail} (verified via Google)\n` : '') +
          `Skills: ${skills.join(', ')}\nArea: ${f.homeArea.trim()}\n` +
          `Guarantor: ${f.gName.trim()} (${f.gPhone.trim()}, ${f.relationship})\n` +
          `Reference: ${f.rName.trim()} (${f.rPhone.trim()}, ${f.rRelationship})`,
        category: 'worker_registered',
      }).catch(() => null)
      open('worker-onboarding')
    } catch (e2) {
      setErr(errText(e2))
    } finally {
      setBusy(false)
    }
  }

  const skillButton = (sk: string) => {
    const active = skills.includes(sk)
    return (
      <button type="button" key={sk} onClick={() => toggleSkill(sk)}
        className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${active ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-900/15 text-ink-700 hover:border-ink-900/40'}`}>
        {sk}
      </button>
    )
  }

  const titles = ['About you', 'Skills & experience', 'Identity', 'Guarantor & reference', 'Create your PIN']

  return (
    <Modal title="Apply to be an Xpert" subtitle="Everything is reviewed by BeyondX before your account is activated">
      <Stepper step={step} total={XPERT_STEPS} />
      <p className="-mt-2 mb-4 text-sm font-semibold text-ink-900">{titles[step - 1]}</p>
      <form onSubmit={next} className="space-y-4">
        {step === 1 && (<>
          <Field label="Full Name (as on your ID)" value={f.name} onChange={set('name')} error={fieldErr.name} />
          <Field label="Phone Number" type="tel" placeholder="0241234567" value={f.phone} onChange={set('phone')} error={fieldErr.phone} />
          <Field label="Area / Neighbourhood" placeholder="e.g. Madina, Tema, Dansoman" value={f.homeArea} onChange={set('homeArea')} error={fieldErr.homeArea} hint="Helps us match you to nearby jobs." />
          <div className="flex items-center gap-3 pt-1 text-xs text-ink-700/50">
            <span className="h-px flex-1 bg-ink-900/10" />
            or add your Google email (optional)
            <span className="h-px flex-1 bg-ink-900/10" />
          </div>
          {googleEmail ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-ink-800">
              <ShieldCheck size={13} aria-hidden="true" /> Verified: {googleEmail}
            </p>
          ) : (
            <GoogleSignInButton
              onVerified={(profile) => {
                setGoogleEmail(profile.email)
                if (!f.name.trim()) setF((prev) => ({ ...prev, name: profile.name }))
              }}
              onError={(m) => setErr(m)}
            />
          )}
        </>)}

        {step === 2 && (<>
          <div>
            <p className="mb-1 text-sm font-medium text-ink-800">Your skills</p>
            <p className="mb-3 text-xs text-ink-700">Select all that apply</p>
            <div className="grid grid-cols-2 gap-2">{FIELD_SKILLS.map(skillButton)}</div>
            {REMOTE_JOBS_ENABLED && (<>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-700/60">Remote</p>
              <div className="grid grid-cols-2 gap-2">{REMOTE_SKILLS.map(skillButton)}</div>
            </>)}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-800">Your work experience</span>
            <textarea value={f.experience} onChange={(e) => set('experience')(e.target.value)} rows={4}
              placeholder="e.g. 5 years cleaning offices in Osu; 2 years as a site helper on building projects in Tema."
              className="w-full rounded-lg border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25" />
            {fieldErr.experience && <span className="mt-1 block text-xs text-red-700">{fieldErr.experience}</span>}
          </label>
          <ImageUpload label="Photos of your work" hint="Show jobs you've done before — up to 5 photos. Certificates are welcome too."
            urls={evidence} onChange={setEvidence} max={5} folder="xpert-evidence" />
        </>)}

        {step === 3 && (<>
          <Select label="ID type" options={ID_TYPES} placeholder="Select your ID" value={f.idType} onChange={set('idType')} error={fieldErr.idType} />
          <Field label="ID number" value={f.idNumber} onChange={set('idNumber')} error={fieldErr.idNumber} />
          <ImageUpload label="Photo of your ID" hint="A clear photo of the front of your ID. Only BeyondX staff see it."
            urls={idPhoto} onChange={setIdPhoto} folder="xpert-id" />
        </>)}

        {step === 4 && (<>
          <p className="text-sm font-semibold text-ink-900">Guarantor</p>
          <p className="-mt-3 text-xs text-ink-700/70">Someone who can vouch for you. BeyondX will call them to confirm.</p>
          <Field label="Guarantor full name" value={f.gName} onChange={set('gName')} error={fieldErr.gName} />
          <Field label="Guarantor phone number" type="tel" placeholder="0241234567" value={f.gPhone} onChange={set('gPhone')} error={fieldErr.gPhone} />
          <Select label="Relationship to guarantor" options={RELATIONSHIPS} placeholder="Select a relationship" value={f.relationship} onChange={set('relationship')} error={fieldErr.relationship} />
          <p className="pt-2 text-sm font-semibold text-ink-900">Work reference</p>
          <p className="-mt-3 text-xs text-ink-700/70">A past employer, client or someone in your trade — not a family member and not your guarantor.</p>
          <Field label="Reference full name" value={f.rName} onChange={set('rName')} error={fieldErr.rName} />
          <Field label="Reference phone number" type="tel" placeholder="0241234567" value={f.rPhone} onChange={set('rPhone')} error={fieldErr.rPhone} />
          <Select label="How they know your work" options={REFERENCE_RELATIONSHIPS} placeholder="Select one" value={f.rRelationship} onChange={set('rRelationship')} error={fieldErr.rRelationship} />
        </>)}

        {step === 5 && (<>
          <Field label="PIN (4 digits)" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={f.pin} onChange={set('pin')} error={fieldErr.pin} hint="You'll use your phone number and this PIN to log in." />
          <div className="rounded-lg border border-ink-900/10 bg-gray-50 px-4 py-3 text-sm text-ink-700">
            <p className="flex items-center gap-1.5 font-semibold text-ink-900"><Check size={15} aria-hidden="true" /> What happens next</p>
            <p className="mt-1">BeyondX reviews your application: we check your ID, call your guarantor and reference, and look at your work. You'll get an SMS once you're approved — then you can start taking jobs.</p>
          </div>
        </>)}

        <FormError message={err} />
        <div className="mt-5 flex items-center gap-3">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-1 rounded-md border border-ink-900/15 px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button type="submit" disabled={busy} className="flex-1 rounded-md bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70">
            {busy ? 'Submitting…' : step < XPERT_STEPS ? 'Continue' : 'Submit application'}
          </button>
        </div>
      </form>
      <SwitchLink prompt="Already applied?" action="Sign In" to="worker-login" />
    </Modal>
  )
}

function EmployerOnboarding() {
  const { go } = useAuth()
  const [agreed, setAgreed] = useState(false)
  const [stage, setStage] = useState<'notice' | 'questions'>('notice')

  if (stage === 'questions') {
    return (
      <Modal title="A Few Quick Questions" subtitle="This helps us serve you better">
        <OnboardingQuestions role="employer" onDone={() => go('employer-dashboard')} />
      </Modal>
    )
  }

  return (
    <Modal title="Before You Proceed" subtitle="Our verification standard">
      <div className="space-y-4 text-sm text-ink-700">
        <p>All workers on this platform are individually vetted by our team.</p>
        <ul className="space-y-2">
          {['Workers are assessed and confirmed as work-ready before listing.', 'You are hiring vetted, work-ready individuals assessed as fit for employment.', 'Hiring through this platform supports transparent, tracked work history.'].map((t) => (
            <li key={t} className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest-600" /><span>{t}</span></li>
          ))}
        </ul>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-forest-600/5 p-3">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-forest-600" />
          <span className="text-xs text-ink-800">I have read and understood this notice, and I agree to engage all workers with fairness and human dignity.</span>
        </label>
      </div>
      <button disabled={!agreed} onClick={() => setStage('questions')} className="mt-5 w-full rounded-md bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
        Continue
      </button>
    </Modal>
  )
}

function WorkerOnboarding() {
  const { go } = useAuth()
  return (
    <Modal title="Before You Begin" subtitle="Welcome. You belong here.">
      <OnboardingQuestions role="worker" onDone={() => go('worker-dashboard')} />
    </Modal>
  )
}

export default function AuthModals() {
  const { view } = useAuth()
  switch (view) {
    case 'worker-login': return <WorkerLogin />
    case 'employer-login': return <EmployerLogin />
    case 'employer-register': return <EmployerRegister />
    case 'worker-register': return <WorkerRegister />
    case 'employer-onboarding': return <EmployerOnboarding />
    case 'worker-onboarding': return <WorkerOnboarding />
    default: return null
  }
}

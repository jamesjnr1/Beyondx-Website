import { useEffect, useState, type ReactNode, type FormEvent, type InputHTMLAttributes } from 'react'
import { X, ShieldCheck, ChevronLeft, ChevronRight, Mail, UserRound, Building2 } from 'lucide-react'
import Logo from '../Logo'
import { useAuth, type AuthView } from './AuthContext'
import { auth, session, referral, contact, ApiError } from '../../lib/api'
import OnboardingQuestions from './OnboardingQuestions'
import * as v from '../../lib/validate'
import { categories, remoteCategories } from '../../data'
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
  return <button type="submit" disabled={disabled} className="w-full rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70">{children}</button>
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
      <SwitchLink prompt="New to BeyondX?" action="Register as a Worker" to="worker-register" />
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
            className="w-full rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
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
              className="flex items-center gap-1 rounded-full border border-ink-900/15 px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button type="submit" disabled={busy}
            className="flex-1 rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70">
            {busy ? 'Creating…' : step < totalSteps ? 'Continue' : 'Create Account'}
          </button>
        </div>
      </form>
      <SwitchLink prompt="Already have an account?" action="Sign In" to="employer-login" />
    </Modal>
  )
}

function WorkerRegister() {
  const { open } = useAuth()
  const [step, setStep] = useState(1)
  const [f, setF] = useState({ name: '', phone: '', homeArea: '', gName: '', gPhone: '', relationship: '', pin: '' })
  // Google sign-up is optional for workers — most authenticate by phone+PIN
  // alone. If used, it just verifies an email to attach to the account.
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  // Phone verification is NOT optional — it's the one contact detail every
  // OTP state — temporarily disabled while Arkesel carrier delivery is resolved.
  // const [phoneVerified] = useState(false)
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})
  const [skills, setSkills] = useState<string[]>([])
  const set = (k: keyof typeof f) => (v: string) => {
    setF({ ...f, [k]: v })
  }
  const toggleSkill = (s: string) => setSkills((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // sendPhoneCode and verifyPhoneCode disabled with OTP — restore when SMS works

  const validateStep = (n: number) => {
    if (n === 1) {
      const errs = v.check({ name: v.fullName(f.name), phone: v.phone(f.phone) })
      setFieldErr(errs)
      if (Object.keys(errs).length) return false
      // Phone OTP temporarily optional — SMS carrier delivery issue with Arkesel.
      // Workers can register without verifying; admin verifies manually via console.
      return true
    }
    if (n === 2) {
      setFieldErr({})
      if (!skills.length) { setErr('Select at least one skill so employers know what you can do.'); return false }
      setErr(null)
      return true
    }
    const errs = v.check({
      gName: v.fullName(f.gName),
      gPhone: v.phone(f.gPhone),
      relationship: v.required('Relationship to guarantor')(f.relationship),
      pin: v.pin(f.pin),
    })
    if (!errs.gPhone && f.gPhone.replace(/[\s-]/g, '') === f.phone.replace(/[\s-]/g, '')) {
      errs.gPhone = 'Your guarantor must have a different number from yours.'
    }
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  const next = async (e: FormEvent) => {

    e.preventDefault()
    if (!validateStep(step)) return
    if (step < 3) { setStep(step + 1); return }
    if (busy) return
    setErr(null); setBusy(true)
    try {
      const base = {
        fullName: f.name.trim(), phone: f.phone.trim(), prisonFacility: '',  // set by admin after background verification
        skills, pin: f.pin.trim(), guarantorName: f.gName.trim(),
        guarantorPhone: f.gPhone.trim(), guarantorRelationship: f.relationship,
        homeArea: f.homeArea.trim() || undefined,
        visitorId: getVisitorId(),
      }
      const ref = referral.get()
      const extra: Record<string, string> = {}
      if (ref) extra.referredBy = ref
      if (googleEmail) extra.email = googleEmail
      let data
      if (Object.keys(extra).length) {
        // Send the extras, but never let them block a signup: if the backend
        // rejects a field it doesn't recognise, register again without it.
        try {
          data = await auth.workerRegister({ ...base, ...extra })
        } catch (err) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
            data = await auth.workerRegister(base)
          } else {
            throw err
          }
        }
      } else {
        data = await auth.workerRegister(base)
      }
      session.saveWorker(data.token, data.worker)
      referral.clear()
      contact.send({
        name: f.name.trim(),
        phone: f.phone.trim(),
        message:
          `A new worker account was created.\n\n` +
          `Name: ${f.name.trim()}\n` +
          `Phone: ${f.phone.trim()}\n` +
          (googleEmail ? `Email: ${googleEmail} (verified via Google)\n` : '') +
          `Skills: ${skills.join(', ') || '—'}\n` +
          `Guarantor: ${f.gName.trim()} (${f.gPhone.trim()}, ${f.relationship})\n\n` +
          `Onboarding answers will follow in a separate email if they complete them.`,
        category: 'worker_registered',
      }).catch(() => null)
      open('worker-onboarding')
    } catch (e2) {
      setErr(errText(e2))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Register as a Worker" subtitle="Join BeyondX and start earning through verified work">
      <Stepper step={step} total={3} />
      <form onSubmit={next} className="space-y-4">
        {step === 1 && (<>
          <Field label="Full Name" value={f.name} onChange={set('name')} error={fieldErr.name} />
          <Field label="Phone Number" type="tel" placeholder="0241234567" value={f.phone} onChange={set('phone')} error={fieldErr.phone} />
          <Field label="Area / Neighbourhood" placeholder="e.g. Madina, Tema, Dansoman" value={f.homeArea} onChange={set('homeArea')} hint="Helps match you to nearby jobs — employers see how close you are." />

          {/* Phone OTP temporarily disabled — SMS not delivering due to Arkesel carrier issue.
              Re-enable by restoring the phoneVerified check in validateStep and this UI block. */}


          <div className="flex items-center gap-3 pt-1 text-xs text-ink-700/50">
            <span className="h-px flex-1 bg-ink-900/10" />
            or sign up with Google (optional)
            <span className="h-px flex-1 bg-ink-900/10" />
          </div>
          {googleEmail ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-forest-600/10 px-3 py-2 text-xs font-medium text-forest-700">
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
        {step === 2 && (
          <div>
            <p className="mb-1 text-sm font-medium text-ink-800">Your Skills</p>
            <p className="mb-3 text-xs text-ink-700">Select all that apply</p>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-clay-500">On the field</p>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_SKILLS.map((sk) => {
                const active = skills.includes(sk)
                return (
                  <button type="button" key={sk} onClick={() => toggleSkill(sk)} className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${active ? 'border-forest-600 bg-forest-600/10 text-forest-700' : 'border-ink-900/15 text-ink-700 hover:border-forest-500/50'}`}>
                    {sk}
                  </button>
                )
              })}
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-clay-500">Remote</p>
              <div className="grid grid-cols-2 gap-2">
                {REMOTE_SKILLS.map((sk) => {
                  const active = skills.includes(sk)
                  return (
                    <button type="button" key={sk} onClick={() => toggleSkill(sk)} className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${active ? 'border-forest-600 bg-forest-600/10 text-forest-700' : 'border-ink-900/15 text-ink-700 hover:border-forest-500/50'}`}>
                      {sk}
                    </button>
                  )
                })}
              </div>
          </div>
        )}
        {step === 3 && (<>
          <Field label="Guarantor Full Name" value={f.gName} onChange={set('gName')} error={fieldErr.gName} />
          <Field label="Guarantor Phone Number" type="tel" placeholder="0241234567" value={f.gPhone} onChange={set('gPhone')} error={fieldErr.gPhone} />
          <Select label="Relationship to Guarantor" options={RELATIONSHIPS} placeholder="Select a relationship" value={f.relationship} onChange={set('relationship')} error={fieldErr.relationship} />
          <Field label="PIN (4 digits)" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={f.pin} onChange={set('pin')} error={fieldErr.pin} />
        </>)}
        <FormError message={err} />
        <div className="mt-5 flex items-center gap-3">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-1 rounded-full border border-ink-900/15 px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button type="submit" disabled={busy} className="flex-1 rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70">
            {busy ? 'Creating…' : step < 3 ? 'Continue' : 'Create My Account'}
          </button>
        </div>
      </form>
      <SwitchLink prompt="Already have an account?" action="Sign In" to="worker-login" />
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
      <button disabled={!agreed} onClick={() => setStage('questions')} className="mt-5 w-full rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
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

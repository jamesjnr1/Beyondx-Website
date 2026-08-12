// src/lib/api.ts
//
// Single place where the BeyondX backend is defined.
// Endpoints and localStorage keys match beyondxco.com exactly, so a session
// created on either site is understood by the other.

export const API_BASE = 'https://beyondx-backend-production-1a08.up.railway.app'

/* ------------------------------- session ------------------------------- */

const KEY = {
  workerToken: 'bx_worker_token',
  worker: 'bx_worker',
  employerToken: 'bx_employer_token',
  employer: 'bx_employer',
} as const

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode) — session lasts this tab only */
  }
}
function clear(...keys: string[]) {
  try { keys.forEach((k) => localStorage.removeItem(k)) } catch { /* ignore */ }
}

export type Worker = {
  id?: string | number
  workerId?: string
  fullName?: string
  name?: string
  phone?: string
  skills?: string[]
  photoUrl?: string
  rating?: number | string
  tasksCompleted?: number
  dailyCharge?: string | number
  totalEarned?: number
  [k: string]: unknown
}

// Task lifecycle on the backend:
//   open -> offered -> accepted -> pending_confirmation -> employer_confirmed / completed
export type TaskStatus =
  | 'open' | 'offered' | 'accepted' | 'declined'
  | 'pending_confirmation' | 'employer_confirmed' | 'completed'

export type Task = {
  id: string | number
  taskType?: string
  description?: string
  location?: string
  duration?: string
  pay?: number | string
  status?: TaskStatus
  employer?: string | { orgName?: string; name?: string; contactPerson?: string; phone?: string; email?: string }
  acceptedBy?: string | number | { fullName?: string; workerId?: string; phone?: string }
  paymentRef?: string
  createdAt?: string
  reviews?: { rating?: number; comment?: string }[]
  [k: string]: unknown
}

export type Employer = {
  id?: string | number
  orgName?: string
  contactPerson?: string
  phone?: string
  region?: string
  email?: string
  logoUrl?: string
  [k: string]: unknown
}

export const session = {
  workerToken: () => localStorage.getItem(KEY.workerToken),
  employerToken: () => localStorage.getItem(KEY.employerToken),
  worker: () => read<Worker>(KEY.worker),
  employer: () => read<Employer>(KEY.employer),
  saveWorker: (token: string, worker: Worker) => { write(KEY.workerToken, token); write(KEY.worker, worker) },
  saveEmployer: (token: string, employer: Employer) => { write(KEY.employerToken, token); write(KEY.employer, employer) },
  patchWorker: (patch: Partial<Worker>) => write(KEY.worker, { ...(read<Worker>(KEY.worker) || {}), ...patch }),
  patchEmployer: (patch: Partial<Employer>) => write(KEY.employer, { ...(read<Employer>(KEY.employer) || {}), ...patch }),
  logoutWorker: () => clear(KEY.workerToken, KEY.worker),
  logoutEmployer: () => clear(KEY.employerToken, KEY.employer),
}

/* ------------------------------- plumbing ------------------------------ */

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Opts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
}

async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, token } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // Network failure, DNS, or a CORS rejection all land here.
    throw new ApiError('Could not reach the BeyondX server. Check your connection and try again.', 0)
  }

  const text = await res.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-JSON response */ }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) ||
      (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : null) ||
      (res.status === 401 ? 'Your session has expired. Please sign in again.' : `Request failed (${res.status})`)
    throw new ApiError(msg, res.status)
  }

  return data as T
}


/* ------------------------------- referrals ----------------------------- */

// A worker's referral link is beyondxco.com/join?ref=<workerId>. The code is
// captured on arrival and kept until the person finishes registering, so it
// survives them browsing the site first.
const REFERRAL_KEY = 'bx_referral'

export const referral = {
  // Reads ?ref= from the URL, stores it, and returns it. Safe to call repeatedly.
  capture(): string | null {
    if (typeof window === 'undefined') return null
    try {
      const code = new URLSearchParams(window.location.search).get('ref')
      if (code && /^[A-Za-z0-9-]{3,20}$/.test(code)) {
        localStorage.setItem(REFERRAL_KEY, code.toUpperCase())
        return code.toUpperCase()
      }
      return localStorage.getItem(REFERRAL_KEY)
    } catch {
      return null
    }
  },
  get(): string | null {
    try { return localStorage.getItem(REFERRAL_KEY) } catch { return null }
  },
  clear() {
    try { localStorage.removeItem(REFERRAL_KEY) } catch { /* ignore */ }
  },
  linkFor(workerId: string) {
    return `https://beyondxco.com/join?ref=${encodeURIComponent(workerId)}`
  },
}

/* --------------------------------- auth -------------------------------- */

export type WorkerAuthResponse = { token: string; worker: Worker }
export type EmployerAuthResponse = { token: string; employer: Employer }

export const auth = {
  workerLogin: (phone: string, pin: string) =>
    request<WorkerAuthResponse>('/api/auth/worker-login', { method: 'POST', body: { phone, pin } }),

  workerRegister: (payload: {
    fullName: string
    phone: string
    prisonFacility: string
    skills: string[]
    pin: string
    guarantorName: string
    guarantorPhone: string
    guarantorRelationship: string
    referredBy?: string
  }) => request<WorkerAuthResponse>('/api/auth/worker-register', { method: 'POST', body: payload }),

  employerLogin: (email: string, password: string) =>
    request<EmployerAuthResponse>('/api/auth/employer-login', { method: 'POST', body: { email, password } }),

  employerRegister: (payload: {
    email: string
    password: string
    orgName: string
    contactPerson: string
    phone: string
    region: string
  }) => request<EmployerAuthResponse>('/api/auth/employer-register', { method: 'POST', body: payload }),
}

/* -------------------------------- workers ------------------------------ */

export const workers = {
  list: () => request<{ workers: Worker[] }>('/api/workers'),
  me: (token = session.workerToken()) => request<{ worker: Worker }>('/api/workers/me', { token }),
  updateMe: (patch: Record<string, unknown>, token = session.workerToken()) =>
    request<unknown>('/api/workers/me', { method: 'PATCH', body: patch, token }),
}

/* --------------------------------- tasks ------------------------------- */

export const tasks = {
  open: () => request<{ tasks: Task[] }>('/api/tasks'),
  mine: (token = session.workerToken()) => request<{ tasks: Task[] }>('/api/tasks/mine', { token }),
  workerHistory: (token = session.workerToken()) => request<{ tasks: Task[] }>('/api/tasks/worker-history', { token }),
  all: (token = session.employerToken()) => request<{ tasks: Task[] }>('/api/tasks/all', { token }),

  acceptOffer: (id: string | number, token = session.workerToken()) =>
    request<unknown>(`/api/tasks/${id}/accept-offer`, { method: 'PATCH', token }),
  declineOffer: (id: string | number, token = session.workerToken()) =>
    request<unknown>(`/api/tasks/${id}/decline-offer`, { method: 'PATCH', token }),
  accept: (id: string | number, token = session.workerToken()) =>
    request<unknown>(`/api/tasks/${id}/accept`, { method: 'PATCH', token }),
  workerDone: (id: string | number, token = session.workerToken()) =>
    request<unknown>(`/api/tasks/${id}/worker-done`, { method: 'PATCH', token }),

  create: (
    payload: {
      taskType: string
      description: string
      location: string
      duration: string
      pay: number
      workerId?: string | number
    },
    token = session.employerToken(),
  ) => request<{ task?: Task }>('/api/tasks', { method: 'POST', body: payload, token }),

  // Dispatch a specific worker. The job description the employer writes goes
  // to the worker as-is — the payment reference is sent as its own field
  // (paymentRef) so it's stored for BeyondX/admin review only and never
  // shown to the worker.
  dispatch: (
    args: { worker: Worker; taskType: string; description?: string; location: string; duration: string; pay: number; paymentRef: string },
    token = session.employerToken(),
  ) => request<{ task?: Task }>('/api/tasks', {
    method: 'POST',
    token,
    body: {
      taskType: args.taskType,
      description: args.description?.trim() || args.taskType,
      location: args.location || 'To be confirmed',
      duration: args.duration,
      pay: args.pay,
      workerId: args.worker.id,
      paymentRef: args.paymentRef,
    },
  }),

  complete: (id: string | number, token = session.employerToken()) =>
    request<unknown>(`/api/tasks/${id}/complete`, { method: 'PATCH', token }),

  review: (id: string | number, rating: number, comment: string, token = session.employerToken()) =>
    request<unknown>(`/api/tasks/${id}/review`, { method: 'POST', body: { rating, comment }, token }),
}

/* ------------------------------- employers ----------------------------- */

// Onboarding answers and enquiries go to this app's own /api/contact function,
// which stores the lead and emails BeyondX. Not the Railway backend.
export const contact = {
  send: (payload: { name: string; email?: string; phone?: string; message: string; category: string }) =>
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (r) => {
      const t = await r.text()
      let d: unknown = null
      try { d = t ? JSON.parse(t) : null } catch { /* non-JSON (e.g. a 404 page) */ }
      if (!r.ok) throw new ApiError((d as { error?: string })?.error || `Could not send (${r.status})`, r.status)
      return d
    }),
}

export const media = {
  upload: (imageBase64: string, fileName: string, folder: string) =>
    fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, fileName, folder }),
    }).then(async (r) => {
      const t = await r.text()
      let d: unknown = null
      try { d = t ? JSON.parse(t) : null } catch { /* non-JSON */ }
      if (!r.ok) throw new ApiError((d as { error?: string })?.error || 'Upload failed', r.status)
      return d as { url: string }
    }),
}

export const employers = {
  profile: (token = session.employerToken()) => request<{ employer: Employer }>('/api/auth/employer-profile', { token }),
  updateProfile: (patch: Record<string, unknown>, token = session.employerToken()) =>
    request<unknown>('/api/auth/employer-profile', { method: 'PATCH', body: patch, token }),
  reviews: (token = session.employerToken()) => request<unknown>('/api/auth/employer-reviews', { token }),
}

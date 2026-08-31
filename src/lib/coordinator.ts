// src/lib/coordinator.ts
//
// Coordinator role: a worker who leads a small team, rather than doing single
// jobs solo. Role state lives on the worker record as JSON-in-a-field
// (coordinatorApplication, coordinatorTeam, coordinatorDisputes,
// coordinatorQuotes, coordinatorPayoutSplits) and is PATCHed through the
// existing /api/workers/me endpoint — the same pattern already used for
// experienceEntries/certifications in WorkerDashboard. If the Railway backend
// ignores unknown fields, this still works within a session; once the
// backend adds real columns for these, no frontend change is needed here,
// only the request/response shape stays the same.
//
// BeyondX staff review and approve/deny Coordinator applications and quotes
// out of band today (the AdminConsole is a separate app not in this repo).
// Until an admin surface writes back role/status, "Pending Review" here is
// a durable state the worker sees, not a live-updating one.

import type { Worker } from './api'
import { categories, remoteCategories } from '../data'
import { REMOTE_JOBS_ENABLED } from './config'

export const ALL_CATEGORY_TITLES = (REMOTE_JOBS_ENABLED ? [...categories, ...remoteCategories] : categories).map((c) => c.title)

export type CoordinatorStatus = 'pending' | 'approved' | 'denied'

export type CoordinatorApplication = {
  businessName?: string
  categories: string[]
  teamSize: number
  yearsOperating: number
  samplePastJobs: string
  submittedAt: string
  status: CoordinatorStatus
  reviewNote?: string
}

export type TeamMember = {
  id: string
  name: string
  phone?: string
  categories: string[]
  rating?: number
  jobsCompleted?: number
  status: 'active' | 'removed'
  addedAt: string
}

export type CoordinatorQuote = {
  taskId: string
  price: number
  scopeNotes: string
  assignedMemberIds: string[]
  status: 'pending' | 'approved' | 'denied'
  submittedAt: string
}

export type PayoutSplitLine = { memberId: string; percent: number; amount: number }
export type PayoutSplitRecord = {
  taskId: string
  totalPayout: number
  lines: PayoutSplitLine[]
  recordedAt: string
}

export type CoordinatorDispute = {
  id: string
  summary: string
  memberId?: string
  status: 'open' | 'escalated' | 'resolved'
  createdAt: string
}

export function parseJSON<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback
  if (Array.isArray(raw) || (typeof raw === 'object')) return raw as T
  try { return JSON.parse(String(raw)) } catch { return fallback }
}

export const isCoordinator = (w: Worker | null | undefined): boolean => w?.role === 'coordinator'

export const getApplication = (w: Worker | null | undefined): CoordinatorApplication | null =>
  parseJSON<CoordinatorApplication | null>(w?.coordinatorApplication, null)

export const getTeam = (w: Worker | null | undefined): TeamMember[] =>
  parseJSON<TeamMember[]>(w?.coordinatorTeam, [])

export const getActiveTeam = (w: Worker | null | undefined): TeamMember[] =>
  getTeam(w).filter((m) => m.status === 'active')

export const getDisputes = (w: Worker | null | undefined): CoordinatorDispute[] =>
  parseJSON<CoordinatorDispute[]>(w?.coordinatorDisputes, [])

export const getQuotes = (w: Worker | null | undefined): Record<string, CoordinatorQuote> =>
  parseJSON<Record<string, CoordinatorQuote>>(w?.coordinatorQuotes, {})

export const getPayoutSplits = (w: Worker | null | undefined): Record<string, PayoutSplitRecord> =>
  parseJSON<Record<string, PayoutSplitRecord>>(w?.coordinatorPayoutSplits, {})

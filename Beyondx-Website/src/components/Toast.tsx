import { useEffect } from 'react'
import { CircleCheck, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'info'
export type ToastMsg = { id: number; kind: ToastKind; title: string; detail?: string } | null

export default function Toast({ toast, onClose }: { toast: ToastMsg; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  const Icon = toast.kind === 'success' ? CircleCheck : Info

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-ink-900/10 bg-cream-50 p-4 shadow-lg ring-1 ring-ink-900/5"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            toast.kind === 'success' ? 'bg-forest-600/10 text-forest-600' : 'bg-clay-400/15 text-clay-600'
          }`}
        >
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-900">{toast.title}</span>
          {toast.detail && <span className="mt-0.5 block text-xs leading-relaxed text-ink-700">{toast.detail}</span>}
        </span>
        <button
          onClick={onClose}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-lg p-1 text-ink-700 transition-colors hover:bg-ink-900/5"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

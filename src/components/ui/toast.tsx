'use client'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type ToastAction = { label: string; onClick: () => void | Promise<void> }
export type ToastInput = {
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  action?: ToastAction
  durationMs?: number
}
type ToastItem = ToastInput & { id: number }

const ToastContext = React.createContext<{ toast: (t: ToastInput) => void } | null>(null)

/**
 * Sehr schlanker Toast – bewusst ohne Extra-Abhaengigkeit. Jede Aktion in der
 * App ist rueckgaengig machbar; der Undo-Button lebt hier.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(1)

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = nextId.current++
      setItems((prev) => [...prev.slice(-2), { ...input, id }])
      const timeout = input.durationMs ?? (input.action ? 7000 : 4000)
      window.setTimeout(() => dismiss(id), timeout)
    },
    [dismiss],
  )

  const value = React.useMemo(() => ({ toast }), [toast])
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-3"
            role="status"
            aria-live="polite"
          >
            {items.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-border px-4 py-3 shadow-lg',
                  'animate-in slide-in-from-bottom-4',
                  t.variant === 'destructive' && 'border-destructive/40 bg-destructive text-destructive-foreground',
                  t.variant === 'success' && 'bg-card text-card-foreground',
                  (!t.variant || t.variant === 'default') && 'bg-card text-card-foreground',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.title}</p>
                  {t.description && <p className="truncate text-sm opacity-80">{t.description}</p>}
                </div>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      void t.action!.onClick()
                      dismiss(t.id)
                    }}
                    className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold uppercase tracking-wide text-primary hover:bg-accent"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast muss innerhalb von <ToastProvider> verwendet werden')
  return ctx
}

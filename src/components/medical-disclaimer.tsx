import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Kontextbezogener, dezenter Hinweis. Der ausfuehrliche Disclaimer kommt
 * einmalig beim Onboarding – hier geht es nur um die stille Erinnerung.
 */
export function MedicalDisclaimer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn('flex items-start gap-2 text-xs leading-relaxed text-muted-foreground', className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

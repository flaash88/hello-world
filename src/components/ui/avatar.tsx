import { cn } from '@/lib/utils'

/**
 * Personen-Marker. Bei jedem Eintrag sichtbar, damit man immer sieht wer was
 * eingetragen hat – ohne Foto-Upload, nur Initiale plus persoenliche Farbe.
 */
export function UserAvatar({
  initials,
  color,
  size = 'default',
  className,
  title,
}: {
  initials: string
  color: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
  title?: string
}) {
  const sizes = {
    sm: 'size-6 text-[0.625rem]',
    default: 'size-8 text-xs',
    lg: 'size-12 text-base',
  }
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase text-white',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-12 items-center gap-1 self-start pr-3 text-sm font-semibold text-muted-foreground"
    >
      <ChevronLeft className="size-5" aria-hidden />
      {label}
    </Link>
  )
}

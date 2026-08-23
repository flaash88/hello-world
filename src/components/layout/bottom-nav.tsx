'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookHeart,
  HeartHandshake,
  Home,
  LineChart,
  Settings2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { NavIconKey, NavItem } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

const ICONS: Record<NavIconKey, LucideIcon> = {
  home: Home,
  history: BarChart3,
  development: Sparkles,
  stats: LineChart,
  journal: BookHeart,
  pregnancy: HeartHandshake,
  more: Settings2,
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Hauptnavigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch">
        {items.map(({ href, label, icon }) => {
          const Icon = ICONS[icon]
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

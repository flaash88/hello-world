'use client'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme, type ThemeMode } from '@/components/theme-provider'

const ORDER: ThemeMode[] = ['auto', 'day', 'night']
const LABEL: Record<ThemeMode, string> = {
  auto: 'Automatisch',
  day: 'Tagmodus',
  night: 'Nachtmodus',
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const Icon = mode === 'auto' ? SunMoon : mode === 'day' ? Sun : Moon
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Ansicht: ${LABEL[mode]} – umschalten`}
      title={`Ansicht: ${LABEL[mode]}`}
      onClick={() => setMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]!)}
    >
      <Icon />
    </Button>
  )
}

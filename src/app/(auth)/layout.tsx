import { Sprout } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sprout className="size-8" aria-hidden />
          </span>
          <h1 className="font-display text-3xl font-bold">Sprössling</h1>
          <p className="text-sm text-muted-foreground">Unser kleines Familien-Logbuch.</p>
        </div>
        {children}
      </div>
    </main>
  )
}

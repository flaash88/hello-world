import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Anmelden' }

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/')
  return (
    <>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Einladungscode bekommen?{' '}
        <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          Konto anlegen
        </Link>
      </p>
    </>
  )
}

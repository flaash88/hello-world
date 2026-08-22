import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Konto anlegen' }

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/')
  return (
    <>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Schon ein Konto?{' '}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Anmelden
        </Link>
      </p>
    </>
  )
}

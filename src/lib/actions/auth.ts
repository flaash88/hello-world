'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSession, destroySession, getCurrentUser } from '@/lib/auth/session'
import { hashToken, normalizeInviteCode, generateInviteCode } from '@/lib/auth/tokens'
import { checkRateLimit, recordAttempt, clearAttempts } from '@/lib/auth/rate-limit'
import { initialsFrom } from '@/lib/utils'

export type ActionState = { error?: string; success?: string }

const USER_COLORS = ['#C0563A', '#3F6B8A', '#7A5C9E', '#417A5A', '#B5843C', '#A0455F']

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Bitte eine gültige E-Mail-Adresse eingeben.'),
  password: z.string().min(1, 'Bitte das Passwort eingeben.'),
})

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  }
  const { email, password } = parsed.data

  // 8 Versuche in 15 Minuten je E-Mail-Adresse.
  const limit = await checkRateLimit('login', email, 8, 900)
  if (!limit.allowed) {
    return {
      error: `Zu viele Fehlversuche. Bitte in ${Math.ceil(limit.retryAfterSec / 60)} Minuten erneut versuchen.`,
    }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  // Auch ohne Treffer hashen, damit die Antwortzeit nichts verraet.
  const digest = user?.passwordHash ?? '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000'
  const ok = await verifyPassword(digest, password)

  if (!user || !ok) {
    await recordAttempt('login', email)
    return { error: 'E-Mail-Adresse oder Passwort stimmt nicht.' }
  }

  await clearAttempts('login', email)
  await createSession(user.id)
  redirect('/')
}

const registerSchema = z
  .object({
    inviteCode: z.string().trim().min(1, 'Bitte den Einladungscode eingeben.'),
    email: z.string().trim().toLowerCase().email('Bitte eine gültige E-Mail-Adresse eingeben.'),
    displayName: z.string().trim().min(2, 'Bitte einen Namen mit mindestens 2 Zeichen eingeben.').max(40),
    password: z.string().min(10, 'Das Passwort braucht mindestens 10 Zeichen.').max(200),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Die beiden Passwörter stimmen nicht überein.',
    path: ['passwordConfirm'],
  })

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    inviteCode: formData.get('inviteCode'),
    email: formData.get('email'),
    displayName: formData.get('displayName'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  }
  const { inviteCode, email, displayName, password } = parsed.data

  const limit = await checkRateLimit('register', email, 5, 3600)
  if (!limit.allowed) {
    return { error: 'Zu viele Versuche. Bitte später erneut versuchen.' }
  }

  const invite = await prisma.invite.findUnique({
    where: { codeHash: hashToken(normalizeInviteCode(inviteCode)) },
  })
  if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) {
    await recordAttempt('register', email)
    return { error: 'Dieser Einladungscode ist ungültig oder bereits verbraucht.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'Für diese E-Mail-Adresse gibt es schon ein Konto.' }

  const memberCount = await prisma.user.count({ where: { householdId: invite.householdId } })
  const passwordHash = await hashPassword(password)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        householdId: invite.householdId,
        email,
        passwordHash,
        displayName,
        initials: initialsFrom(displayName),
        color: USER_COLORS[memberCount % USER_COLORS.length]!,
        role: memberCount === 0 ? 'admin' : 'parent',
        notificationPrefs: { create: {} },
      },
    })
    await tx.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedByEmail: email },
    })
    return created
  })

  await clearAttempts('register', email)
  await createSession(user.id)
  redirect('/onboarding')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/login')
}

/** Erzeugt einen Einladungscode fuer den zweiten Elternteil. */
export async function createInviteAction(label?: string): Promise<{ code: string }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht angemeldet')
  const code = generateInviteCode()
  await prisma.invite.create({
    data: {
      householdId: user.householdId,
      codeHash: hashToken(code),
      label: label?.slice(0, 60) ?? null,
      createdById: user.id,
      expiresAt: new Date(Date.now() + 14 * 86400000),
    },
  })
  return { code }
}

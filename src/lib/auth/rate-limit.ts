import 'server-only'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db'

export type RateLimitResult = { allowed: boolean; retryAfterSec: number }

function bucketKey(scope: string, identifier: string): string {
  return createHash('sha256').update(`${scope}:${identifier.toLowerCase()}`).digest('hex')
}

/**
 * Einfaches, in Postgres persistiertes Sliding-Window-Limit. Reicht fuer zwei
 * User voellig aus und ueberlebt Neustarts (anders als ein In-Memory-Zaehler).
 */
export async function checkRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const key = bucketKey(scope, identifier)
  const since = new Date(Date.now() - windowSec * 1000)

  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
  })

  const attempts = await prisma.loginAttempt.findMany({
    where: { key, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  })

  if (attempts.length >= limit) {
    const oldest = attempts[0]!.createdAt.getTime()
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowSec * 1000 - Date.now()) / 1000))
    return { allowed: false, retryAfterSec }
  }
  return { allowed: true, retryAfterSec: 0 }
}

export async function recordAttempt(scope: string, identifier: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { key: bucketKey(scope, identifier) } })
}

export async function clearAttempts(scope: string, identifier: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key: bucketKey(scope, identifier) } })
}

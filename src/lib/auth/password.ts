import { hash, verify } from '@node-rs/argon2'

/**
 * argon2id mit OWASP-Empfehlung (19 MiB, 2 Iterationen, 1 Thread).
 * Bewusst konservativ: laeuft auch auf einem kleinen LXC fluessig.
 */
const OPTIONS = {
  // Algorithm.Argon2id – als Literal, weil ambient const enums mit
  // isolatedModules nicht importierbar sind.
  algorithm: 2 as const,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

export async function verifyPassword(digest: string, password: string): Promise<boolean> {
  try {
    return await verify(digest, password, OPTIONS)
  } catch {
    return false
  }
}

import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

interface AdminSession {
  admin?: boolean
  at?: number
}

export async function adminSession(event: H3Event) {
  return useSession<AdminSession>(event, {
    name: 'mv_admin',
    password: await sessionSecret(),
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
      path: '/',
    },
  })
}

export async function isAdmin(event: H3Event): Promise<boolean> {
  const session = await adminSession(event)
  return session.data.admin === true
}

export async function requireAdmin(event: H3Event) {
  if (!(await isAdmin(event))) {
    throw createError({ statusCode: 401, statusMessage: 'Connexion requise' })
  }
}

export function configuredPassword(): string | null {
  const pwd = useRuntimeConfig().adminPassword
  if (pwd) return pwd
  return import.meta.dev ? 'admin' : null
}

export function passwordMatches(input: string): boolean {
  const expected = configuredPassword()
  if (!expected) return false
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/* Very small brute-force protection: 5 failures → 30s lock per IP. */
const failures = new Map<string, { count: number; until: number }>()

export function loginLocked(ip: string): number {
  const f = failures.get(ip)
  if (!f) return 0
  const left = f.until - Date.now()
  return left > 0 ? Math.ceil(left / 1000) : 0
}

export function registerFailure(ip: string) {
  const f = failures.get(ip) || { count: 0, until: 0 }
  f.count++
  if (f.count >= 5) {
    f.until = Date.now() + 30_000
    f.count = 0
  }
  failures.set(ip, f)
}

export function clearFailures(ip: string) {
  failures.delete(ip)
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'local'
  const wait = loginLocked(ip)
  if (wait) throw createError({ statusCode: 429, statusMessage: `Trop d'essais, réessaie dans ${wait}s` })

  if (!configuredPassword()) {
    throw createError({ statusCode: 503, statusMessage: 'Définis NUXT_ADMIN_PASSWORD dans le fichier .env' })
  }
  const body = await readBody<{ password?: string }>(event)
  if (!passwordMatches(String(body?.password || ''))) {
    registerFailure(ip)
    await new Promise((r) => setTimeout(r, 400))
    throw createError({ statusCode: 401, statusMessage: 'Mot de passe incorrect' })
  }
  clearFailures(ip)
  const session = await adminSession(event)
  await session.update({ admin: true, at: Date.now() })
  return { ok: true }
})

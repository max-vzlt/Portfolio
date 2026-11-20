import type { Lang } from '#shared/types'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ texts: string[]; from: Lang; to: Lang }>(event)
  const from: Lang = body?.from === 'en' ? 'en' : 'fr'
  const to: Lang = body?.to === 'fr' ? 'fr' : 'en'
  const texts = Array.isArray(body?.texts) ? body.texts.slice(0, 200).map((t) => String(t ?? '').slice(0, 20000)) : []
  if (from === to) return { texts, provider: translationProvider() }
  try {
    return { texts: await translateTexts(texts, from, to), provider: translationProvider() }
  } catch (err: any) {
    console.error('[translate]', err?.message || err)
    throw createError({
      statusCode: 502,
      statusMessage: err?.statusMessage || `Traduction impossible (${translationProvider()}) : vérifie la connexion ou la clé API`,
    })
  }
})

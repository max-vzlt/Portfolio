export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<any>(event)
  return mutateDB((db) => {
    const m = db.media.find((x) => x.id === id)
    if (!m) throw createError({ statusCode: 404, statusMessage: 'Média introuvable' })
    if (body?.alt) m.alt = i18n(body.alt, 300)
    return toPublicMedia(m)
  })
})

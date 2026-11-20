export default defineEventHandler(async (event) => {
  const { ids } = await readBody<{ ids: string[] }>(event)
  if (!Array.isArray(ids)) throw createError({ statusCode: 400, statusMessage: 'ids manquants' })
  await mutateDB((db) => {
    db.projects.forEach((p) => {
      const i = ids.indexOf(p.id)
      p.order = i < 0 ? ids.length + p.order : i
    })
    db.projects.sort((a, b) => a.order - b.order).forEach((p, i) => (p.order = i))
  })
  return { ok: true }
})

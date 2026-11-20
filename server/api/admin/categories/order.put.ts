export default defineEventHandler(async (event) => {
  const { ids } = await readBody<{ ids: string[] }>(event)
  if (!Array.isArray(ids)) throw createError({ statusCode: 400, statusMessage: 'ids manquants' })
  await mutateDB((db) => {
    db.categories.forEach((c) => {
      const i = ids.indexOf(c.id)
      c.order = i < 0 ? ids.length + c.order : i
    })
    db.categories.sort((a, b) => a.order - b.order).forEach((c, i) => (c.order = i))
  })
  return { ok: true }
})

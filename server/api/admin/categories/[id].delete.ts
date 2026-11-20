export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  await mutateDB((db) => {
    db.categories = db.categories.filter((c) => c.id !== id)
    db.categories.forEach((c, i) => (c.order = i))
    for (const p of db.projects) p.categoryIds = p.categoryIds.filter((c) => c !== id)
  })
  return { ok: true }
})

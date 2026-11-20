export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<any>(event)
  return mutateDB((db) => {
    const i = db.categories.findIndex((c) => c.id === id)
    if (i < 0) throw createError({ statusCode: 404, statusMessage: 'Catégorie introuvable' })
    db.categories[i] = sanitizeCategory(db, body, db.categories[i])
    return db.categories[i]
  })
})

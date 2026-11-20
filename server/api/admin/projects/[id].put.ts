export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<any>(event)
  return mutateDB((db) => {
    const i = db.projects.findIndex((p) => p.id === id)
    if (i < 0) throw createError({ statusCode: 404, statusMessage: 'Trace introuvable' })
    const updated = sanitizeProject(db, body, db.projects[i]!)
    db.projects[i] = updated
    normalizeRanks(db)
    return updated
  })
})

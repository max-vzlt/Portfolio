export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<any>(event)
  const updated = await mutateDB((db) => {
    const i = db.projects.findIndex((p) => p.id === id)
    if (i < 0) throw createError({ statusCode: 404, statusMessage: 'Trace introuvable' })
    const next = sanitizeProject(db, body, db.projects[i]!)
    db.projects[i] = next
    normalizeRanks(db)
    return next
  })
  if (updated.visible) void notifyContentChange([updated.slug])
  return updated
})

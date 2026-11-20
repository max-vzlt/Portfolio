export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  await mutateDB((db) => {
    const before = db.projects.length
    db.projects = db.projects.filter((p) => p.id !== id)
    if (db.projects.length === before) throw createError({ statusCode: 404, statusMessage: 'Trace introuvable' })
  })
  return { ok: true }
})

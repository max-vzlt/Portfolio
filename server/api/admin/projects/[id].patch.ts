// Quick partial update from the list (visibility toggle…)
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<any>(event)
  return mutateDB((db) => {
    const p = db.projects.find((x) => x.id === id)
    if (!p) throw createError({ statusCode: 404, statusMessage: 'Trace introuvable' })
    if (typeof body?.visible === 'boolean') p.visible = body.visible
    p.updatedAt = new Date().toISOString()
    return p
  })
})

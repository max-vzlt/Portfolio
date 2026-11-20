// Quick partial update from the list (visibility toggle…)
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<any>(event)
  return mutateDB((db) => {
    const p = db.projects.find((x) => x.id === id)
    if (!p) throw createError({ statusCode: 404, statusMessage: 'Trace introuvable' })
    if (typeof body?.visible === 'boolean') p.visible = body.visible
    if (typeof body?.featured === 'boolean' && body.featured !== p.featured) {
      p.featured = body.featured
      p.featuredRank = 0 // new highlights go to the end of the ranking
    }
    normalizeRanks(db)
    p.updatedAt = new Date().toISOString()
    return p
  })
})

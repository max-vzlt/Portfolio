// Ranking of the highlighted projects: { ids } in order (1st = best).
// Projects not in the list stop being highlighted.
export default defineEventHandler(async (event) => {
  const { ids } = await readBody<{ ids: string[] }>(event)
  if (!Array.isArray(ids)) throw createError({ statusCode: 400, statusMessage: 'ids manquants' })
  const ids2 = await mutateDB((db) => {
    for (const p of db.projects) {
      const i = ids.indexOf(p.id)
      p.featured = i >= 0
      p.featuredRank = i >= 0 ? i + 1 : 0
    }
    normalizeRanks(db)
    return db.projects.filter((p) => p.featured).sort((a, b) => a.featuredRank - b.featuredRank).map((p) => p.id)
  })
  void notifyContentChange()
  return ids2
})

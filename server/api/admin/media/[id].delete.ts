// Deleting a media also removes it from every place that uses it.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await mutateDB((db) => {
    if (!db.media.some((m) => m.id === id)) throw createError({ statusCode: 404, statusMessage: 'Média introuvable' })
    db.media = db.media.filter((m) => m.id !== id)
    const s = db.settings
    if (s.hero.imageId === id) s.hero.imageId = null
    if (s.about.imageId === id) s.about.imageId = null
    if (s.cvId === id) s.cvId = null
    for (const p of db.projects) {
      if (p.coverId === id) p.coverId = null
      for (const b of p.blocks) if (b.mediaId === id) b.mediaId = null
    }
  })
  await removeMediaFiles(id)
  return { ok: true }
})

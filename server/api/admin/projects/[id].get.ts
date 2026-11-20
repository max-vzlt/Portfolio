export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = await getDB()
  const project = db.projects.find((p) => p.id === id)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Trace introuvable' })
  return {
    project,
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    media: mediaMapFor(db, [project.coverId, ...project.blocks.map((b) => b.mediaId)], true),
  }
})

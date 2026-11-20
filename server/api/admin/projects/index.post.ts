// Creates a project. Optional body: { title, mediaIds } — when images are dropped
// on "Nouvelle trace", they become the cover + image blocks right away.
export default defineEventHandler(async (event) => {
  const body = (await readBody<any>(event).catch(() => null)) || {}
  return mutateDB((db) => {
    const project = blankProject(db, body.title)
    const ids: string[] = Array.isArray(body.mediaIds)
      ? body.mediaIds.filter((id: unknown) => db.media.some((m) => m.id === id))
      : []
    const images = ids.filter((id) => db.media.find((m) => m.id === id)?.kind === 'image')
    project.coverId = images[0] || null
    project.blocks = ids.map((id) => sanitizeBlock(db, {
      type: db.media.find((m) => m.id === id)?.kind === 'video' ? 'video' : 'image',
      mediaId: id, col: 1, row: 1,
    }))
    project.blocks.unshift(sanitizeBlock(db, { type: 'text', col: 2, row: 1, variant: 'lead', text: { fr: '', en: '' } }))
    db.projects.push(project)
    return project
  })
})

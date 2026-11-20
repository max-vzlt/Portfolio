export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return mutateDB((db) => {
    const src = db.projects.find((p) => p.id === id)
    if (!src) throw createError({ statusCode: 404, statusMessage: 'Trace introuvable' })
    const copy = structuredClone(src)
    copy.id = newId('p')
    copy.title = { fr: `${src.title.fr} (copie)`, en: src.title.en ? `${src.title.en} (copy)` : '' }
    copy.slug = uniqueSlug(copy.title.fr, db.projects.map((p) => p.slug))
    copy.visible = false
    copy.blocks = copy.blocks.map((b) => ({ ...b, id: newId('b') }))
    copy.order = src.order + 0.5
    copy.createdAt = copy.updatedAt = new Date().toISOString()
    db.projects.push(copy)
    db.projects.sort((a, b) => a.order - b.order).forEach((p, i) => (p.order = i))
    return copy
  })
})

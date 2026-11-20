import type { ProjectPayload } from '#shared/types'

export default defineEventHandler(async (event): Promise<ProjectPayload> => {
  const slug = getRouterParam(event, 'slug')
  const preview = getQuery(event).preview !== undefined && (await isAdmin(event))
  const db = await getDB()
  const list = db.projects.filter((p) => p.visible || preview).sort((a, b) => a.order - b.order)
  const i = list.findIndex((p) => p.slug === slug)
  const found = list[i]
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Projet introuvable' })

  const project = { ...found, blocks: found.blocks.filter((b) => b.visible) }
  const visible = list.filter((p) => p.visible)
  const vi = visible.findIndex((p) => p.id === found.id)
  const prevP = vi > 0 ? visible[vi - 1] : visible.length > 1 ? visible[visible.length - 1] : null
  const nextP = vi >= 0 && vi < visible.length - 1 ? visible[vi + 1] : visible.length > 1 ? visible[0] : null
  const prev = prevP && prevP.id !== found.id ? { slug: prevP.slug, title: prevP.title } : null
  const next = nextP && nextP.id !== found.id
    ? { slug: nextP.slug, title: nextP.title, coverId: nextP.coverId, coverEffect: nextP.coverEffect }
    : null

  return {
    project,
    categories: db.categories,
    media: mediaMapFor(db, [project.coverId, next?.coverId, ...project.blocks.map((b) => b.mediaId)]),
    prev,
    next,
  }
})

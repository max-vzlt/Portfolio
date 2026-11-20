import type { ProjectCard, SitePayload } from '#shared/types'

export default defineEventHandler(async (): Promise<SitePayload> => {
  const db = await getDB()
  const projects: ProjectCard[] = db.projects
    .filter((p) => p.visible)
    .sort((a, b) => a.order - b.order)
    .map((p) => ({
      id: p.id, slug: p.slug, title: p.title, summary: p.summary, categoryIds: p.categoryIds,
      year: p.year, tools: p.tools, coverId: p.coverId, coverEffect: p.coverEffect, card: p.card,
    }))
  const s = db.settings
  return {
    settings: s,
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    projects,
    media: mediaMapFor(db, [s.hero.imageId, s.about.imageId, s.cvId, ...projects.map((p) => p.coverId)]),
  }
})

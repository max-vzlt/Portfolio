// Text version of every public page for AI tools: /work/<slug>.md, /en/work/<slug>.md, /index.md, /en/index.md
export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]!
  if (!path.endsWith('.md')) return
  const m = /^\/(en\/)?(?:work\/([^/]+)|index)\.md$/.exec(path)
  if (!m) return
  const lang = m[1] ? 'en' : 'fr'
  const db = await getDB()
  const origin = siteOrigin(event)
  if (!m[2]) return sendMarkdown(event, siteMarkdown(db, lang, origin, false))
  const project = visibleProjects(db).find((p) => p.slug === decodeURIComponent(m[2]!))
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projet introuvable' })
  return sendMarkdown(event, `${projectMarkdown(db, project, lang, origin)}\n`)
})

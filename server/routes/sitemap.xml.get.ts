/**
 * Sitemap with language alternates (hreflang), last modification dates and images,
 * so search engines index both languages and the project pictures.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default defineEventHandler(async (event) => {
  const db = await getDB()
  const origin = siteOrigin(event)
  const projects = visibleProjects(db)
  const lastHome = [...projects.map((p) => p.updatedAt)].sort().pop()
  const img = (id?: string | null, title?: string) => {
    const m = id ? db.media.find((x) => x.id === id) : null
    if (!m || m.kind !== 'image') return ''
    return `<image:image><image:loc>${esc(origin + toPublicMedia(m).url)}</image:loc>${title ? `<image:title>${esc(title)}</image:title>` : ''}</image:image>`
  }
  const entry = (path: string, images: string, lastmod?: string) => {
    const fr = origin + (path || '/')
    const en = `${origin}/en${path}`
    const alts = `<xhtml:link rel="alternate" hreflang="fr" href="${esc(fr)}"/><xhtml:link rel="alternate" hreflang="en" href="${esc(en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${esc(fr)}"/>`
    const mod = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''
    return [fr, en].map((loc) => `  <url><loc>${esc(loc)}</loc>${mod}${alts}${images}</url>`).join('\n')
  }
  const urls = [
    entry('', img(db.settings.hero.imageId) + img(db.settings.about.imageId, db.settings.name), lastHome),
    ...projects.map((p) => entry(
      `/work/${p.slug}`,
      [p.coverId, ...p.blocks.filter((b) => b.type === 'image').map((b) => b.mediaId)].slice(0, 20).map((id) => img(id, p.title.fr)).join(''),
      p.updatedAt,
    )),
  ]
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`
})

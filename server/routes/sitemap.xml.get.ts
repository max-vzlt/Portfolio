export default defineEventHandler(async (event) => {
  const db = await getDB()
  const origin = (useRuntimeConfig().public.siteUrl || getRequestURL(event).origin).replace(/\/$/, '')
  const paths = ['/', ...db.projects.filter((p) => p.visible).map((p) => `/work/${p.slug}`)]
  const urls = paths.flatMap((p) => [p, p === '/' ? '/en' : `/en${p}`])
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
})

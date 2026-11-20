// Stable address of the current CV (/cv), whatever file is uploaded in the back-office.
// Old links (e.g. "/CV - Verzeletti Maxime.pdf") can be redirected here by the web server.
export default defineEventHandler(async (event) => {
  const db = await getDB()
  const m = db.settings.cvId ? db.media.find((x) => x.id === db.settings.cvId) : null
  if (!m) throw createError({ statusCode: 404, statusMessage: 'Aucun CV en ligne' })
  return sendRedirect(event, toPublicMedia(m).url, 302)
})

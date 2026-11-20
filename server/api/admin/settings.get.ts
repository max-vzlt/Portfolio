export default defineEventHandler(async () => {
  const db = await getDB()
  const s = db.settings
  return { settings: s, media: mediaMapFor(db, [s.hero.imageId, s.about.imageId, s.cvId], true) }
})

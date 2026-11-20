export default defineEventHandler(async () => {
  const db = await getDB()
  return [...db.media]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((m) => ({ ...toPublicMedia(m), originalName: m.originalName, size: m.size, createdAt: m.createdAt, usage: mediaUsage(db, m.id) }))
})

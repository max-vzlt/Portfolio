export default defineEventHandler(async () => {
  const db = await getDB()
  return {
    projects: [...db.projects].sort((a, b) => a.order - b.order),
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    media: mediaMapFor(db, db.projects.map((p) => p.coverId), true),
  }
})

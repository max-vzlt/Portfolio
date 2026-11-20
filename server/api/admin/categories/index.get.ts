export default defineEventHandler(async () => {
  const db = await getDB()
  return [...db.categories].sort((a, b) => a.order - b.order).map((c) => ({
    ...c,
    count: db.projects.filter((p) => p.categoryIds.includes(c.id)).length,
  }))
})

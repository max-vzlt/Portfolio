export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  return mutateDB((db) => {
    const cat = sanitizeCategory(db, body)
    db.categories.push(cat)
    return cat
  })
})

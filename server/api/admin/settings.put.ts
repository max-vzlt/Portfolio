export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  return mutateDB((db) => {
    db.settings = sanitizeSettings(db, body, db.settings)
    return db.settings
  })
})

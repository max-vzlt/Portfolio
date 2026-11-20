export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const out = await mutateDB((db) => {
    db.settings = sanitizeSettings(db, body, db.settings)
    return db.settings
  })
  void notifyContentChange()
  return out
})

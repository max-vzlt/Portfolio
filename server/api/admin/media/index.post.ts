// multipart/form-data upload, field name "file" (several files allowed)
export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const files = (parts || []).filter((p) => p.filename && p.data?.length)
  if (!files.length) throw createError({ statusCode: 400, statusMessage: 'Aucun fichier reçu' })
  const stored = []
  for (const f of files) stored.push(await storeUpload({ filename: f.filename!, type: f.type, data: f.data }))
  await mutateDB((db) => {
    db.media.push(...stored)
  })
  return stored.map((m) => ({ ...toPublicMedia(m), originalName: m.originalName, size: m.size, createdAt: m.createdAt, usage: [] }))
})

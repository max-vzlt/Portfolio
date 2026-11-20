// Serves the IndexNow key file (/<key>.txt) that proves the site owns the key.
export default defineEventHandler(async (event) => {
  const m = /^\/([a-f0-9]{32})\.txt$/.exec(event.path.split('?')[0]!)
  if (!m) return
  const key = await indexNowKey()
  if (m[1] !== key) return
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return key
})

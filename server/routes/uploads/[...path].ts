import { createReadStream, promises as fs } from 'node:fs'
import { join, normalize, extname, sep } from 'node:path'

// Serves uploaded media with long cache + HTTP Range (needed to seek in videos).
export default defineEventHandler(async (event) => {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') {
    setResponseHeader(event, 'Allow', 'GET, HEAD')
    throw createError({ statusCode: 405 })
  }
  const rel = normalize(getRouterParam(event, 'path') || '')
  const root = uploadsDir()
  const file = join(root, rel)
  if (!file.startsWith(root + sep) || rel.includes('..')) throw createError({ statusCode: 400 })

  const stat = await fs.stat(file).catch(() => null)
  if (!stat?.isFile()) throw createError({ statusCode: 404, statusMessage: 'Fichier introuvable' })

  const type = MIME_BY_EXT[extname(file).toLowerCase()] || 'application/octet-stream'
  setResponseHeaders(event, {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    // Uploaded SVG/PDF can never run scripts in the site's origin
    'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; media-src 'self'; sandbox",
  })

  const range = getRequestHeader(event, 'range')
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    let start = m?.[1] ? Number(m[1]) : 0
    let end = m?.[2] ? Number(m[2]) : stat.size - 1
    if (!m?.[1] && m?.[2]) {
      start = Math.max(0, stat.size - Number(m[2]))
      end = stat.size - 1
    }
    if (start >= stat.size || end >= stat.size || start > end) {
      setResponseStatus(event, 416)
      setResponseHeader(event, 'Content-Range', `bytes */${stat.size}`)
      return ''
    }
    setResponseStatus(event, 206)
    setResponseHeaders(event, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': String(end - start + 1) })
    if (method === 'HEAD') return event.node.res.end()
    return sendStream(event, createReadStream(file, { start, end }))
  }
  setResponseHeader(event, 'Content-Length', String(stat.size))
  if (method === 'HEAD') return event.node.res.end()
  return sendStream(event, createReadStream(file))
})

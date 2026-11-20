import { promises as fs } from 'node:fs'
import { join, extname } from 'node:path'
import sharp from 'sharp'
import type { Database, Media, MediaKind, MediaMap, PublicMedia } from '#shared/types'

const RASTER = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff']
const PASSTHROUGH_IMAGES = ['image/gif', 'image/svg+xml']
const VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime']
const FILES = ['application/pdf']

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.avif': 'image/avif', '.tif': 'image/tiff', '.tiff': 'image/tiff', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm',
  '.mov': 'video/quicktime', '.pdf': 'application/pdf',
}
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif',
  'image/tiff': '.tif', 'image/gif': '.gif', 'image/svg+xml': '.svg', 'video/mp4': '.mp4',
  'video/webm': '.webm', 'video/quicktime': '.mov', 'application/pdf': '.pdf',
}
export const MIME_BY_EXT = EXT_MIME

const WIDTHS = [480, 960, 1600, 2400]

export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024

function detectMime(name: string, declared?: string): string | null {
  const byExt = EXT_MIME[extname(name).toLowerCase()]
  const all = [...RASTER, ...PASSTHROUGH_IMAGES, ...VIDEOS, ...FILES]
  if (declared && all.includes(declared)) return declared
  return byExt || null
}

function kindOf(mime: string): MediaKind {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'file'
}

/** Stores an uploaded file, generates responsive webp variants for images. */
export async function storeUpload(input: { filename: string; type?: string; data: Buffer }): Promise<Media> {
  const mime = detectMime(input.filename, input.type)
  if (!mime) {
    throw createError({ statusCode: 415, statusMessage: `Format non supporté : ${input.filename}` })
  }
  if (input.data.length > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Fichier trop lourd (300 Mo max)' })
  }
  const id = newId('m')
  const dir = join(uploadsDir(), id)
  await fs.mkdir(dir, { recursive: true })
  const file = `original${MIME_EXT[mime]}`

  const media: Media = {
    id,
    kind: kindOf(mime),
    mime,
    file,
    originalName: input.filename.slice(0, 200),
    size: input.data.length,
    alt: { fr: '', en: '' },
    createdAt: new Date().toISOString(),
  }

  try {
    if (RASTER.includes(mime)) {
      const img = sharp(input.data, { failOn: 'error' }).rotate()
      const meta = await img.metadata()
      // Width/height after EXIF rotation
      const rotated = (meta.orientation ?? 1) >= 5
      const width = (rotated ? meta.height : meta.width) || 0
      const height = (rotated ? meta.width : meta.height) || 0
      if (!width || !height) throw new Error('invalid image')
      media.width = width
      media.height = height
      await fs.writeFile(join(dir, file), input.data)
      const targets = WIDTHS.filter((w) => w < width)
      targets.push(Math.min(width, 2880))
      media.variants = []
      for (const w of [...new Set(targets)]) {
        const name = `w${w}.webp`
        const info = await sharp(input.data).rotate().resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 88, smartSubsample: true, effort: 4 }).toFile(join(dir, name))
        media.variants.push({ width: info.width, height: info.height, file: name })
      }
    } else if (PASSTHROUGH_IMAGES.includes(mime)) {
      const meta = await sharp(input.data, { animated: true }).metadata().catch(() => null)
      if (meta?.width) {
        media.width = meta.width
        media.height = meta.pageHeight || meta.height
      }
      await fs.writeFile(join(dir, file), input.data)
    } else {
      await fs.writeFile(join(dir, file), input.data)
    }
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true })
    if ((err as any)?.statusCode) throw err
    throw createError({ statusCode: 422, statusMessage: `Image illisible : ${input.filename}` })
  }
  return media
}

export async function removeMediaFiles(id: string) {
  if (!/^m_[A-Za-z0-9]+$/.test(id)) return
  await fs.rm(join(uploadsDir(), id), { recursive: true, force: true })
}

export function toPublicMedia(m: Media): PublicMedia {
  const base = `/uploads/${m.id}/`
  const out: PublicMedia = {
    id: m.id,
    kind: m.kind,
    mime: m.mime,
    url: base + m.file,
    width: m.width,
    height: m.height,
    alt: m.alt,
  }
  if (m.variants?.length) {
    const sorted = [...m.variants].sort((a, b) => a.width - b.width)
    out.url = base + sorted[sorted.length - 1]!.file
    out.srcset = sorted.map((v) => `${base}${v.file} ${v.width}w`).join(', ')
  }
  return out
}

export function mediaMapFor(db: Database, ids: Array<string | null | undefined>, admin = false): MediaMap {
  const wanted = new Set(ids.filter(Boolean) as string[])
  const map: MediaMap = {}
  for (const m of db.media) {
    if (!wanted.has(m.id)) continue
    map[m.id] = admin ? ({ ...toPublicMedia(m), originalName: m.originalName, size: m.size } as PublicMedia) : toPublicMedia(m)
  }
  return map
}

/** Every place a media is used (to warn before deleting it). */
export function mediaUsage(db: Database, id: string): string[] {
  const uses: string[] = []
  const s = db.settings
  if (s.hero.imageId === id) uses.push('Accueil (image principale)')
  if (s.about.imageId === id) uses.push('À propos (portrait)')
  if (s.cvId === id) uses.push('CV')
  for (const p of db.projects) {
    if (p.coverId === id || p.blocks.some((b) => b.mediaId === id)) uses.push(`Trace « ${p.title.fr || p.slug} »`)
  }
  return uses
}

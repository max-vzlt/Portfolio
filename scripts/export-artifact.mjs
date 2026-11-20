#!/usr/bin/env node
/**
 * Exports a static, self-contained preview of the public site (for a claude.ai
 * Artifact): .artifact/portfolio.html + .artifact/media/* + .artifact/paper.png
 *
 *   node scripts/export-artifact.mjs
 *
 * Content comes from data/db.json (or seed/db.json when data/ does not exist):
 * visible projects and blocks only. The back-office is not part of the export.
 */
import { promises as fs, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('.')
const OUT = join(ROOT, '.artifact')
const SRC = existsSync(join(ROOT, 'data/db.json')) ? join(ROOT, 'data') : join(ROOT, 'seed')
const CV_URL = 'https://mverzeletti.com/CV%20-%20Verzeletti%20Maxime.pdf'
const ICON_NAMES = [
  'layout-grid', 'user-round', 'sparkles', 'mail', 'download', 'arrow-up-right', 'arrow-left', 'arrow-right',
  'arrow-down', 'arrow-up', 'x', 'play', 'maximize-2', 'linkedin', 'github', 'instagram', 'globe',
]

async function icons() {
  const out = {}
  for (const name of ICON_NAMES) {
    const src = await fs.readFile(join(ROOT, 'node_modules/lucide-vue-next/dist/esm/icons', `${name}.js`), 'utf8')
    const m = /createLucideIcon\("[^"]+",\s*(\[[\s\S]*?\])\);/.exec(src)
    if (!m) throw new Error(`icon ${name} not found`)
    const nodes = new Function(`return ${m[1]}`)()
    const inner = nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('')
    out[name] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  }
  return out
}

async function main() {
  const db = JSON.parse(await fs.readFile(join(SRC, 'db.json'), 'utf8'))
  await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(join(OUT, 'media'), { recursive: true })

  // same order as the site: highlighted projects first (by rank), then the others
  const visible = db.projects.filter((p) => p.visible)
  const projects = [
    ...visible.filter((p) => p.featured).sort((a, b) => a.featuredRank - b.featuredRank),
    ...visible.filter((p) => !p.featured).sort((a, b) => a.order - b.order),
  ].map((p) => ({ ...p, rank: p.featured ? p.featuredRank : 0, blocks: p.blocks.filter((b) => b.visible) }))
  const s = db.settings
  const wanted = new Set([s.hero.imageId, s.about.imageId, ...projects.flatMap((p) => [p.coverId, ...p.blocks.map((b) => b.mediaId)])].filter(Boolean))

  const media = {}
  let bytes = 0
  const copy = async (m, file) => {
    const from = join(SRC, 'uploads', m.id, file)
    const name = `${m.id}-${file}`
    await fs.copyFile(from, join(OUT, 'media', name))
    bytes += (await fs.stat(from)).size
    return `media/${name}`
  }
  for (const m of db.media) {
    if (!wanted.has(m.id)) continue
    const entry = { id: m.id, kind: m.kind, mime: m.mime, alt: m.alt, width: m.width, height: m.height }
    if (m.variants?.length) {
      const sorted = [...m.variants].sort((a, b) => a.width - b.width)
      const small = [...sorted].reverse().find((v) => v.width <= 960) || sorted[0]
      const large = [...sorted].reverse().find((v) => v.width <= 1600) || sorted[sorted.length - 1]
      const picks = small.file === large.file ? [large] : [small, large]
      const urls = []
      for (const v of picks) urls.push(`${await copy(m, v.file)} ${v.width}w`)
      entry.url = urls[urls.length - 1].split(' ')[0]
      entry.srcset = urls.join(', ')
    } else {
      entry.url = await copy(m, m.file)
    }
    media[m.id] = entry
  }
  await fs.copyFile(join(ROOT, 'public/textures/paper.png'), join(OUT, 'paper.png'))

  const data = {
    settings: s,
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    projects,
    media,
    cvUrl: s.cvId ? CV_URL : null,
  }
  const template = await fs.readFile(join(ROOT, 'artifact/portfolio.template.html'), 'utf8')
  const html = template
    .replace('/*__DATA__*/', JSON.stringify(data).replace(/</g, '\\u003c'))
    .replace('/*__ICONS__*/', JSON.stringify(await icons()))
  await fs.writeFile(join(OUT, 'portfolio.html'), html)

  const files = (await fs.readdir(join(OUT, 'media'))).length
  console.log(`Artifact exported to ${OUT}: ${projects.length} projects, ${files} media files (${(bytes / 1e6).toFixed(1)} MB), page ${(html.length / 1e3).toFixed(0)} KB`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

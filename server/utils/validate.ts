import {
  HOME_SECTIONS,
  type Block, type BlockType, type Category, type Database, type HomeSectionId, type HomeSettings,
  type I18nText, type ImageEffect, type Project, type Settings,
} from '#shared/types'

const str = (v: unknown, max = 20000) => (typeof v === 'string' ? v : '').slice(0, max)
const bool = (v: unknown, d = false) => (typeof v === 'boolean' ? v : d)
const clampInt = (v: unknown, min: number, max: number, d: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d
}
export const i18n = (v: any, max = 20000): I18nText => ({ fr: str(v?.fr, max), en: str(v?.en, max) })
const effect = (v: unknown, d: ImageEffect = 'none'): ImageEffect =>
  v === 'none' || v === 'duotone' || v === 'dots' ? v : d

const BLOCK_TYPES: BlockType[] = ['heading', 'text', 'image', 'video', 'link', 'quote', 'divider']

function mediaRef(db: Database, v: unknown): string | null {
  return typeof v === 'string' && db.media.some((m) => m.id === v) ? v : null
}

function cleanUrl(v: unknown): string {
  const u = str(v, 2000).trim()
  if (!u) return ''
  if (/^(https?:|mailto:|tel:)/i.test(u) || u.startsWith('/')) return u
  return `https://${u.replace(/^\/+/, '')}`
}

export function sanitizeBlock(db: Database, raw: any): Block {
  const type: BlockType = BLOCK_TYPES.includes(raw?.type) ? raw.type : 'text'
  const b: Block = {
    id: typeof raw?.id === 'string' && /^[\w-]{3,40}$/.test(raw.id) ? raw.id : newId('b'),
    type,
    col: clampInt(raw?.col, 1, 3, 3) as Block['col'],
    row: clampInt(raw?.row, 1, 4, 1) as Block['row'],
    visible: bool(raw?.visible, true),
  }
  switch (type) {
    case 'heading':
      b.text = i18n(raw?.text, 300)
      b.level = raw?.level === 3 ? 3 : 2
      break
    case 'text':
      b.text = i18n(raw?.text)
      b.variant = raw?.variant === 'lead' ? 'lead' : 'body'
      break
    case 'quote':
      b.text = i18n(raw?.text, 2000)
      break
    case 'link':
      b.text = i18n(raw?.text, 200)
      b.url = cleanUrl(raw?.url)
      break
    case 'image':
    case 'video':
      b.mediaId = mediaRef(db, raw?.mediaId)
      b.effect = effect(raw?.effect, type === 'image' ? 'duotone' : 'none')
      if (type === 'video' && b.effect === 'dots') b.effect = 'duotone'
      b.fit = raw?.fit === 'contain' ? 'contain' : 'cover'
      b.caption = i18n(raw?.caption, 500)
      if (type === 'video') b.autoplay = bool(raw?.autoplay, false)
      break
    case 'divider':
      break
  }
  return b
}

export function sanitizeProject(db: Database, raw: any, current: Project): Project {
  const takenSlugs = db.projects.filter((p) => p.id !== current.id).map((p) => p.slug)
  const title = i18n(raw?.title ?? current.title, 200)
  const wantedSlug = slugify(str(raw?.slug ?? current.slug, 100)) || slugify(title.fr) || current.slug
  const categoryIds = Array.isArray(raw?.categoryIds)
    ? [...new Set(raw.categoryIds.filter((id: unknown) => db.categories.some((c) => c.id === id)))] as string[]
    : current.categoryIds
  const tools = Array.isArray(raw?.tools)
    ? raw.tools.map((t: unknown) => str(t, 60).trim()).filter(Boolean).slice(0, 30)
    : current.tools
  return {
    ...current,
    slug: uniqueSlug(wantedSlug, takenSlugs),
    title,
    summary: i18n(raw?.summary ?? current.summary, 2000),
    categoryIds,
    year: str(raw?.year ?? current.year, 20),
    tools,
    coverId: raw && 'coverId' in raw ? mediaRef(db, raw.coverId) : current.coverId,
    coverEffect: effect(raw?.coverEffect ?? current.coverEffect, 'dots'),
    card: {
      col: clampInt(raw?.card?.col ?? current.card.col, 1, 3, 1) as Project['card']['col'],
      row: clampInt(raw?.card?.row ?? current.card.row, 1, 2, 1) as 1 | 2,
    },
    link: {
      url: cleanUrl(raw?.link?.url ?? current.link.url),
      label: i18n(raw?.link?.label ?? current.link.label, 200),
    },
    visible: bool(raw?.visible, current.visible),
    featured: bool(raw?.featured, current.featured),
    blocks: Array.isArray(raw?.blocks)
      ? raw.blocks.slice(0, 300).map((b: any) => sanitizeBlock(db, b))
      : current.blocks,
    updatedAt: new Date().toISOString(),
  }
}

export function blankProject(db: Database, title?: Partial<I18nText>): Project {
  const now = new Date().toISOString()
  const t = { fr: title?.fr || 'Nouvelle trace', en: title?.en || 'New project' }
  return {
    id: newId('p'),
    slug: uniqueSlug(t.fr, db.projects.map((p) => p.slug)),
    title: t,
    summary: { fr: '', en: '' },
    categoryIds: [],
    year: String(new Date().getFullYear()),
    tools: [],
    coverId: null,
    coverEffect: 'dots',
    card: { col: 1, row: 1 },
    link: { url: '', label: { fr: '', en: '' } },
    visible: false,
    featured: false,
    featuredRank: 0,
    order: db.projects.length ? Math.min(...db.projects.map((p) => p.order)) - 1 : 0,
    blocks: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function sanitizeCategory(db: Database, raw: any, current?: Category): Category {
  const name = i18n(raw?.name ?? current?.name, 80)
  if (!name.fr.trim() && !name.en.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Le nom de la catégorie est requis' })
  }
  const taken = db.categories.filter((c) => c.id !== current?.id).map((c) => c.slug)
  return {
    id: current?.id || newId('c'),
    slug: uniqueSlug(str(raw?.slug, 80) || name.fr || name.en, taken),
    name,
    order: current?.order ?? db.categories.length,
  }
}

export function sanitizeSettings(db: Database, raw: any, current: Settings): Settings {
  const r = raw || {}
  const list = <T>(v: unknown, map: (x: any) => T, max = 30): T[] =>
    Array.isArray(v) ? v.slice(0, max).map(map) : []
  return {
    name: str(r.name ?? current.name, 120),
    role: i18n(r.role ?? current.role, 200),
    hero: {
      kicker: i18n(r.hero?.kicker ?? current.hero.kicker, 120),
      title: i18n(r.hero?.title ?? current.hero.title, 300),
      intro: i18n(r.hero?.intro ?? current.hero.intro, 3000),
      imageId: r.hero && 'imageId' in r.hero ? mediaRef(db, r.hero.imageId) : current.hero.imageId,
      effect: effect(r.hero?.effect ?? current.hero.effect, 'dots'),
      tabs: r.hero?.tabs
        ? list(r.hero.tabs, (x) => ({ label: i18n(x?.label, 60), line: i18n(x?.line, 300) }), 6)
        : current.hero.tabs,
    },
    about: {
      title: i18n(r.about?.title ?? current.about.title, 200),
      body: i18n(r.about?.body ?? current.about.body),
      imageId: r.about && 'imageId' in r.about ? mediaRef(db, r.about.imageId) : current.about.imageId,
      effect: effect(r.about?.effect ?? current.about.effect, 'none'),
      facts: r.about?.facts
        ? list(r.about.facts, (x) => ({ label: i18n(x?.label, 80), value: i18n(x?.value, 400) }), 12)
        : current.about.facts,
    },
    skills: {
      title: i18n(r.skills?.title ?? current.skills.title, 200),
      groups: r.skills?.groups
        ? list(r.skills.groups, (g) => ({
          title: i18n(g?.title, 120),
          items: list(g?.items, (i) => str(i, 80).trim(), 60).filter(Boolean),
        }), 6)
        : current.skills.groups,
    },
    contact: {
      title: i18n(r.contact?.title ?? current.contact.title, 200),
      text: i18n(r.contact?.text ?? current.contact.text, 2000),
      email: str(r.contact?.email ?? current.contact.email, 200).trim(),
    },
    socials: r.socials
      ? list(r.socials, (s) => ({ label: str(s?.label, 60).trim(), url: cleanUrl(s?.url) }), 12)
        .filter((s) => s.label && s.url)
      : current.socials,
    cvId: 'cvId' in r ? mediaRef(db, r.cvId) : current.cvId,
    seo: { description: i18n(r.seo?.description ?? current.seo.description, 400) },
    home: sanitizeHome(r.home ?? current.home),
  }
}

/** Keeps every home section exactly once, in the given order. */
export function sanitizeHome(raw: any): HomeSettings {
  const base = defaultHome()
  const seen = new Set<HomeSectionId>()
  const sections: HomeSettings['sections'] = []
  for (const s of Array.isArray(raw?.sections) ? raw.sections : []) {
    if (HOME_SECTIONS.includes(s?.id) && !seen.has(s.id)) {
      seen.add(s.id)
      sections.push({ id: s.id, visible: bool(s.visible, true) })
    }
  }
  for (const id of HOME_SECTIONS) if (!seen.has(id)) sections.push({ id, visible: true })
  return {
    sections,
    work: {
      title: raw?.work?.title ? i18n(raw.work.title, 120) : base.work.title,
      intro: i18n(raw?.work?.intro, 2000),
      filters: bool(raw?.work?.filters, true),
    },
  }
}

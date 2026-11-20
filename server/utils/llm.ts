import type { H3Event } from 'h3'
import type { Database, I18nText, Lang, Project } from '#shared/types'

/**
 * Machine-readable versions of the site (llms.txt, Markdown pages), generated
 * from the back-office content. Rich texts are already Markdown-like
 * (**bold**, *italic*, [link](url), "- " lists), so they are kept as is.
 */

export function siteOrigin(event: H3Event): string {
  return (useRuntimeConfig().public.siteUrl || getRequestURL(event).origin).replace(/\/$/, '')
}

const T = {
  fr: {
    projects: 'Réalisations', contact: 'Contact', category: 'Catégorie', year: 'Année', tools: 'Outils',
    me: 'Moi', ai: "Avec l'IA", link: 'Lien', video: 'Vidéo', image: 'Image', page: 'Page', markdown: 'Version texte',
    other: 'English version', full: 'Tout le contenu en un fichier', highlight: 'Projet mis en avant', email: 'Email',
  },
  en: {
    projects: 'Selected work', contact: 'Contact', category: 'Category', year: 'Year', tools: 'Tools',
    me: 'Me', ai: 'With AI', link: 'Link', video: 'Video', image: 'Image', page: 'Page', markdown: 'Text version',
    other: 'Version française', full: 'All the content in one file', highlight: 'Highlighted project', email: 'Email',
  },
} as const

const pick = (v: I18nText | undefined | null, lang: Lang) => (!v ? '' : (v[lang]?.trim() ? v[lang] : v.fr || v.en || '')).trim()
const oneLine = (s: string) => s.replace(/\s*\n+\s*/g, ' ').trim()
const prefix = (lang: Lang) => (lang === 'en' ? '/en' : '')

export function visibleProjects(db: Database) {
  return publicOrder(db.projects).map((p) => ({ ...p, blocks: p.blocks.filter((b) => b.visible) }))
}

function mediaUrl(db: Database, origin: string, id?: string | null) {
  const m = id ? db.media.find((x) => x.id === id) : null
  return m ? origin + toPublicMedia(m).url : ''
}

function categoryNames(db: Database, p: Project, lang: Lang) {
  return p.categoryIds.map((id) => db.categories.find((c) => c.id === id)).filter(Boolean).map((c) => pick(c!.name, lang))
}

/** Markdown of one project page. */
export function projectMarkdown(db: Database, p: Project, lang: Lang, origin: string, level = 1): string {
  const t = T[lang]
  const h = (n: number) => '#'.repeat(Math.min(6, level + n - 1))
  const out: string[] = []
  out.push(`${h(1)} ${pick(p.title, lang)}`)
  const meta: string[] = []
  const cats = categoryNames(db, p, lang)
  if (p.featured) meta.push(`${t.highlight} (#${p.featuredRank})`)
  if (cats.length) meta.push(`${t.category} : ${cats.join(', ')}`)
  if (p.year) meta.push(`${t.year} : ${p.year}`)
  if (p.tools.length) meta.push(`${t.tools} : ${p.tools.join(', ')}`)
  meta.push(`${t.page} : ${origin}${prefix(lang)}/work/${p.slug}`)
  if (p.link.url) meta.push(`${pick(p.link.label, lang) || t.link} : ${p.link.url}`)
  out.push(meta.map((m) => `- ${m}`).join('\n'))
  const summary = pick(p.summary, lang)
  if (summary) out.push(`> ${oneLine(summary)}`)
  const cover = mediaUrl(db, origin, p.coverId)
  if (cover) out.push(`![${pick(db.media.find((m) => m.id === p.coverId)?.alt, lang) || pick(p.title, lang)}](${cover})`)

  for (const b of p.blocks) {
    const text = pick(b.text, lang)
    const caption = pick(b.caption, lang)
    switch (b.type) {
      case 'heading':
        if (text) out.push(`${h(b.level === 3 ? 3 : 2)} ${text}`)
        break
      case 'text':
        if (text) out.push(text)
        break
      case 'quote':
        if (text) out.push(text.split('\n').map((l) => `> ${l}`).join('\n'))
        break
      case 'link':
        if (b.url) out.push(`[${text || b.url}](${b.url})`)
        break
      case 'divider':
        out.push('---')
        break
      case 'image': {
        const url = mediaUrl(db, origin, b.mediaId)
        const alt = pick(db.media.find((m) => m.id === b.mediaId)?.alt, lang) || caption || t.image
        if (url) out.push(`![${alt}](${url})${caption ? `\n*${caption}*` : ''}`)
        break
      }
      case 'video': {
        const url = mediaUrl(db, origin, b.mediaId)
        if (url) out.push(`[${t.video}${caption ? ` : ${caption}` : ''}](${url})`)
        break
      }
    }
  }
  return out.join('\n\n')
}

/** Markdown of the whole site: home sections, then (full) every project. */
export function siteMarkdown(db: Database, lang: Lang, origin: string, full: boolean): string {
  const t = T[lang]
  const s = db.settings
  const other = lang === 'en' ? 'fr' : 'en'
  const llms = full ? 'llms-full.txt' : 'llms.txt'
  const out: string[] = []
  out.push(`# ${s.name} — ${pick(s.role, lang)}`)
  const summary = pick(s.seo.description, lang) || oneLine(pick(s.hero.intro, lang))
  if (summary) out.push(`> ${oneLine(summary)}`)
  if (pick(s.hero.intro, lang)) out.push(pick(s.hero.intro, lang))
  out.push(`- Site : ${origin}${prefix(lang) || '/'}\n- ${t.other} : ${origin}${prefix(other)}/${llms}${full ? '' : `\n- ${t.full} : ${origin}${prefix(lang)}/llms-full.txt`}`)

  const projects = visibleProjects(db)
  for (const sec of s.home.sections.filter((x) => x.visible)) {
    if (sec.id === 'work') {
      out.push(`## ${pick(s.home.work.title, lang) || t.projects}`)
      if (pick(s.home.work.intro, lang)) out.push(pick(s.home.work.intro, lang))
      out.push(projects.map((p) => {
        const cats = categoryNames(db, p, lang)
        const bits = [cats.join(', '), p.year, p.tools.join(', ')].filter(Boolean).join(' · ')
        return `- [${pick(p.title, lang)}](${origin}${prefix(lang)}/work/${p.slug}.md)${p.featured ? ' ★' : ''} : ${oneLine(pick(p.summary, lang))}${bits ? ` (${bits})` : ''}`
      }).join('\n'))
    } else if (sec.id === 'about') {
      out.push(`## ${pick(s.about.title, lang)}`)
      if (pick(s.about.body, lang)) out.push(pick(s.about.body, lang))
      const facts = s.about.facts.map((f) => `- ${pick(f.label, lang)} : ${pick(f.value, lang)}`).join('\n')
      if (facts) out.push(facts)
    } else if (sec.id === 'method') {
      out.push(`## ${pick(s.method.title, lang)}`)
      if (pick(s.method.intro, lang)) out.push(pick(s.method.intro, lang))
      s.method.steps.forEach((st, i) => {
        out.push(`### ${String(i + 1).padStart(2, '0')}. ${pick(st.title, lang)}\n- ${t.me} : ${oneLine(pick(st.me, lang))}\n- ${t.ai} : ${oneLine(pick(st.ai, lang))}${st.tools.length ? `\n- ${t.tools} : ${st.tools.join(', ')}` : ''}`)
      })
    } else if (sec.id === 'services') {
      out.push(`## ${pick(s.services.title, lang)}`)
      if (pick(s.services.intro, lang)) out.push(pick(s.services.intro, lang))
      out.push(s.services.items.map((it) => `- **${pick(it.title, lang)}** : ${oneLine(pick(it.text, lang))}${pick(it.ai, lang) ? ` ${t.ai} : ${oneLine(pick(it.ai, lang))}` : ''}`).join('\n'))
    } else if (sec.id === 'skills') {
      out.push(`## ${pick(s.skills.title, lang)}`)
      out.push(s.skills.groups.map((g) => `- ${pick(g.title, lang)} : ${g.items.join(', ')}`).join('\n'))
    } else if (sec.id === 'contact') {
      out.push(`## ${pick(s.contact.title, lang) || t.contact}`)
      if (pick(s.contact.text, lang)) out.push(pick(s.contact.text, lang))
      const lines = [s.contact.email ? `- ${t.email} : ${s.contact.email}` : '', ...s.socials.map((x) => `- ${x.label} : ${x.url}`)].filter(Boolean)
      if (lines.length) out.push(lines.join('\n'))
    }
  }

  if (full) {
    for (const p of projects) {
      out.push('---')
      out.push(projectMarkdown(db, p, lang, origin, 2))
    }
  }
  return `${out.join('\n\n')}\n`
}

export function sendMarkdown(event: H3Event, body: string, type = 'text/markdown') {
  setResponseHeaders(event, {
    'Content-Type': `${type}; charset=utf-8`,
    'Cache-Control': 'public, max-age=300',
    'X-Robots-Tag': 'noindex', // the HTML pages are the ones to index
  })
  return body
}

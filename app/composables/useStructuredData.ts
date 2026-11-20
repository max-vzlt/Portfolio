import type { Category, MediaMap, Project, ProjectCard, Settings } from '#shared/types'

/*
 * schema.org data (JSON-LD) for search engines and AI tools. Invisible on the page.
 * Everything comes from the back-office content.
 */

/** Absolute origin of the site — call it in setup, then pass it to the helpers below. */
export function useSiteOrigin() {
  const cfg = useRuntimeConfig()
  return (cfg.public.siteUrl || useRequestURL().origin).replace(/\/$/, '')
}

export function useJsonLd(data: () => Record<string, unknown> | null) {
  useHead({
    script: () => {
      const d = data()
      // "<" escaped so the JSON can never close the <script> tag
      return d ? [{ key: 'ld-json', type: 'application/ld+json', innerHTML: JSON.stringify(d).replace(/</g, '\\u003c') }] : []
    },
  })
}

/** Machine-readable twin of the page (Markdown), see server/middleware/markdown.ts */
export function useMarkdownAlternate(path: () => string) {
  useHead({ link: () => [{ key: 'md-alt', rel: 'alternate', type: 'text/markdown', href: path() }] })
}

const plain = (s: string) => plainText(s)

export function personLd(o: string, s: Settings, tr: (v: any) => string, media: MediaMap) {
  const img = s.about.imageId ? media[s.about.imageId]?.url : null
  return {
    '@type': 'Person',
    '@id': `${o}/#person`,
    name: s.name,
    jobTitle: tr(s.role),
    description: plain(tr(s.about.body)),
    url: `${o}/`,
    ...(s.contact.email ? { email: `mailto:${s.contact.email}` } : {}),
    ...(img ? { image: o + img } : {}),
    sameAs: s.socials.map((x) => x.url),
    knowsAbout: [
      ...s.services.items.map((it) => tr(it.title)),
      ...new Set(s.method.steps.flatMap((st) => st.tools)),
    ].filter(Boolean),
  }
}

export function projectLd(
  o: string,
  p: Project | ProjectCard,
  opts: { tr: (v: any) => string; lang: string; categories: Category[]; media: MediaMap; path: string },
) {
  const cover = p.coverId ? opts.media[p.coverId]?.url : null
  const blockImages = 'blocks' in p
    ? p.blocks.filter((b) => b.type === 'image' && b.mediaId && opts.media[b.mediaId]).map((b) => o + opts.media[b.mediaId!]!.url)
    : []
  const cats = p.categoryIds.map((id) => opts.categories.find((c) => c.id === id)).filter(Boolean).map((c) => opts.tr(c!.name))
  return {
    '@type': 'CreativeWork',
    '@id': `${o}${opts.path}#work`,
    name: opts.tr(p.title),
    description: plain(opts.tr(p.summary)),
    url: o + opts.path,
    inLanguage: opts.lang,
    ...(cover || blockImages.length ? { image: [...(cover ? [o + cover] : []), ...blockImages].slice(0, 10) } : {}),
    ...(cats.length ? { genre: cats } : {}),
    ...(p.tools.length || cats.length ? { keywords: [...cats, ...p.tools].join(', ') } : {}),
    ...(/^\d{4}$/.test(p.year) ? { dateCreated: p.year } : {}),
    author: { '@id': `${o}/#person` },
    creator: { '@id': `${o}/#person` },
  }
}

export function websiteLd(o: string, s: Settings, tr: (v: any) => string, lang: string) {
  return {
    '@type': 'WebSite',
    '@id': `${o}/#website`,
    url: `${o}/`,
    name: `${s.name} — Portfolio`,
    description: tr(s.seo.description),
    inLanguage: lang,
    author: { '@id': `${o}/#person` },
  }
}

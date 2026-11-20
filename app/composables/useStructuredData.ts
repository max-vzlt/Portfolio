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
  const pr = s.profile
  const location = pr ? tr(pr.location) : ''
  return {
    '@type': 'Person',
    '@id': `${o}/#person`,
    name: s.name,
    ...(pr?.givenName ? { givenName: pr.givenName } : {}),
    ...(pr?.familyName ? { familyName: pr.familyName } : {}),
    jobTitle: tr(s.role),
    description: plain(tr(s.about.body)),
    disambiguatingDescription: [tr(s.role), pr && tr(pr.studies), pr?.school, location].filter(Boolean).join(' · '),
    url: `${o}/`,
    mainEntityOfPage: `${o}/`,
    ...(s.contact.email ? { email: `mailto:${s.contact.email}` } : {}),
    ...(img ? { image: o + img } : {}),
    ...(location ? { address: { '@type': 'PostalAddress', addressLocality: location.split(',')[0]!.trim(), ...(location.includes(',') ? { addressCountry: location.split(',').pop()!.trim() } : {}) }, homeLocation: { '@type': 'Place', name: location } } : {}),
    ...(pr?.school ? { affiliation: { '@type': 'EducationalOrganization', name: pr.school }, alumniOf: { '@type': 'EducationalOrganization', name: pr.school } } : {}),
    hasOccupation: {
      '@type': 'Occupation',
      name: tr(s.role),
      ...(location ? { occupationLocation: { '@type': 'City', name: location } } : {}),
      skills: [...(pr?.expertise || []), ...s.services.items.map((it) => tr(it.title))].filter(Boolean).join(', '),
    },
    ...(pr && tr(pr.availability) ? { seeks: { '@type': 'Demand', description: tr(pr.availability) } } : {}),
    sameAs: s.socials.map((x) => x.url),
    knowsAbout: [...new Set([
      ...(pr?.expertise || []),
      ...s.services.items.map((it) => tr(it.title)),
      ...s.method.steps.flatMap((st) => st.tools),
    ])].filter(Boolean),
    knowsLanguage: ['fr', 'en'],
  }
}

/** The home page is the profile of the person (schema.org ProfilePage). */
export function profilePageLd(o: string, s: Settings, tr: (v: any) => string, lang: string, path: string, modified?: string) {
  return {
    '@type': 'ProfilePage',
    '@id': `${o}${path}#profile`,
    url: o + path,
    name: `${s.name} — ${tr(s.role)}`,
    inLanguage: lang,
    ...(modified ? { dateModified: modified } : {}),
    mainEntity: { '@id': `${o}/#person` },
    isPartOf: { '@id': `${o}/#website` },
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
    ...('updatedAt' in p ? { dateModified: p.updatedAt, datePublished: p.createdAt } : {}),
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

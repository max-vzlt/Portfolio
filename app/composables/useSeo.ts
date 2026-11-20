/**
 * Title, description, Open Graph / Twitter, robots and hreflang for a public page.
 * Nothing visible: only <head> tags read by search engines, social networks and AI tools.
 */
export function useSeo(opts: {
  title: () => string
  description: () => string
  image?: () => string | null | undefined
  imageAlt?: () => string
  type?: 'profile' | 'article' | 'website'
  modified?: () => string | undefined
}) {
  const { lang, otherLangPath } = useI18n()
  const route = useRoute()
  const cfg = useRuntimeConfig()
  const reqUrl = useRequestURL()
  const { data: site } = useSite()
  const origin = computed(() => (cfg.public.siteUrl || reqUrl.origin).replace(/\/$/, ''))
  const abs = (p?: string | null) => (p ? (p.startsWith('http') ? p : origin.value + p) : undefined)
  const desc = () => {
    const d = opts.description().replace(/\s+/g, ' ').trim()
    return d.length > 160 ? `${d.slice(0, 157).replace(/\s+\S*$/, '')}…` : d
  }
  const profile = computed(() => site.value?.settings.profile)

  useSeoMeta({
    title: opts.title,
    description: desc,
    author: () => site.value?.settings.name,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogTitle: opts.title,
    ogDescription: desc,
    ogType: () => opts.type || 'website',
    ogUrl: () => origin.value + route.path,
    ogSiteName: () => `${site.value?.settings.name || 'Maxime Verzeletti'} — Portfolio`,
    ogLocale: () => (lang.value === 'en' ? 'en_GB' : 'fr_FR'),
    ogLocaleAlternate: () => [lang.value === 'en' ? 'fr_FR' : 'en_GB'],
    ogImage: () => abs(opts.image?.()),
    ogImageAlt: () => opts.imageAlt?.() || opts.title(),
    profileFirstName: () => (opts.type === 'profile' ? profile.value?.givenName : undefined),
    profileLastName: () => (opts.type === 'profile' ? profile.value?.familyName : undefined),
    articleAuthor: () => (opts.type === 'article' ? [`${origin.value}/`] : undefined),
    articleModifiedTime: () => (opts.type === 'article' ? opts.modified?.() : undefined),
    twitterCard: 'summary_large_image',
    twitterTitle: opts.title,
    twitterDescription: desc,
    twitterImage: () => abs(opts.image?.()),
  })
  useHead({
    link: () => {
      const fr = lang.value === 'fr' ? route.path : otherLangPath.value
      const en = lang.value === 'en' ? route.path : otherLangPath.value
      return [
        { rel: 'canonical', href: origin.value + route.path },
        { rel: 'alternate', hreflang: 'fr', href: origin.value + fr },
        { rel: 'alternate', hreflang: 'en', href: origin.value + en },
        { rel: 'alternate', hreflang: 'x-default', href: origin.value + fr },
        { rel: 'me', href: `mailto:${site.value?.settings.contact.email || ''}` },
        ...(site.value?.settings.socials || []).map((s) => ({ rel: 'me', href: s.url })),
      ].filter((l) => l.href !== 'mailto:')
    },
  })
}

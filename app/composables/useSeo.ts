/** Title, description, Open Graph and hreflang for a public page. */
export function useSeo(opts: { title: () => string; description: () => string; image?: () => string | null | undefined }) {
  const { lang, otherLangPath } = useI18n()
  const route = useRoute()
  const cfg = useRuntimeConfig()
  const reqUrl = useRequestURL()
  const origin = computed(() => (cfg.public.siteUrl || reqUrl.origin).replace(/\/$/, ''))
  const abs = (p?: string | null) => (p ? (p.startsWith('http') ? p : origin.value + p) : undefined)

  useSeoMeta({
    title: opts.title,
    description: opts.description,
    ogTitle: opts.title,
    ogDescription: opts.description,
    ogType: 'website',
    ogLocale: () => (lang.value === 'en' ? 'en_GB' : 'fr_FR'),
    ogImage: () => abs(opts.image?.()),
    twitterCard: 'summary_large_image',
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
      ]
    },
  })
}

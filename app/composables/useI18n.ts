import type { I18nText, Lang } from '#shared/types'
import { ui, type UiKey } from '~/i18n/ui'

/**
 * Language comes from the URL: /… is French, /en/… is English.
 * - t(key): interface strings
 * - tr(text): content fields ({ fr, en }), falls back to French when empty
 * - lp(path): localised path
 */
export function useI18n() {
  const route = useRoute()
  const lang = computed<Lang>(() => (route.params.lang === 'en' ? 'en' : 'fr'))

  const t = (key: UiKey) => ui[lang.value][key] ?? ui.fr[key] ?? key
  const tr = (v?: I18nText | null, l: Lang = lang.value) => {
    if (!v) return ''
    const own = v[l]?.trim()
    return own ? v[l] : v.fr || v.en || ''
  }
  const lp = (path = '/') => {
    const clean = path.startsWith('/') ? path : `/${path}`
    if (lang.value !== 'en') return clean
    return clean === '/' ? '/en' : `/en${clean}`
  }
  /** Same page in the other language */
  const otherLangPath = computed(() => {
    const p = route.path.replace(/^\/en(?=\/|$)/, '') || '/'
    return lang.value === 'en' ? p : p === '/' ? '/en' : `/en${p}`
  })

  return { lang, t, tr, lp, otherLangPath }
}

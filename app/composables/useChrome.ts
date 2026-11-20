/* Shared UI state of the site chrome (header, page curtain). */

/** Keeps the header visible while the page scrolls by itself (anchor links…). */
export function useHeaderPin() {
  const until = useState<number>('header-pin', () => 0)
  const pin = (ms = 2200) => (until.value = Date.now() + ms)
  return { until, pin }
}

export type CurtainPhase = 'idle' | 'cover' | 'reveal'
export function usePageCurtain() {
  return useState<{ phase: CurtainPhase; to: string }>('page-curtain', () => ({ phase: 'idle', to: '' }))
}

/** Remembers the language chosen by the visitor (read by server/middleware/lang.ts). */
export function useRememberLang() {
  return (lang: 'fr' | 'en') => {
    if (import.meta.server) return
    document.cookie = `mv_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }
}

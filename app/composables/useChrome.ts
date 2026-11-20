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

/* ------------------------------------------------------------------ theme */
export type Theme = 'light' | 'dark'
export const THEME_COOKIE = 'mv_theme'
const THEME_MS = 1050

/**
 * Light / dark theme. Follows the browser until the visitor flips the switch;
 * the choice is kept in a cookie so the server renders the right theme at once.
 * Picking the theme the browser already asks for clears the choice.
 */
export function useTheme() {
  const cookie = useCookie<string | null>(THEME_COOKIE, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  const pref = useState<Theme | null>('theme-pref', () => (cookie.value === 'light' || cookie.value === 'dark' ? cookie.value : null))
  const system = useState<Theme>('theme-system', () => 'light')
  const current = computed<Theme>(() => pref.value || system.value)

  function apply(next: Theme) {
    pref.value = next === system.value ? null : next
    cookie.value = pref.value
    const root = document.documentElement
    if (pref.value) root.dataset.theme = pref.value
    else delete root.dataset.theme
    // canvases (round-pixel images) repaint with the new colours
    window.dispatchEvent(new CustomEvent('mv-theme'))
  }

  /** Switches theme; the new one opens as a circle of round pixels from the button. */
  function toggle(e?: MouseEvent) {
    if (import.meta.server) return
    const next: Theme = current.value === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !doc.startViewTransition) {
      root.classList.add('theme-fade')
      apply(next)
      setTimeout(() => root.classList.remove('theme-fade'), 600)
      return
    }
    // origin: the pointer, or the centre of the button when used with the keyboard
    let x = window.innerWidth - 80
    let y = 40
    const btn = e?.currentTarget as HTMLElement | null
    if (e && e.detail > 0) {
      x = e.clientX
      y = e.clientY
    } else if (btn) {
      const r = btn.getBoundingClientRect()
      x = r.left + r.width / 2
      y = r.top + r.height / 2
    }
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    root.style.setProperty('--vt-x', `${x}px`)
    root.style.setProperty('--vt-y', `${y}px`)
    root.classList.add('theme-switch')
    const vt = doc.startViewTransition(() => apply(next))
    vt.ready
      .then(() => {
        root.animate(
          { '--vt-r': ['-150px', `${end + 40}px`] },
          { duration: THEME_MS, easing: 'cubic-bezier(0.6, 0, 0.3, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' } as KeyframeAnimationOptions,
        )
      })
      .catch(() => {})
    vt.finished.finally(() => root.classList.remove('theme-switch'))
  }

  return { pref, system, current, toggle }
}

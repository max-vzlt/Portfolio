import type Lenis from 'lenis'

export function useSmoothScroll() {
  const nuxt = useNuxtApp()
  const lenis = (): Lenis | null => (nuxt.$smooth as any)?.lenis ?? null

  function scrollTo(target: string | number | HTMLElement, opts: { offset?: number; immediate?: boolean } = {}) {
    if (import.meta.server) return
    const l = lenis()
    const offset = opts.offset ?? 0
    if (l) {
      l.resize()
      l.scrollTo(target as any, { offset, immediate: opts.immediate, duration: 1.4 })
      return
    }
    let y = 0
    if (typeof target === 'number') y = target
    else {
      const el = typeof target === 'string' ? document.querySelector(target) : target
      if (!el) return
      y = el.getBoundingClientRect().top + window.scrollY + offset
    }
    window.scrollTo({ top: y, behavior: opts.immediate ? 'instant' : 'smooth' } as ScrollToOptions)
  }

  /** Freeze page scroll (modals, lightbox) */
  function lock(on: boolean) {
    if (import.meta.server) return
    const l = lenis()
    if (on) l?.stop()
    else l?.start()
    document.documentElement.style.overflow = on ? 'hidden' : ''
  }

  return { scrollTo, lenis, lock }
}

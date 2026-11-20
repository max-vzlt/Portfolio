import type { RouterConfig } from '@nuxt/schema'

// Scroll handling that plays well with Lenis + page transitions.
export default <RouterConfig>{
  scrollBehavior(to, from, saved) {
    const nuxtApp = useNuxtApp()
    const lenis = () => (nuxtApp.$smooth as any)?.lenis
    const samePage = to.path === from.path

    // The target section may not be rendered yet right after a page change.
    const findEl = (hash: string, tries = 30): Promise<HTMLElement | null> =>
      new Promise((resolve) => {
        const tick = (n: number) => {
          const el = document.querySelector(hash) as HTMLElement | null
          if (el || n <= 0) return resolve(el)
          setTimeout(() => tick(n - 1), 40)
        }
        tick(tries)
      })

    return new Promise((resolve) => {
      const go = async () => {
        const l = lenis()
        l?.resize() // the new page may be taller than the cached one
        if (saved) {
          l?.scrollTo(saved.top, { immediate: true })
          return resolve(saved)
        }
        if (to.hash) {
          const el = await findEl(to.hash, samePage ? 1 : 30)
          l?.resize()
          if (el && l) {
            l.scrollTo(el, { immediate: !samePage, duration: 1.4, force: true })
            return resolve(false)
          }
          if (el) return resolve({ el, behavior: samePage ? 'smooth' : 'auto' })
          return resolve({ top: 0 })
        }
        if (samePage) return resolve(false)
        l?.scrollTo(0, { immediate: true, force: true })
        resolve({ top: 0 })
      }
      if (samePage) return go()
      // the new page is under the curtain: scroll as soon as it is rendered
      nuxtApp.hooks.hookOnce('page:finish', () => setTimeout(go, 0))
    })
  },
}

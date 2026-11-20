/**
 * Page curtain: on every change of public page, a blue panel covers the screen,
 * the new page is mounted and scrolled underneath, then the panel lifts and the
 * page's entrance animations play (they are paused while html.is-covered).
 */
const COVER_MS = 620
const REVEAL_MS = 1000

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const curtain = usePageCurtain()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = document.documentElement
  let timer: ReturnType<typeof setTimeout> | undefined

  router.beforeEach(async (to, from) => {
    if (reduce || !from.matched.length) return
    if (to.path === from.path) return
    if (to.path.startsWith('/admin') || from.path.startsWith('/admin')) return
    if (to.query.preview !== undefined) return
    clearTimeout(timer)
    curtain.value = { phase: 'cover', to: to.path }
    root.classList.add('is-covered')
    await new Promise((r) => setTimeout(r, COVER_MS))
  })

  const reveal = () => {
    if (curtain.value.phase !== 'cover') return
    // let the router scroll the new page while it is still hidden
    setTimeout(() => {
      curtain.value = { ...curtain.value, phase: 'reveal' }
      root.classList.remove('is-covered')
      timer = setTimeout(() => (curtain.value = { phase: 'idle', to: '' }), REVEAL_MS)
    }, 140)
  }
  nuxtApp.hook('page:finish', reveal)
  router.onError(() => reveal())
})

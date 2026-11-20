import Lenis from 'lenis'

/** Smooth scrolling (Lenis) on the public site — disabled in /admin and for reduced motion. */
export default defineNuxtPlugin((nuxtApp) => {
  let lenis: Lenis | null = null
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const router = useRouter()

  const sync = (path: string) => {
    const wanted = !path.startsWith('/admin') && !reduce
    if (wanted && !lenis) {
      lenis = new Lenis({ autoRaf: true, lerp: 0.095, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.2 })
    } else if (!wanted && lenis) {
      lenis.destroy()
      lenis = null
    }
  }

  sync(router.currentRoute.value.path)
  router.afterEach((to) => sync(to.path))

  nuxtApp.hook('app:mounted', () => {
    // Deep link with #hash on first load
    const hash = window.location.hash
    if (hash && hash.length > 1) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (!el) return
        if (lenis) lenis.scrollTo(el as HTMLElement, { immediate: true })
        else el.scrollIntoView()
      }, 60)
    }
  })

  return {
    provide: {
      smooth: {
        get lenis() {
          return lenis
        },
      },
    },
  }
})

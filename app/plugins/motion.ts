import type { Directive } from 'vue'

/* ------------------------------------------------------------------ parallax
 * <div class="frame"> <div v-parallax="0.12"> …media… </div> </div>
 * The layer is taller than its frame (see .parallax-layer) and moves on scroll.
 */
const layers = new Set<HTMLElement>()
let ticking = false
let listening = false
let reduce = false

function update() {
  ticking = false
  if (reduce) return
  const vh = window.innerHeight
  for (const el of layers) {
    const host = el.parentElement
    if (!host) continue
    const r = host.getBoundingClientRect()
    if (r.bottom < -200 || r.top > vh + 200) continue
    const strength = Number(el.dataset.parallax) || 0
    const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)
    const y = Math.max(-1, Math.min(1, progress)) * strength * r.height
    el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
  }
}
function request() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(update)
  }
}
function listen() {
  if (listening) return
  listening = true
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request, { passive: true })
}

const apply = (el: HTMLElement, value: unknown) => {
  const v = Number(value ?? 0.1)
  el.dataset.parallax = String(v)
  el.style.setProperty('--p', String(v))
  el.classList.add('parallax-layer')
}

function track(el: HTMLElement) {
  if (Number(el.dataset.parallax) > 0) layers.add(el)
  else {
    layers.delete(el)
    el.style.transform = ''
  }
  request()
}

const parallax: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    apply(el, binding.value)
    listen()
    track(el)
  },
  updated(el, binding) {
    apply(el, binding.value)
    track(el)
  },
  unmounted(el) {
    layers.delete(el)
  },
  getSSRProps(binding) {
    const v = Number(binding.value ?? 0.1)
    return { class: 'parallax-layer', style: { '--p': String(v) }, 'data-parallax': String(v) }
  },
}

/* -------------------------------------------------------------------- reveal
 * v-reveal or v-reveal="120" (delay in ms)
 */
let io: IntersectionObserver | null = null
function observer() {
  io ||= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io!.unobserve(e.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  return io
}

const reveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.setProperty('--delay', `${binding.value}ms`)
    observer().observe(el)
  },
  unmounted(el) {
    io?.unobserve(el)
  },
  getSSRProps(binding) {
    return binding.value ? { class: 'reveal', style: { '--delay': `${binding.value}ms` } } : { class: 'reveal' }
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('parallax', parallax)
  nuxtApp.vueApp.directive('reveal', reveal)
  if (import.meta.client) nuxtApp.hook('page:finish', () => request())
})

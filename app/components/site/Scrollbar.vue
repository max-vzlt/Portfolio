<script setup lang="ts">
/* Custom page scrollbar (the native one is hidden in main.css).
   Shows while scrolling or hovered, draggable, click on the track to jump. */
const { lenis } = useSmoothScroll()
const thumbH = ref(0)
const thumbY = ref(0)
const visible = ref(false)
const active = ref(false)
const dragging = ref(false)
const track = ref<HTMLElement | null>(null)

let idle: ReturnType<typeof setTimeout> | undefined
let raf = 0
const metrics = () => {
  const doc = document.documentElement
  const docH = doc.scrollHeight
  const vh = window.innerHeight
  const trackH = track.value?.clientHeight || vh
  return { docH, vh, trackH, max: Math.max(1, docH - vh) }
}
function update() {
  raf = 0
  const { docH, vh, trackH, max } = metrics()
  visible.value = docH > vh + 4
  thumbH.value = Math.max(44, (vh / docH) * trackH)
  thumbY.value = (Math.min(max, Math.max(0, window.scrollY)) / max) * (trackH - thumbH.value)
}
const request = () => (raf ||= requestAnimationFrame(update))
function wake() {
  active.value = true
  clearTimeout(idle)
  idle = setTimeout(() => !dragging.value && (active.value = false), 1100)
}
const onScroll = () => {
  request()
  wake()
}

function scrollToY(y: number, immediate: boolean) {
  const l = lenis()
  if (l) l.scrollTo(y, { immediate, force: true, duration: 1 })
  else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' } as ScrollToOptions)
}
function startDrag(e: PointerEvent) {
  e.preventDefault()
  dragging.value = true
  const startY = e.clientY
  const startScroll = window.scrollY
  const { trackH, max } = metrics()
  const ratio = max / Math.max(1, trackH - thumbH.value)
  const move = (ev: PointerEvent) => scrollToY(startScroll + (ev.clientY - startY) * ratio, true)
  const up = () => {
    dragging.value = false
    wake()
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
function onTrack(e: PointerEvent) {
  const rect = track.value!.getBoundingClientRect()
  const { trackH, max } = metrics()
  const y = ((e.clientY - rect.top - thumbH.value / 2) / Math.max(1, trackH - thumbH.value)) * max
  scrollToY(Math.min(max, Math.max(0, y)), false)
}

let ro: ResizeObserver | null = null
onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', request, { passive: true })
  ro = new ResizeObserver(request)
  ro.observe(document.body)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', request)
  ro?.disconnect()
  cancelAnimationFrame(raf)
  clearTimeout(idle)
})
</script>

<template>
  <div
    v-show="visible"
    ref="track"
    class="sbar"
    :class="{ 'is-active': active || dragging, 'is-drag': dragging }"
    aria-hidden="true"
    @pointerdown.self="onTrack"
  >
    <div class="sbar-thumb" :style="{ height: `${thumbH}px`, transform: `translate3d(0, ${thumbY}px, 0)` }" @pointerdown="startDrag" />
  </div>
</template>

<style>
.sbar {
  position: fixed;
  z-index: 95;
  top: calc(env(safe-area-inset-top, 0px) + 6px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
  right: calc(env(safe-area-inset-right, 0px) + 2px);
  width: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.35s var(--ease);
}
.sbar:hover, .sbar.is-active { opacity: 1; }
.sbar::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 5px;
  width: 1px;
  background: color-mix(in srgb, var(--blue) 30%, transparent);
}
.sbar-thumb {
  position: absolute;
  top: 0;
  right: 3px;
  width: 5px;
  border-radius: 6px;
  background: var(--blue);
  box-shadow: 0 0 0 1.5px var(--paper);
  cursor: grab;
  transition: width 0.25s var(--ease), right 0.25s var(--ease);
}
.sbar:hover .sbar-thumb, .sbar.is-drag .sbar-thumb { width: 8px; right: 2px; }
.sbar.is-drag .sbar-thumb { cursor: grabbing; }
@media (hover: none) { .sbar { pointer-events: none; } }
</style>

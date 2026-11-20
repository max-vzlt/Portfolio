<script setup lang="ts">
import { Play, Maximize2 } from 'lucide-vue-next'
import type { ImageEffect, PublicMedia } from '#shared/types'

/* Duotone videos have no native controls (they would be tinted too):
   they autoplay muted when visible, click to pause/play.
   On hover, the original colours open in a circle from the cursor, like images:
   a canvas draws the frames of the same <video> (no second download). */
const props = defineProps<{ media: PublicMedia; effect?: ImageEffect; autoplay?: boolean; fit?: 'cover' | 'contain'; label?: string; zoomable?: boolean }>()
const emit = defineEmits<{ zoom: [] }>()
const { t } = useI18n()
const host = ref<HTMLElement | null>(null)
const el = ref<HTMLVideoElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const playing = ref(false)
const revealed = ref(false)
const custom = computed(() => props.effect === 'duotone' || props.autoplay)
const canReveal = computed(() => props.effect === 'duotone')

let io: IntersectionObserver | null = null
onMounted(() => {
  if (!custom.value || !el.value) return
  io = new IntersectionObserver(([e]) => {
    if (!el.value) return
    if (e?.isIntersecting) el.value.play().catch(() => {})
    else el.value.pause()
  }, { threshold: 0.35 })
  io.observe(el.value)
})

function toggle() {
  if (!custom.value || !el.value) return
  if (el.value.paused) el.value.play().catch(() => {})
  else el.value.pause()
}

/* ---------- colour reveal on hover ---------- */
let raf = 0
let stopAt = 0
function drawFrame() {
  const v = el.value
  const c = canvas.value
  const box = host.value
  if (!v || !c || !box || !v.videoWidth) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = Math.round(box.clientWidth * dpr)
  const H = Math.round(box.clientHeight * dpr)
  if (c.width !== W || c.height !== H) {
    c.width = W
    c.height = H
  }
  const ctx = c.getContext('2d')
  if (!ctx) return
  const vw = v.videoWidth
  const vh = v.videoHeight
  const scale = props.fit === 'contain' ? Math.min(W / vw, H / vh) : Math.max(W / vw, H / vh)
  const dw = vw * scale
  const dh = vh * scale
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh)
}
function loop() {
  drawFrame()
  raf = revealed.value || performance.now() < stopAt ? requestAnimationFrame(loop) : 0
}
function hover(e: PointerEvent, on: boolean) {
  if (!canReveal.value || e.pointerType !== 'mouse' || !host.value) return
  const r = host.value.getBoundingClientRect()
  host.value.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
  host.value.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
  revealed.value = on
  if (on) {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(loop)
  } else {
    stopAt = performance.now() + 600 // keep drawing while the circle closes
  }
}
onBeforeUnmount(() => {
  io?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div
    ref="host"
    class="vid"
    :class="[`fx-${effect || 'none'}`, { 'is-custom': custom, 'is-playing': playing, 'is-contain': fit === 'contain', 'is-revealed': revealed }]"
    @click="toggle"
    @pointerenter="hover($event, true)"
    @pointerleave="hover($event, false)"
  >
    <video
      ref="el"
      :src="media.url"
      :controls="!custom"
      :muted="custom"
      :loop="custom"
      playsinline
      preload="metadata"
      :aria-label="label"
      @play="playing = true"
      @pause="playing = false"
    />
    <canvas v-if="canReveal" ref="canvas" class="vid-orig" aria-hidden="true" />
    <div class="dimg-paper" aria-hidden="true" />
    <button v-if="custom && !playing" type="button" class="vid-play btn btn-solid" :aria-label="t('media.play')" @click.stop="toggle">
      <Play />
    </button>
    <button v-if="zoomable" type="button" class="vid-zoom" :aria-label="t('media.open')" @click.stop="emit('zoom')">
      <Maximize2 />
    </button>
  </div>
</template>

<style>
.vid { position: absolute; inset: 0; background: var(--blue); overflow: hidden; isolation: isolate; }
.vid video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vid.is-contain video { object-fit: contain; }
.vid.fx-none { background: var(--blue-deep); }
.vid.fx-none .dimg-paper { display: none; }
.vid.fx-duotone video { filter: grayscale(1) contrast(1.12) brightness(1.04); mix-blend-mode: screen; }
.vid.is-custom { cursor: pointer; }
.vid .vid-orig {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  clip-path: circle(0% at var(--mx, 50%) var(--my, 50%));
  transition: clip-path 0.42s cubic-bezier(0.33, 1, 0.68, 1);
}
.vid.is-revealed .vid-orig { clip-path: circle(150% at var(--mx, 50%) var(--my, 50%)); }
.vid .dimg-paper { transition: opacity 0.35s var(--ease); }
.vid.is-revealed .dimg-paper { opacity: 0.18; }
.vid-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2; min-height: 52px; padding: 14px; }
.vid-play svg { width: 22px; height: 22px; }
.vid-zoom {
  position: absolute; right: 10px; top: 10px; z-index: 3;
  display: grid; place-items: center; width: 34px; height: 34px; padding: 0;
  border: 0; background: var(--paper); color: var(--blue); border-radius: var(--radius); cursor: zoom-in;
  opacity: 0; transform: scale(0.9); transition: opacity 0.3s, transform 0.3s var(--ease);
}
.vid-zoom svg { width: 16px; height: 16px; }
.vid:hover .vid-zoom, .vid-zoom:focus-visible { opacity: 1; transform: none; }
@media (hover: none) { .vid-zoom { opacity: 1; transform: none; } }
</style>

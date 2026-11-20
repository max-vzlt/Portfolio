<script setup lang="ts">
import type { ImageEffect, PublicMedia } from '#shared/types'

/**
 * Every image of the site goes through this component.
 *  - effect "none"    : the image as uploaded (Blender renders…)
 *  - effect "duotone" : blue & white version (CSS, instant)
 *  - effect "dots"    : blue & white round pixels drawn on a canvas
 *  - no media         : a generated dotted placeholder (seeded)
 * + paper texture overlay + optional parallax.
 */
const props = withDefaults(defineProps<{
  media?: PublicMedia | null
  effect?: ImageEffect
  alt?: string
  parallax?: number
  fit?: 'cover' | 'contain'
  sizes?: string
  seed?: string
  dot?: number
  eager?: boolean
  paper?: boolean
  /** On hover, the original image is revealed in a circle growing from the cursor */
  reveal?: boolean
}>(), {
  media: null,
  effect: 'none',
  alt: '',
  parallax: 0,
  fit: 'cover',
  sizes: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw',
  seed: 'mv',
  dot: 0,
  eager: false,
  paper: true,
  reveal: false,
})

const host = ref<HTMLElement | null>(null)
const layer = ref<HTMLElement | null>(null)
const img = ref<HTMLImageElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const drawn = ref(false)
const revealed = ref(false)
const canReveal = computed(() => props.reveal && isImage.value && props.effect !== 'none')
function revealAt(e: PointerEvent, on: boolean) {
  if (!canReveal.value || e.pointerType !== 'mouse' || !host.value) return
  const r = host.value.getBoundingClientRect()
  host.value.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
  host.value.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
  revealed.value = on
}
const visible = ref(false)

const isImage = computed(() => props.media?.kind === 'image')
const usesCanvas = computed(() => !isImage.value || props.effect === 'dots')
const fx = computed<ImageEffect | 'placeholder'>(() => (isImage.value ? props.effect : 'placeholder'))

const BLUE = '#0037ff'
const PAPER = '#f4f3ff'

/* ---------- procedural placeholder ---------- */
function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function makeNoise(seed: number) {
  const perm = new Uint8Array(512)
  let x = seed || 1
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    const j = x % (i + 1)
    ;[p[i], p[j]] = [p[j]!, p[i]!]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!
  const fade = (t: number) => t * t * (3 - 2 * t)
  const v = (i: number, j: number) => perm[(perm[i & 255]! + j) & 511]! / 255
  const noise = (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y)
    const fx = fade(x - i), fy = fade(y - j)
    const a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), d = v(i + 1, j + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
  }
  return (x: number, y: number) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15
}

function placeholderField(seedStr: string) {
  const h = hashString(seedStr)
  const n = makeNoise(h)
  // "globe-…", "dunes-…", "field-…" force a variant, otherwise picked from the seed
  const forced = ['globe', 'dunes', 'field'].findIndex((k) => seedStr.startsWith(k))
  const variant = forced >= 0 ? forced : h % 3
  if (variant === 0) {
    // halftone globe (meridians + parallels) with light rays
    return (u: number, v: number, aspect: number) => {
      const x = (u - 0.5) * aspect
      const y = v - 0.5
      const d = Math.hypot(x, y)
      const R = 0.3
      if (d < R) {
        const nx = x / R
        const ny = y / R
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
        const light = Math.max(0, -nx * 0.5 - ny * 0.55 + nz * 0.67)
        // rotate the sphere a little and draw a lat/long grid
        const lat = Math.asin(ny)
        const lon = Math.atan2(nx, nz) + 0.35
        const grid = Math.max(
          Math.pow(Math.abs(Math.cos(lat * 6)), 70),
          Math.pow(Math.abs(Math.cos(lon * 6)), 70) * nz,
        )
        const rim = Math.pow(1 - nz, 6) * 0.9
        const tex = (n(u * 9, v * 9) - 0.5) * 0.35
        return Math.min(1, 0.1 + light * 0.75 + grid * 0.42 + rim + tex)
      }
      const a = Math.atan2(y, x)
      const rays = Math.pow(Math.max(0, Math.sin(a * 34 + n(u * 2, v * 2) * 3)), 10)
      const fall = Math.max(0, 1 - (d - R) * 2.4)
      const halo = Math.max(0, 1 - (d - R) * 14) * 0.5
      return Math.max(0, rays * fall * 0.8 + halo - 0.04)
    }
  }
  if (variant === 1) {
    // layered dunes
    const k = 2 + (h % 4)
    return (u: number, v: number) => {
      const band = Math.sin((v * k + n(u * 3, v * 2) * 1.8) * Math.PI * 2)
      return Math.max(0, band * 0.5 + 0.5) * (0.35 + v * 0.75) - 0.12
    }
  }
  // flowing noise field
  return (u: number, v: number) => {
    const f = n(u * 3.2 + 10, v * 3.2)
    return Math.max(0, Math.min(1, (f - 0.32) * 2.1))
  }
}

/* ---------- drawing ---------- */
function draw() {
  const c = canvas.value
  const box = layer.value
  if (!c || !box || !usesCanvas.value) return
  const W0 = box.clientWidth
  const H0 = box.clientHeight
  if (!W0 || !H0) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = Math.round(W0 * dpr)
  const H = Math.round(H0 * dpr)
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return

  const base = props.dot || Math.max(4, Math.min(9, W0 / 125))
  const step = base * dpr
  const rs = step * 0.866 // hexagonal rows
  const cols = Math.ceil(W / step) + 1
  const rows = Math.ceil(H / rs) + 1

  let lum: (i: number, j: number) => number
  const image = img.value
  if (isImage.value && image && image.naturalWidth) {
    const sc = document.createElement('canvas')
    sc.width = cols
    sc.height = rows
    const sctx = sc.getContext('2d', { willReadFrequently: true })!
    sctx.imageSmoothingEnabled = true
    sctx.imageSmoothingQuality = 'high'
    const iw = image.naturalWidth
    const ih = image.naturalHeight
    const scale = props.fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih)
    const dw = iw * scale
    const dh = ih * scale
    sctx.drawImage(image, ((W - dw) / 2) / step, ((H - dh) / 2) / rs, dw / step, dh / rs)
    const data = sctx.getImageData(0, 0, cols, rows).data
    const L = new Float32Array(cols * rows)
    const sample: number[] = []
    for (let k = 0; k < cols * rows; k++) {
      const a = data[k * 4 + 3]! / 255
      const l = ((0.2126 * data[k * 4]! + 0.7152 * data[k * 4 + 1]! + 0.0722 * data[k * 4 + 2]!) / 255) * a
      L[k] = l
      if (a > 0.5 && k % 3 === 0) sample.push(l)
    }
    // auto levels (2% – 98%)
    sample.sort((a, b) => a - b)
    const lo = sample[Math.floor(sample.length * 0.02)] ?? 0
    const hi = sample[Math.floor(sample.length * 0.98)] ?? 1
    const range = Math.max(0.15, hi - lo)
    lum = (i, j) => {
      const l = L[j * cols + i] ?? 0
      return Math.min(1, Math.max(0, (l - lo) / range))
    }
  } else {
    const field = placeholderField(props.seed)
    const aspect = W / H
    lum = (i, j) => field((i * step) / W, (j * rs) / H, aspect)
  }

  ctx.fillStyle = BLUE
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = PAPER
  ctx.beginPath()
  const maxR = step * 0.56
  const minR = 0.45 * dpr
  for (let j = 0; j < rows; j++) {
    const y = (j + 0.5) * rs
    const off = j % 2 ? step / 2 : 0
    for (let i = 0; i < cols; i++) {
      const v = Math.pow(lum(i, j), 1.1)
      const r = v * maxR
      if (r < minR) continue
      const x = (i + 0.5) * step + off
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
  }
  ctx.fill()
  drawn.value = true
}

let raf = 0
function schedule() {
  if (!visible.value) return
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(draw)
}

function onLoad() {
  if (props.effect === 'dots') schedule()
}

let ro: ResizeObserver | null = null
let io: IntersectionObserver | null = null
let lastW = 0
let lastH = 0
let t: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      visible.value = true
      io?.disconnect()
      if (!isImage.value || img.value?.complete) schedule()
    }
  }, { rootMargin: '300px' })
  if (host.value) io.observe(host.value)

  ro = new ResizeObserver(() => {
    const el = layer.value
    if (!el) return
    if (Math.abs(el.clientWidth - lastW) < 2 && Math.abs(el.clientHeight - lastH) < 2) return
    lastW = el.clientWidth
    lastH = el.clientHeight
    clearTimeout(t)
    t = setTimeout(schedule, drawn.value ? 140 : 0)
  })
  if (layer.value) ro.observe(layer.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  io?.disconnect()
  cancelAnimationFrame(raf)
  clearTimeout(t)
})

watch(() => [props.media?.url, props.effect, props.fit, props.seed, props.dot], () => {
  drawn.value = false
  nextTick(() => {
    if (!isImage.value || img.value?.complete) schedule()
  })
})
</script>

<template>
  <figure
    ref="host"
    class="dimg"
    :class="[`fx-${fx}`, { 'is-drawn': drawn, 'is-contain': fit === 'contain', 'can-reveal': canReveal, 'is-revealed': revealed }]"
    @pointerenter="revealAt($event, true)"
    @pointerleave="revealAt($event, false)"
  >
    <div ref="layer" v-parallax="parallax" class="dimg-layer">
      <img
        v-if="isImage && media"
        ref="img"
        :src="media.url"
        :srcset="media.srcset"
        :sizes="media.srcset ? sizes : undefined"
        :width="media.width"
        :height="media.height"
        :alt="alt"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="eager ? 'high' : undefined"
        decoding="async"
        draggable="false"
        @load="onLoad"
      >
      <canvas v-if="usesCanvas" ref="canvas" aria-hidden="true" />
      <img
        v-if="canReveal && media"
        class="dimg-orig"
        :src="media.url"
        :srcset="media.srcset"
        :sizes="media.srcset ? sizes : undefined"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable="false"
      >
      <span v-if="!isImage && alt" class="sr-only">{{ alt }}</span>
    </div>
    <div v-if="paper" class="dimg-paper" aria-hidden="true" />
    <slot />
  </figure>
</template>

<style>
.dimg {
  position: relative;
  overflow: hidden;
  background: var(--blue);
  isolation: isolate;
  width: 100%;
  height: 100%;
}
.dimg-layer { position: absolute; inset: 0; }
.parallax-layer {
  top: calc(var(--p, 0) * -100%);
  bottom: calc(var(--p, 0) * -100%);
  will-change: transform;
}
.dimg img, .dimg canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dimg.is-contain img { object-fit: contain; }
.dimg canvas { opacity: 0; transition: opacity 0.6s var(--ease); }
.dimg.is-drawn canvas { opacity: 1; }

/* Blue & white without canvas */
.dimg.fx-duotone img,
.dimg.fx-dots img {
  filter: grayscale(1) contrast(1.12) brightness(1.04);
  mix-blend-mode: screen;
}
.dimg.fx-dots.is-drawn img { opacity: 0; }
/* the parallax layer is its own stacking context: give it the blue to blend with */
.dimg.fx-duotone .dimg-layer,
.dimg.fx-dots .dimg-layer,
.dimg.fx-placeholder .dimg-layer { background: var(--blue); }
.dimg.fx-none { background: var(--surface, var(--blue)); }

.dimg-paper {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: url('/textures/paper.png') 0 0 / 300px 300px repeat;
  mix-blend-mode: multiply;
  opacity: 0.55;
  z-index: 1;
}
.dimg.fx-none .dimg-paper { opacity: 0.28; }
/* hover: the original colours open in a circle from the cursor */
.dimg .dimg-layer img.dimg-orig {
  z-index: 1;
  filter: none;
  mix-blend-mode: normal;
  opacity: 1;
  clip-path: circle(0% at var(--mx, 50%) var(--my, 50%));
  transform: scale(1.06);
  transition: clip-path 0.42s cubic-bezier(0.33, 1, 0.68, 1), transform 0.6s cubic-bezier(0.33, 1, 0.68, 1);
}
.dimg.is-revealed .dimg-layer img.dimg-orig { clip-path: circle(150% at var(--mx, 50%) var(--my, 50%)); transform: scale(1); }
.dimg.is-contain .dimg-layer img.dimg-orig { object-fit: contain; }
.dimg.can-reveal .dimg-paper { transition: opacity 0.35s var(--ease); }
.dimg.is-revealed .dimg-paper { opacity: 0.18; }
</style>

<script setup lang="ts">
/* Halftone background: round pixels growing from a calm centre to the edges. */
const props = withDefaults(defineProps<{ step?: number; alpha?: number }>(), { step: 16, alpha: 0.32 })
const c = ref<HTMLCanvasElement | null>(null)
let ro: ResizeObserver | null = null

function draw() {
  const el = c.value
  if (!el?.parentElement) return
  const w = el.parentElement.clientWidth
  const h = el.parentElement.clientHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(w * dpr)
  el.height = Math.round(h * dpr)
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, el.width, el.height)
  ctx.fillStyle = `rgba(244, 243, 255, ${props.alpha})`
  ctx.beginPath()
  const step = props.step * dpr
  const rowH = step * 0.866
  const maxR = step * 0.44
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  for (let j = 0, y = rowH / 2; y < el.height + rowH; j++, y += rowH) {
    const off = j % 2 ? step / 2 : 0
    for (let x = off; x < el.width + step; x += step) {
      const u = (x / el.width - 0.5) * 2
      const v = (y / el.height - 0.5) * 2
      const d = Math.hypot(u * 0.92, v) / Math.SQRT2
      const r = smooth(0.32, 1.02, d) * maxR
      if (r < 0.5 * dpr) continue
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
  }
  ctx.fill()
}

onMounted(() => {
  draw()
  ro = new ResizeObserver(draw)
  if (c.value?.parentElement) ro.observe(c.value.parentElement)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <canvas ref="c" class="halftone" aria-hidden="true" />
</template>

<style>
.halftone { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
</style>

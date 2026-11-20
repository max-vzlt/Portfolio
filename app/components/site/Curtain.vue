<script setup lang="ts">
/* Blue panel shown between two pages (see plugins/curtain.client.ts). */
const curtain = usePageCurtain()
const { data } = useSite()
const { tr } = useI18n()

const target = computed(() => {
  const path = curtain.value.to.replace(/^\/en(?=\/|$)/, '') || '/'
  const m = /^\/work\/([^/]+)/.exec(path)
  const list = data.value?.projects || []
  if (m) {
    const i = list.findIndex((p) => p.slug === m[1])
    const p = list[i]
    if (p) return { label: `(${String(i + 1).padStart(2, '0')}) — ${String(p.year || '')}`.replace(/ — $/, ''), title: tr(p.title) }
  }
  return { label: 'Portfolio', title: data.value?.settings.name || '' }
})
</script>

<template>
  <div class="curtain tone-blue" :class="`is-${curtain.phase}`" aria-hidden="true">
    <div class="curtain-dots" />
    <div class="curtain-inner">
      <p class="label">{{ target.label }}</p>
      <p class="display-l curtain-title"><span>{{ target.title }}</span></p>
    </div>
  </div>
</template>

<style>
.curtain {
  position: fixed;
  inset: 0;
  z-index: 98;
  display: grid;
  place-items: center;
  pointer-events: none;
  transform: translate3d(0, 101%, 0);
  visibility: hidden;
}
.curtain.is-cover { visibility: visible; pointer-events: auto; animation: curtainIn 0.62s cubic-bezier(0.76, 0, 0.24, 1) both; }
.curtain.is-reveal { visibility: visible; animation: curtainOut 0.9s cubic-bezier(0.76, 0, 0.24, 1) both; }
@keyframes curtainIn { from { transform: translate3d(0, 101%, 0); } to { transform: none; } }
@keyframes curtainOut { from { transform: none; } to { transform: translate3d(0, -101%, 0); } }

/* round-pixel edges, like the halftone images */
.curtain-dots {
  position: absolute;
  inset: -90px 0;
  background:
    radial-gradient(circle, var(--blue) 42%, transparent 46%) 0 0 / 14px 14px;
  -webkit-mask: linear-gradient(to bottom, transparent 0, #000 90px, #000 calc(100% - 90px), transparent 100%);
  mask: linear-gradient(to bottom, transparent 0, #000 90px, #000 calc(100% - 90px), transparent 100%);
}
.curtain-inner { position: relative; display: grid; justify-items: center; gap: 18px; padding-inline: 24px; text-align: center; }
.curtain-title { overflow: hidden; padding-bottom: 0.06em; }
.curtain-title span { display: inline-block; }
.curtain.is-cover .curtain-title span { animation: wordUp 0.8s var(--ease) both 0.22s; }
.curtain.is-cover .label { animation: enterUp 0.6s var(--ease) both 0.2s; }
.curtain.is-reveal .curtain-inner { animation: curtainText 0.6s var(--ease-io) both; }
@keyframes curtainText { to { transform: translate3d(0, -60px, 0); opacity: 0; } }
</style>

<script setup lang="ts">
import { X, ArrowLeft, ArrowRight } from 'lucide-vue-next'
import type { LightboxItem } from '~/composables/useLightbox'

const { items, index, dir, close, move } = useLightbox()
const { lock } = useSmoothScroll()
const { t, tr } = useI18n()
const current = computed(() => (index.value >= 0 ? items.value[index.value] : null))

function onKey(e: KeyboardEvent) {
  if (!current.value) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowRight') move(1)
  if (e.key === 'ArrowLeft') move(-1)
}

/* ---------------------------------------------------------------- sizing
   The media box is computed from its aspect ratio (container query units),
   so it is known before the file has loaded: the open / close morph can
   start at once. Videos have no stored size: taken from the page's player. */
const aspects = reactive<Record<string, number>>({})
const thumbs = reactive<Record<string, string>>({})
const sourceEl = (it: LightboxItem | null) =>
  it?.source ? document.querySelector<HTMLElement>(`[data-lb-src="${CSS.escape(it.source)}"]`) : null
function remember(it: LightboxItem) {
  const el = sourceEl(it)
  if (!el) return
  if (it.media.kind === 'video') {
    const v = el.querySelector('video')
    if (v?.videoWidth && !aspects[it.media.id]) aspects[it.media.id] = v.videoWidth / v.videoHeight
  } else if (!thumbs[it.media.id]) {
    // low-res placeholder while the large file loads
    const img = el.querySelector('img')
    if (img?.currentSrc) thumbs[it.media.id] = img.currentSrc
  }
}
function mediaStyle(it: LightboxItem) {
  const m = it.media
  const ar = m.width && m.height ? m.width / m.height : aspects[m.id] || 16 / 9
  return {
    '--ar': ar.toFixed(4),
    ...(m.kind === 'image' && m.width ? { '--nw': `${m.width}px` } : {}),
    ...(thumbs[m.id] ? { backgroundImage: `url("${thumbs[m.id]}")` } : {}),
  }
}
function onMeta(e: Event, it: LightboxItem) {
  const v = e.target as HTMLVideoElement
  if (v.videoWidth) aspects[it.media.id] = v.videoWidth / v.videoHeight
}

let last: LightboxItem | null = null
watch(current, (v, old) => {
  if (v) {
    last = v
    remember(v)
  }
  if (!!v !== !!old) lock(!!v)
}, { immediate: true, flush: 'pre' })
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (current.value) lock(false)
})
const route = useRoute()
watch(() => route.fullPath, close)

/* ------------------------------------------------------- open / close
   The viewer grows out of the thumbnail that was clicked: the blue backdrop
   opens from its frame while the media flies from it to its place (and the
   colours come back). Closing sends everything back into the thumbnail of
   the media being shown, or simply fades if it is off screen. */
const OPEN_MS = 720
const CLOSE_MS = 560
const EASE = 'cubic-bezier(0.7, 0, 0.2, 1)'
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const onScreen = (r: DOMRect) => r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth
const frameOf = (r: DOMRect) =>
  `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round 3px)`

function morphFrames(media: HTMLElement, r: DOMRect, duo: boolean) {
  const f = media.getBoundingClientRect()
  if (!f.width || !f.height) return null
  const s = Math.max(r.width / f.width, r.height / f.height)
  const dx = r.left + r.width / 2 - (f.left + f.width / 2)
  const dy = r.top + r.height / 2 - (f.top + f.height / 2)
  const iy = Math.max(0, (f.height - r.height / s) / 2)
  const ix = Math.max(0, (f.width - r.width / s) / 2)
  const thumb = { transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${iy}px ${ix}px round ${3 / s}px)`, filter: `grayscale(${duo ? 1 : 0})` }
  const shown = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(-140px -140px round 3px)', filter: 'grayscale(0)' }
  return { thumb, shown }
}

function animateBox(el: HTMLElement, opening: boolean, done: () => void) {
  const it = opening ? current.value : last
  const media = el.querySelector<HTMLElement>('.lb-media')
  const bar = el.querySelector<HTMLElement>('.lb-bar')
  const src = sourceEl(it)?.getBoundingClientRect()
  const ms = opening ? OPEN_MS : CLOSE_MS
  const anims: Animation[] = []
  const fill: FillMode = opening ? 'none' : 'forwards'

  if (reduced()) {
    anims.push(el.animate({ opacity: opening ? [0, 1] : [1, 0] }, { duration: 200, fill }))
  } else if (src && onScreen(src) && media) {
    const fr = morphFrames(media, src, !!it && it.effect !== 'none')
    const box = [frameOf(src), 'inset(0px 0px 0px 0px round 0px)']
    anims.push(el.animate({ clipPath: opening ? box : [...box].reverse() }, { duration: ms, easing: EASE, fill }))
    // closing: the colours fade out at the end so it melts into the blue thumbnail
    if (fr) anims.push(media.animate(opening ? [fr.thumb, fr.shown] : [fr.shown, { opacity: 1, offset: 0.62 }, { ...fr.thumb, opacity: 0 }], { duration: ms, easing: EASE, fill }))
  } else {
    // nothing to grow from: fade with a small zoom
    anims.push(el.animate({ opacity: opening ? [0, 1] : [1, 0] }, { duration: opening ? 420 : 320, easing: 'ease', fill }))
    if (media) anims.push(media.animate({ transform: opening ? ['scale(0.94)', 'scale(1)'] : ['scale(1)', 'scale(0.96)'] }, { duration: opening ? 620 : 320, easing: EASE, fill }))
  }
  // controls come in once the media has landed, and leave first
  if (bar) {
    anims.push(opening
      ? bar.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: ms * 0.55, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' })
      : bar.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 180, easing: 'ease', fill: 'forwards' }))
  }
  Promise.all(anims.map((a) => a.finished)).then(done, done)
}
const onEnter = (el: Element, done: () => void) => animateBox(el as HTMLElement, true, done)
const onLeave = (el: Element, done: () => void) => animateBox(el as HTMLElement, false, done)
</script>

<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <div v-if="current" class="lightbox tone-blue" role="dialog" aria-modal="true" data-lenis-prevent @click.self="close">
      <!-- halftone gradient behind the media -->
      <div class="lb-ambient" aria-hidden="true"><SiteHalftone /></div>
      <div class="lb-frame" @click.self="close">
        <Transition :name="dir > 0 ? 'lb-next' : 'lb-prev'">
        <video
          v-if="current.media.kind === 'video'"
          :key="current.media.id"
          class="lb-media"
          :style="mediaStyle(current)"
          :src="current.media.url"
          controls
          autoplay
          playsinline
          :aria-label="current.caption || ''"
          @loadedmetadata="onMeta($event, current)"
        />
        <img
          v-else
          :key="current.media.id"
          class="lb-media"
          :style="mediaStyle(current)"
          :src="current.media.url"
          :srcset="current.media.srcset"
          sizes="100vw"
          :width="current.media.width"
          :height="current.media.height"
          :alt="tr(current.media.alt) || current.caption || ''"
          decoding="async"
          @click.self="close"
        >
        </Transition>
      </div>
      <div class="lb-bar">
        <p class="label lb-count">
          <Transition :name="dir > 0 ? 'lb-num-next' : 'lb-num-prev'" mode="out-in"><span :key="index" class="lb-num">{{ String(index + 1).padStart(2, '0') }}</span></Transition>
          / {{ String(items.length).padStart(2, '0') }}<span v-if="current.caption"> — {{ current.caption }}</span>
        </p>
        <div class="lb-actions">
          <button v-if="items.length > 1" type="button" class="btn btn-ghost" :aria-label="t('project.prev')" @click="move(-1)"><ArrowLeft /></button>
          <button v-if="items.length > 1" type="button" class="btn btn-ghost" :aria-label="t('project.next')" @click="move(1)"><ArrowRight /></button>
          <button type="button" class="btn btn-solid" @click="close"><X /> {{ t('media.close') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.lightbox {
  --lb-bg: var(--blue);
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  grid-template-rows: 1fr auto;
  padding: clamp(12px, 3vw, 40px);
  gap: 16px;
  background: var(--lb-bg);
  isolation: isolate;
}
.lb-ambient { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.lightbox.tone-blue { background: var(--lb-bg); }
.lb-frame { position: relative; min-height: 0; container-type: size; }
/* contain box from the aspect ratio (never larger than the original image) */
.lb-media {
  --w: min(100cqw, 100cqh * var(--ar, 1.5), var(--nw, 100cqw));
  position: absolute;
  inset: 0;
  margin: auto;
  width: var(--w);
  height: calc(var(--w) / var(--ar, 1.5));
  max-width: none;
  object-fit: contain;
  background: center / 100% 100% no-repeat;
  border-radius: 3px;
  box-shadow: 0 40px 90px -30px rgba(9, 11, 208, 0.85), 0 0 0 1px color-mix(in srgb, var(--paper) 18%, transparent);
}
video.lb-media { background: var(--blue-deep); }
.lb-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lb-actions { display: flex; gap: 8px; }

/* change of media: a wipe. The new one slides in and is uncovered from the side
   it comes from; the previous one drifts away the other way, shrinks and fades. */
.lb-next-enter-active, .lb-prev-enter-active {
  z-index: 1;
  transition: clip-path 0.8s cubic-bezier(0.77, 0, 0.18, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
/* the previous one stays crisp while it is being covered, then fades out */
.lb-next-leave-active, .lb-prev-leave-active {
  transition: transform 0.8s cubic-bezier(0.77, 0, 0.18, 1), opacity 0.4s ease 0.35s;
}
/* negative insets keep the shadow visible at the end of the wipe */
.lb-next-enter-from { clip-path: inset(-120px -120px -120px 100%); transform: translate3d(10%, 0, 0); }
.lb-prev-enter-from { clip-path: inset(-120px 100% -120px -120px); transform: translate3d(-10%, 0, 0); }
.lb-next-enter-to, .lb-prev-enter-to { clip-path: inset(-120px -120px -120px -120px); }
.lb-next-leave-to { transform: translate3d(-14%, 0, 0) scale(0.92); opacity: 0; }
.lb-prev-leave-to { transform: translate3d(14%, 0, 0) scale(0.92); opacity: 0; }
.lb-count { display: inline-flex; align-items: baseline; gap: 0.5ch; }
.lb-num { display: inline-block; }
.lb-num-next-enter-active, .lb-num-next-leave-active, .lb-num-prev-enter-active, .lb-num-prev-leave-active { transition: transform 0.25s var(--ease), opacity 0.25s; }
.lb-num-next-enter-from, .lb-num-prev-leave-to { transform: translateY(70%); opacity: 0; }
.lb-num-next-leave-to, .lb-num-prev-enter-from { transform: translateY(-70%); opacity: 0; }

/* readable over the dots */
.lightbox .lb-actions .btn-ghost { --btn-bg: var(--blue); border-color: color-mix(in srgb, var(--paper) 55%, transparent); }
.lightbox .lb-actions .btn-ghost:hover { --btn-bg: var(--blue-deep); border-color: var(--paper); }
.lightbox .lb-count { padding: 7px 10px 6px; background: var(--blue); border-radius: 3px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--paper) 25%, transparent); }
</style>

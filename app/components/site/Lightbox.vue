<script setup lang="ts">
import { X, ArrowLeft, ArrowRight } from 'lucide-vue-next'

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
watch(current, (v, old) => {
  if (!!v !== !!old) lock(!!v)
})
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (current.value) lock(false)
})
const route = useRoute()
watch(() => route.fullPath, close)
</script>

<template>
  <Transition name="lb">
    <div v-if="current" class="lightbox tone-blue" role="dialog" aria-modal="true" data-lenis-prevent @click.self="close">
      <!-- halftone gradient behind the media -->
      <div class="lb-ambient" aria-hidden="true"><SiteHalftone /></div>
      <div class="lb-frame" @click.self="close">
        <Transition :name="dir > 0 ? 'lb-next' : 'lb-prev'">
        <video
          v-if="current.media.kind === 'video'"
          :key="current.media.id"
          class="lb-media"
          :src="current.media.url"
          controls
          autoplay
          playsinline
          :aria-label="current.caption || ''"
        />
        <img
          v-else
          :key="current.media.id"
          class="lb-media"
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
.lb-frame { position: relative; min-height: 0; }
.lb-media {
  position: absolute;
  inset: 0;
  margin: auto;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 3px;
  box-shadow: 0 40px 90px -30px rgba(9, 11, 208, 0.85), 0 0 0 1px color-mix(in srgb, var(--paper) 18%, transparent);
}
video.lb-media { width: 100%; height: 100%; background: transparent; box-shadow: none; }
.lb-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lb-actions { display: flex; gap: 8px; }
.lb-enter-active, .lb-leave-active { transition: opacity 0.35s var(--ease); }
.lb-enter-from, .lb-leave-to { opacity: 0; }

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

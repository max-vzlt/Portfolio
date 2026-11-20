<script setup lang="ts">
import { X, ArrowLeft, ArrowRight } from 'lucide-vue-next'

const { items, index, close, move } = useLightbox()
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
      <!-- soft backdrop made from the current media, so it does not pop out of the blue -->
      <div class="lb-ambient" aria-hidden="true">
        <img v-if="current.media.kind === 'image'" :src="current.media.url" alt="">
      </div>
      <div class="lb-frame" @click.self="close">
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
      </div>
      <div class="lb-bar">
        <p class="label">{{ String(index + 1).padStart(2, '0') }} / {{ String(items.length).padStart(2, '0') }}<span v-if="current.caption"> — {{ current.caption }}</span></p>
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
  --lb-bg: color-mix(in srgb, var(--blue-deep) 70%, #000);
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
.lb-ambient img {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  object-fit: cover;
  filter: blur(60px) saturate(0.6);
  opacity: 0.32;
}
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
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.6), 0 0 0 1px color-mix(in srgb, var(--paper) 10%, transparent);
}
video.lb-media { width: 100%; height: 100%; background: transparent; box-shadow: none; }
.lb-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lb-actions { display: flex; gap: 8px; }
.lb-enter-active, .lb-leave-active { transition: opacity 0.35s var(--ease); }
.lb-enter-from, .lb-leave-to { opacity: 0; }
</style>

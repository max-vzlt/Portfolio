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
      <div class="lb-frame" @click.self="close">
        <DotImage
          :key="current.media.id"
          :media="current.media"
          :effect="current.effect"
          fit="contain"
          :alt="tr(current.media.alt) || current.caption || ''"
          sizes="100vw"
          :dot="0"
          eager
        />
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
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  grid-template-rows: 1fr auto;
  padding: clamp(12px, 3vw, 40px);
  gap: 16px;
}
.lb-frame { position: relative; min-height: 0; }
.lb-frame .dimg { background: transparent; }
.lb-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lb-actions { display: flex; gap: 8px; }
.lb-enter-active, .lb-leave-active { transition: opacity 0.35s var(--ease), transform 0.45s var(--ease); }
.lb-enter-from, .lb-leave-to { opacity: 0; transform: scale(0.985); }
</style>

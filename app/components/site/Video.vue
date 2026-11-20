<script setup lang="ts">
import { Play } from 'lucide-vue-next'
import type { ImageEffect, PublicMedia } from '#shared/types'

/* Duotone videos have no native controls (they would be tinted too):
   they autoplay muted when visible, click to pause/play. */
const props = defineProps<{ media: PublicMedia; effect?: ImageEffect; autoplay?: boolean; fit?: 'cover' | 'contain'; label?: string }>()
const { t } = useI18n()
const el = ref<HTMLVideoElement | null>(null)
const playing = ref(false)
const custom = computed(() => props.effect === 'duotone' || props.autoplay)

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
onBeforeUnmount(() => io?.disconnect())

function toggle() {
  if (!custom.value || !el.value) return
  if (el.value.paused) el.value.play().catch(() => {})
  else el.value.pause()
}
</script>

<template>
  <div class="vid" :class="[`fx-${effect || 'none'}`, { 'is-custom': custom, 'is-playing': playing, 'is-contain': fit === 'contain' }]" @click="toggle">
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
    <div class="dimg-paper" aria-hidden="true" />
    <button v-if="custom && !playing" type="button" class="vid-play btn btn-solid" :aria-label="t('media.play')" @click.stop="toggle">
      <Play />
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
.vid-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2; min-height: 52px; padding: 14px; }
.vid-play svg { width: 22px; height: 22px; }
</style>

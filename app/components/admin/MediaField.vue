<script setup lang="ts">
import { Upload, Images, X, FileText, LoaderCircle } from 'lucide-vue-next'
import type { ImageEffect, MediaKind } from '#shared/types'

/** Pick / drop / replace one media. Optional effect selector for images. */
const model = defineModel<string | null>({ default: null })
const effect = defineModel<ImageEffect>('effect', { default: 'none' })
const props = withDefaults(defineProps<{ label?: string; kind?: MediaKind; withEffect?: boolean; height?: string; fit?: 'cover' | 'contain' }>(), {
  kind: 'image',
  height: '180px',
  fit: 'cover',
})
const map = useMediaMap()
const { upload } = useUpload()
const picker = ref(false)
const busy = ref(false)
const m = computed(() => (model.value ? map[model.value] || null : null))
const accept = computed(() => (props.kind === 'image' ? 'image/*' : props.kind === 'video' ? 'video/*' : '.pdf,application/pdf'))

async function onFiles(files: File[]) {
  busy.value = true
  try {
    const [res] = await upload(files.slice(0, 1))
    if (res) {
      map[res.id] = res
      model.value = res.id
    }
  } finally {
    busy.value = false
  }
}
const effects: { value: ImageEffect; label: string; title: string }[] = [
  { value: 'none', label: 'Original', title: 'Image telle quelle (tes rendus Blender…)' },
  { value: 'duotone', label: 'Bichromie', title: 'Convertie en bleu & blanc' },
  { value: 'dots', label: 'Pixels ronds', title: 'Trame de pixels ronds bleu & blanc' },
]
</script>

<template>
  <div class="a-field mf">
    <span v-if="label" class="a-label">{{ label }}</span>
    <AdminDropzone class="mf-box" :accept="accept" :multiple="false" :clickable="!m" :style="{ height: kind === 'file' ? '84px' : height }" @files="onFiles">
      <template v-if="m">
        <DotImage v-if="m.kind === 'image'" :media="m" :effect="withEffect ? effect : 'none'" :fit="fit" sizes="400px" :paper="withEffect" />
        <video v-else-if="m.kind === 'video'" :src="m.url" muted playsinline preload="metadata" class="mf-video" />
        <a v-else :href="m.url" target="_blank" class="mf-file" @click.stop><FileText /> {{ (m as any).originalName || 'Fichier' }}</a>
        <div class="mf-actions" @click.stop>
          <button type="button" class="a-btn is-sm" @click="picker = true"><Images /> Changer</button>
          <button type="button" class="a-btn is-sm is-icon" aria-label="Retirer" title="Retirer" @click="model = null"><X /></button>
        </div>
      </template>
      <div v-else class="mf-empty">
        <LoaderCircle v-if="busy" class="spin" />
        <Upload v-else />
        <strong>Glisser ou cliquer</strong>
        <button type="button" class="a-btn is-sm" @click.stop="picker = true"><Images /> Médiathèque</button>
      </div>
    </AdminDropzone>
    <AdminSeg v-if="withEffect && kind === 'image'" v-model="effect" :options="effects" label="Rendu" />
    <AdminMediaPicker :open="picker" :kind="kind" @close="picker = false" @select="(x) => (model = x.id)" />
  </div>
</template>

<style>
.mf-box { position: relative; border: 1.5px dashed color-mix(in srgb, var(--blue) 30%, transparent); border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--blue) 3%, #fff); }
.mf-box.is-over { border-color: var(--blue); background: color-mix(in srgb, var(--blue) 10%, #fff); }
.mf-box .dimg { position: absolute; inset: 0; }
.mf-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.mf-file { display: flex; align-items: center; gap: 8px; padding: 14px 12px; padding-right: 150px; font-size: 13px; word-break: break-all; }
.mf-file svg { width: 20px; height: 20px; flex: none; }
.mf-empty { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 6px; cursor: pointer; color: var(--blue-deep); text-align: center; min-height: 100px; }
.mf-empty svg { width: 22px; height: 22px; stroke-width: 1.4; }
.mf-empty strong { font-family: var(--font-display); font-weight: 400; font-size: 13px; letter-spacing: .05em; text-transform: uppercase; }
.mf-actions { position: absolute; right: 8px; top: 8px; z-index: 3; display: flex; gap: 4px; }
</style>

<script setup lang="ts">
import {
  GripVertical, Eye, EyeOff, Copy, Trash2, Heading, Type, Image as ImageIcon, Video, Link2, Quote, Minus, Images, Upload, MoveDiagonal2,
} from 'lucide-vue-next'
import type { Block, ImageEffect } from '#shared/types'

const block = defineModel<Block>({ required: true })
const emit = defineEmits<{ remove: []; duplicate: [] }>()
const map = useMediaMap()
const { upload } = useUpload()
const metrics = inject<() => { colW: number; rowH: number; gap: number; cols: number }>('grid-metrics')
const picker = ref(false)

const TYPES = {
  heading: { label: 'Titre', icon: Heading },
  text: { label: 'Texte', icon: Type },
  image: { label: 'Image', icon: ImageIcon },
  video: { label: 'Vidéo', icon: Video },
  link: { label: 'Lien', icon: Link2 },
  quote: { label: 'Citation', icon: Quote },
  divider: { label: 'Séparateur', icon: Minus },
} as const

const info = computed(() => TYPES[block.value.type])
const m = computed(() => (block.value.mediaId ? map[block.value.mediaId] || null : null))
const isMedia = computed(() => block.value.type === 'image' || block.value.type === 'video')

const set = <K extends keyof Block>(k: K, v: Block[K]) => (block.value = { ...block.value, [k]: v })
const col = computed({ get: () => block.value.col, set: (v) => set('col', v) })
const row = computed({ get: () => block.value.row, set: (v) => set('row', v) })
const effect = computed<ImageEffect>({ get: () => block.value.effect || 'none', set: (v) => set('effect', v) })
const fit = computed({ get: () => block.value.fit || 'cover', set: (v) => set('fit', v) })
const level = computed({ get: () => block.value.level || 2, set: (v) => set('level', v) })
const variant = computed({ get: () => block.value.variant || 'body', set: (v) => set('variant', v) })
const text = computed({ get: () => block.value.text || { fr: '', en: '' }, set: (v) => set('text', v) })
const caption = computed({ get: () => block.value.caption || { fr: '', en: '' }, set: (v) => set('caption', v) })

async function onFiles(files: File[]) {
  const [res] = await upload(files.slice(0, 1))
  if (res) {
    map[res.id] = res
    block.value = { ...block.value, mediaId: res.id, type: res.kind === 'video' ? 'video' : 'image' }
  }
}

/* ------------------------------------------------ drag to resize (snaps) */
const resizing = ref(false)
const card = ref<HTMLElement | null>(null)
function startResize(e: PointerEvent) {
  if (!metrics || !card.value) return
  e.preventDefault()
  const { colW, rowH, gap, cols } = metrics()
  const rect = card.value.getBoundingClientRect()
  resizing.value = true
  const move = (ev: PointerEvent) => {
    const w = ev.clientX - rect.left
    const h = ev.clientY - rect.top
    const c = Math.min(Math.max(1, Math.round((w + gap) / (colW + gap))), Math.min(3, cols))
    const r = Math.min(4, Math.max(1, Math.round((h + gap) / (rowH + gap))))
    if (c !== block.value.col || r !== block.value.row) block.value = { ...block.value, col: c as Block['col'], row: r as Block['row'] }
  }
  const up = () => {
    resizing.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const effects: { value: ImageEffect; label: string; title: string }[] = [
  { value: 'none', label: 'Orig.', title: 'Original' },
  { value: 'duotone', label: 'Bichro.', title: 'Bichromie bleu & blanc' },
  { value: 'dots', label: 'Pixels', title: 'Pixels ronds' },
]
</script>

<template>
  <div
    ref="card"
    class="bk"
    :class="[`c-${block.col}`, `r-${block.row}`, `bk-${block.type}`, { 'is-hidden': !block.visible, 'is-resizing': resizing }]"
    :data-id="block.id"
  >
    <div class="bk-bar">
      <button type="button" class="bk-handle" title="Glisser pour déplacer" aria-label="Déplacer"><GripVertical /></button>
      <span class="bk-type"><component :is="info.icon" /> {{ info.label }}</span>
      <span class="bk-size a-badge" :title="`${block.col} colonne(s) × ${block.row} ligne(s)`">{{ block.col }}×{{ block.row }}</span>
      <span class="bk-spacer" />
      <button type="button" class="a-btn is-icon is-sm is-ghost" :title="block.visible ? 'Masquer ce bloc' : 'Afficher ce bloc'" @click="set('visible', !block.visible)">
        <Eye v-if="block.visible" /><EyeOff v-else />
      </button>
      <button type="button" class="a-btn is-icon is-sm is-ghost" title="Dupliquer" @click="emit('duplicate')"><Copy /></button>
      <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" title="Supprimer" @click="emit('remove')"><Trash2 /></button>
    </div>

    <div class="bk-body">
      <!-- heading -->
      <template v-if="block.type === 'heading'">
        <AdminI18nField v-model="text" compact :big="level === 2" placeholder="Titre de la section" />
        <AdminSeg v-model="level" :options="[{ value: 2, label: 'Grand' }, { value: 3, label: 'Moyen' }]" />
      </template>

      <!-- text -->
      <template v-else-if="block.type === 'text'">
        <AdminI18nField v-model="text" multiline rich compact :rows="4" placeholder="Écris ton texte…" />
        <AdminSeg v-model="variant" :options="[{ value: 'body', label: 'Normal' }, { value: 'lead', label: 'Introduction' }]" />
      </template>

      <!-- quote -->
      <AdminI18nField v-else-if="block.type === 'quote'" v-model="text" multiline compact :rows="2" placeholder="Une citation, une phrase clé…" />

      <!-- link -->
      <template v-else-if="block.type === 'link'">
        <input :value="block.url" class="a-input" placeholder="https://…" @input="set('url', ($event.target as HTMLInputElement).value)">
        <AdminI18nField v-model="text" compact placeholder="Texte du bouton" />
      </template>

      <!-- divider -->
      <hr v-else-if="block.type === 'divider'" class="bk-hr">

      <!-- image / video -->
      <template v-else-if="isMedia">
        <AdminDropzone class="bk-media" :accept="block.type === 'video' ? 'video/*' : 'image/*,video/*'" :multiple="false" :clickable="!m" @files="onFiles">
          <template v-if="m">
            <DotImage v-if="m.kind === 'image'" :media="m" :effect="effect" :fit="fit" sizes="400px" :seed="block.id" />
            <video v-else :src="m.url" muted playsinline preload="metadata" class="bk-video" :class="{ 'is-duo': effect === 'duotone', 'is-contain': fit === 'contain' }" />
          </template>
          <div v-else class="bk-media-empty">
            <Upload /> <span>Glisser une {{ block.type === 'video' ? 'vidéo' : 'image' }} ou cliquer</span>
          </div>
          <div class="bk-media-actions" @click.stop>
            <button type="button" class="a-btn is-sm" @click="picker = true"><Images /> {{ m ? 'Changer' : 'Médiathèque' }}</button>
          </div>
        </AdminDropzone>
        <div class="bk-media-opts">
          <AdminSeg v-if="block.type === 'image'" v-model="effect" :options="effects" />
          <AdminSeg v-else v-model="effect" :options="effects.slice(0, 2)" />
          <AdminSeg v-model="fit" :options="[{ value: 'cover', label: 'Remplir', title: 'Remplir le cadre (recadre)' }, { value: 'contain', label: 'Entière', title: 'Image entière' }]" />
          <AdminSwitch v-if="block.type === 'video'" :model-value="!!block.autoplay" @update:model-value="set('autoplay', $event)">Lecture auto</AdminSwitch>
        </div>
        <AdminI18nField v-model="caption" compact placeholder="Légende (optionnelle)" />
        <AdminMediaPicker :open="picker" :kind="block.type === 'video' ? 'video' : 'image'" @close="picker = false" @select="(x) => set('mediaId', x.id)" />
      </template>
    </div>

    <div class="bk-foot">
      <AdminSeg v-model="col" label="Largeur" :options="[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]" />
      <AdminSeg v-model="row" label="Hauteur" :options="[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]" />
    </div>
    <button type="button" class="bk-resize" title="Glisser pour redimensionner" aria-label="Redimensionner" @pointerdown="startResize"><MoveDiagonal2 /></button>
  </div>
</template>

<style>
.bk {
  --r: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 4px;
  transition: border-color .2s, box-shadow .2s, opacity .2s;
}
.bk:hover, .bk:focus-within { border-color: color-mix(in srgb, var(--blue) 45%, transparent); }
.bk.is-resizing { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue); z-index: 3; }
.bk.is-hidden { opacity: .55; background: repeating-linear-gradient(135deg, #fff 0 10px, color-mix(in srgb, var(--blue) 4%, #fff) 10px 20px); }
.bk.c-1 { grid-column: span 1; }
.bk.c-2 { grid-column: span 2; }
.bk.c-3 { grid-column: 1 / -1; }
.bk.r-2 { --r: 2; grid-row: span 2; }
.bk.r-3 { --r: 3; grid-row: span 3; }
.bk.r-4 { --r: 4; grid-row: span 4; }
.bk-image, .bk-video { min-height: calc(var(--r) * var(--bc-row) + (var(--r) - 1) * var(--bc-gap)); }

.bk-bar { display: flex; align-items: center; gap: 4px; padding: 5px 6px; border-bottom: 1px solid var(--line); min-width: 0; }
.bk-handle { display: grid; place-items: center; width: 26px; height: 26px; border: 0; border-radius: 3px; background: none; color: var(--muted); cursor: grab; touch-action: none; }
.bk-handle:hover { background: color-mix(in srgb, var(--blue) 9%, transparent); color: var(--blue); }
.bk-handle:active { cursor: grabbing; }
.bk-handle svg, .bk-type svg { width: 15px; height: 15px; }
.bk-type { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.bk-spacer { flex: 1; }
.bk-body { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 10px; min-width: 0; }
.bk-foot { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 6px 10px 8px; border-top: 1px dashed var(--line); }
.bk-foot .a-label { font-size: 9.5px; }
.bk-hr { border: 0; border-top: 1px solid var(--line-strong); margin: 10px 0; }
.bk-resize {
  position: absolute; right: -1px; bottom: -1px; z-index: 2;
  display: grid; place-items: center; width: 22px; height: 22px;
  border: 0; border-radius: 4px 0 4px 0; background: var(--blue); color: #fff;
  cursor: nwse-resize; touch-action: none; opacity: 0; transition: opacity .2s;
}
.bk-resize svg { width: 13px; height: 13px; }
.bk:hover .bk-resize, .bk.is-resizing .bk-resize { opacity: 1; }

.bk-media { position: relative; flex: 1; min-height: 110px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--blue) 5%, #fff); border: 1.5px dashed transparent; }
.bk-media.is-over { border-color: var(--blue); }
.bk-media .dimg { position: absolute; inset: 0; }
.bk-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: var(--blue); }
.bk-video.is-contain { object-fit: contain; }
.bk-video.is-duo { filter: grayscale(1) contrast(1.1); mix-blend-mode: screen; }
.bk-media:has(.bk-video.is-duo) { background: var(--blue); }
.bk-media-empty { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 6px; padding: 10px; text-align: center; font-size: 12.5px; color: var(--muted); cursor: pointer; }
.bk-media-empty svg { width: 20px; height: 20px; }
.bk-media-actions { position: absolute; right: 6px; top: 6px; z-index: 3; opacity: 0; transition: opacity .2s; }
.bk-media:hover .bk-media-actions, .bk-media:not(:has(.dimg, video)) .bk-media-actions { opacity: 1; }
.bk-media-opts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }

@media (hover: none) {
  .bk-resize, .bk-media-actions { opacity: 1; }
}
</style>

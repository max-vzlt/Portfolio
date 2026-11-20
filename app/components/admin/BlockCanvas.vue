<script setup lang="ts">
import Sortable from 'sortablejs'
import { Heading, Type, Image as ImageIcon, Video, Link2, Quote, Minus, Upload, Plus } from 'lucide-vue-next'
import type { Block, BlockType } from '#shared/types'

/** The 3-column editor of a project's content: drag to reorder, resize, drop files. */
const blocks = defineModel<Block[]>({ required: true })
const grid = ref<HTMLElement | null>(null)
const map = useMediaMap()
const { upload, items } = useUpload()

provide('grid-metrics', () => {
  const el = grid.value!
  const cs = getComputedStyle(el)
  const gap = parseFloat(cs.columnGap) || 12
  const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 3
  const colW = (el.clientWidth - gap * (cols - 1)) / cols
  const rowH = parseFloat(cs.getPropertyValue('--bc-row')) || 96
  return { colW, rowH, gap, cols }
})

let sortable: Sortable | null = null
onMounted(() => {
  if (!grid.value) return
  sortable = Sortable.create(grid.value, {
    handle: '.bk-handle',
    animation: 220,
    easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)',
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 3,
    ghostClass: 'bk-ghost',
    chosenClass: 'bk-chosen',
    dragClass: 'bk-drag',
    scroll: true,
    scrollSensitivity: 90,
    onEnd(evt) {
      const { oldIndex, newIndex, item, from } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      // Put the DOM back where Vue expects it, then move the data.
      from.removeChild(item)
      from.insertBefore(item, from.children[oldIndex] ?? null)
      const arr = [...blocks.value]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved!)
      blocks.value = arr
    },
  })
})
onBeforeUnmount(() => sortable?.destroy())

const uid = () => `b_${Math.random().toString(36).slice(2, 10)}`
const empty = () => ({ fr: '', en: '' })
function make(type: BlockType, extra: Partial<Block> = {}): Block {
  const base: Record<BlockType, Partial<Block>> = {
    heading: { col: 3, row: 1, text: empty(), level: 2 },
    text: { col: 2, row: 1, text: empty(), variant: 'body' },
    image: { col: 1, row: 1, mediaId: null, effect: 'duotone', fit: 'cover', caption: empty() },
    video: { col: 2, row: 2, mediaId: null, effect: 'none', fit: 'cover', caption: empty(), autoplay: false },
    link: { col: 1, row: 1, url: '', text: empty() },
    quote: { col: 2, row: 1, text: empty() },
    divider: { col: 3, row: 1 },
  }
  return { id: uid(), type, visible: true, ...(base[type] as any), ...extra }
}
function add(type: BlockType) {
  const b = make(type)
  blocks.value = [...blocks.value, b]
  nextTick(() => grid.value?.querySelector(`[data-id="${b.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}
function remove(i: number) {
  const b = blocks.value[i]
  const hasContent = b && (b.text?.fr || b.text?.en || b.mediaId)
  if (hasContent && !window.confirm('Supprimer ce bloc ?')) return
  blocks.value = blocks.value.filter((_, k) => k !== i)
}
function duplicate(i: number) {
  const arr = [...blocks.value]
  arr.splice(i + 1, 0, { ...structuredClone(toRaw(arr[i]!)), id: uid() })
  blocks.value = arr
}

async function onFiles(files: File[]) {
  const res = await upload(files)
  const added = res.map((m) => {
    map[m.id] = m
    return m.kind === 'video' ? make('video', { mediaId: m.id, effect: 'duotone', autoplay: true }) : make('image', { mediaId: m.id })
  })
  blocks.value = [...blocks.value, ...added]
}

const tools: { type: BlockType; label: string; icon: any }[] = [
  { type: 'heading', label: 'Titre', icon: Heading },
  { type: 'text', label: 'Texte', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'video', label: 'Vidéo', icon: Video },
  { type: 'link', label: 'Lien', icon: Link2 },
  { type: 'quote', label: 'Citation', icon: Quote },
  { type: 'divider', label: 'Séparateur', icon: Minus },
]
</script>

<template>
  <div class="bc">
    <div class="bc-tools">
      <span class="a-label"><Plus /> Ajouter</span>
      <button v-for="t in tools" :key="t.type" type="button" class="a-btn is-sm" @click="add(t.type)">
        <component :is="t.icon" /> {{ t.label }}
      </button>
    </div>

    <AdminDropzone class="bc-drop" accept="image/*,video/*" :clickable="false" @files="onFiles">
      <template #default="{ over }">
        <div ref="grid" class="bc-grid">
          <AdminBlockCard
            v-for="(b, i) in blocks"
            :key="b.id"
            v-model="blocks[i]!"
            @remove="remove(i)"
            @duplicate="duplicate(i)"
          />
        </div>
        <div v-if="!blocks.length" class="bc-empty a-empty">
          Ajoute des blocs avec les boutons ci-dessus,<br>ou glisse directement des images et vidéos ici.
        </div>
        <div v-if="items.length" class="bc-uploads">
          <div v-for="u in items" :key="u.key" class="bc-upload">
            <span>{{ u.name }}</span>
            <i :style="{ width: `${Math.round(u.progress * 100)}%` }" />
          </div>
        </div>
        <div class="bc-hint a-hint"><Upload /> Glisse des images ou vidéos depuis ton ordinateur pour créer des blocs · poignée ⠿ pour déplacer · coin ↘ pour redimensionner</div>
        <Transition name="fade">
          <div v-if="over" class="bc-over"><Upload /> Dépose pour ajouter des blocs</div>
        </Transition>
      </template>
    </AdminDropzone>
  </div>
</template>

<style>
.bc { display: grid; gap: 12px; }
.bc-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.bc-tools .a-label { margin-right: 4px; display: inline-flex; gap: 4px; }
.bc-tools .a-label svg { width: 12px; height: 12px; }
.bc-drop { position: relative; display: grid; gap: 10px; padding: 12px; border: 1.5px dashed transparent; border-radius: 6px; background: color-mix(in srgb, var(--blue) 4%, var(--paper)); }
.bc-drop.is-over { border-color: var(--blue); }
.bc-grid {
  --bc-row: 96px;
  --bc-gap: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: auto;
  grid-auto-flow: row dense;
  gap: var(--bc-gap);
}
.bc-empty { border: 1px dashed var(--line-strong); border-radius: 4px; }
.bc-hint { display: flex; align-items: center; gap: 6px; }
.bc-hint svg { width: 14px; height: 14px; flex: none; }
.bc-over {
  position: absolute; inset: 0; z-index: 10;
  display: grid; place-content: center; justify-items: center; gap: 8px;
  background: color-mix(in srgb, var(--blue) 82%, transparent); color: #fff; border-radius: 6px;
  font-family: var(--font-display); font-size: 20px; letter-spacing: .04em; text-transform: uppercase;
  pointer-events: none;
}
.bc-over svg { width: 30px; height: 30px; }
.bc-uploads { display: grid; gap: 6px; }
.bc-upload { position: relative; padding: 6px 10px; background: #fff; border: 1px solid var(--line); border-radius: 3px; font-size: 12px; overflow: hidden; }
.bc-upload i { position: absolute; left: 0; bottom: 0; height: 2px; background: var(--blue); transition: width .2s; }
.bk-ghost { opacity: .35; border-style: dashed; border-color: var(--blue); }
.bk-drag { box-shadow: 0 30px 60px -25px rgba(9, 11, 208, .6); transform: rotate(1deg); }
@media (max-width: 760px) {
  .bc-grid { grid-template-columns: 1fr; }
  .bk.c-2, .bk.c-3 { grid-column: auto; }
  .bk { grid-row: auto !important; }
}
</style>

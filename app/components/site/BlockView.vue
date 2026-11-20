<script setup lang="ts">
import { ArrowUpRight, Maximize2 } from 'lucide-vue-next'
import type { Block, MediaMap } from '#shared/types'

const props = defineProps<{ block: Block; media: MediaMap }>()
const emit = defineEmits<{ zoom: [id: string] }>()
const { tr } = useI18n()

const m = computed(() => (props.block.mediaId ? props.media[props.block.mediaId] || null : null))
const caption = computed(() => tr(props.block.caption))
const host = computed(() => {
  try {
    return props.block.url ? new URL(props.block.url, 'https://x.local').hostname.replace(/^www\./, '').replace('x.local', '') : ''
  } catch {
    return ''
  }
})
// natural proportions, used on phones (single column)
const ratio = computed(() => {
  const media = m.value
  if (media?.width && media?.height) return Math.min(2.2, Math.max(0.6, media.width / media.height)).toFixed(3)
  return props.block.type === 'video' ? '1.778' : '1.333'
})
const external = computed(() => /^https?:/i.test(props.block.url || ''))
const sizes = computed(() =>
  props.block.col === 3 ? '(max-width: 1023px) 100vw, 1240px' : props.block.col === 2 ? '(max-width: 1023px) 100vw, 820px' : '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px',
)
</script>

<template>
  <div class="blk" :class="[`blk-${block.type}`, `c-${block.col}`, `r-${block.row}`]" :style="{ '--ar': ratio }" v-reveal>
    <template v-if="block.type === 'heading'">
      <h2 v-if="block.level !== 3" class="display-l">{{ tr(block.text) }}</h2>
      <h3 v-else class="display-m">{{ tr(block.text) }}</h3>
    </template>

    <SiteRichText v-else-if="block.type === 'text'" :text="tr(block.text)" :class="{ lead: block.variant === 'lead' }" />

    <blockquote v-else-if="block.type === 'quote'" class="blk-quote">
      <span class="blk-quote-mark" aria-hidden="true">“</span>
      <SiteRichText :text="tr(block.text)" class="display-s" />
    </blockquote>

    <a v-else-if="block.type === 'link' && block.url" :href="block.url" class="blk-linkbox" :target="external ? '_blank' : undefined" :rel="external ? 'noopener' : undefined">
      <span class="label muted">{{ host || 'Lien' }}</span>
      <span class="display-s">{{ tr(block.text) || block.url }}</span>
      <ArrowUpRight class="blk-link-arrow" aria-hidden="true" />
    </a>

    <hr v-else-if="block.type === 'divider'" class="blk-hr">

    <figure v-else-if="block.type === 'image'" class="blk-fig">
      <button v-if="m" type="button" class="blk-media blk-zoom" :aria-label="caption || tr(m.alt) || 'Image'" @click="emit('zoom', block.id)">
        <DotImage :media="m" :effect="block.effect" :fit="block.fit" :alt="tr(m.alt) || caption" :parallax="block.row > 1 ? 0.06 : 0.04" :sizes="sizes" :seed="block.id" />
        <span class="blk-zoom-ico" aria-hidden="true"><Maximize2 /></span>
      </button>
      <div v-else class="blk-media"><DotImage :seed="block.id" /></div>
      <figcaption v-if="caption" class="label">{{ caption }}</figcaption>
    </figure>

    <figure v-else-if="block.type === 'video'" class="blk-fig">
      <div class="blk-media">
        <SiteVideo v-if="m" :media="m" :effect="block.effect" :autoplay="block.autoplay" :fit="block.fit" :label="caption" />
        <DotImage v-else :seed="block.id" />
      </div>
      <figcaption v-if="caption" class="label">{{ caption }}</figcaption>
    </figure>
  </div>
</template>

<style>
/* Grid of a project page. Rows are content-sized; media blocks get a minimum
   height of N × --row so "2 rows" really means two rows of the grid. */
.blocks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: auto;
  grid-auto-flow: row dense;
  gap: var(--gap);
}
.blk { --r: 1; position: relative; min-width: 0; }
.blk.c-1 { grid-column: span 1; }
.blk.c-2 { grid-column: span 2; }
.blk.c-3 { grid-column: 1 / -1; }
.blk.r-2 { --r: 2; grid-row: span 2; }
.blk.r-3 { --r: 3; grid-row: span 3; }
.blk.r-4 { --r: 4; grid-row: span 4; }
.blk-image, .blk-video {
  display: flex;
  min-height: calc(var(--r) * var(--row) + (var(--r) - 1) * var(--gap));
}

.blk-heading, .blk-text, .blk-quote, .blk-link { align-self: start; }
.blk-heading h2 { margin-top: clamp(8px, 2vw, 28px); }
.blk-text .rich { max-width: 68ch; }
.blk-text.c-1 .rich { font-size: 15px; }
.blk-divider { align-self: center; padding-block: 8px; }
.blk-hr { border: 0; border-top: 1px solid var(--line-strong); margin: 0; }

.blk-quote { position: relative; padding-left: 0.9em; border-left: 1px solid var(--line-strong); }
.blk-quote-mark { position: absolute; left: 0.15em; top: -0.12em; font-family: var(--font-display); font-size: 3.4rem; line-height: 1; color: var(--accent); opacity: 0.5; }
.blk-quote .rich { padding-left: 0.6em; }

.blk-linkbox {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 20px 56px 20px 20px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  transition: background 0.3s var(--ease), color 0.3s var(--ease);
}
.blk-linkbox:hover { background: var(--blue); color: var(--paper); border-color: var(--blue); }
.blk-linkbox:hover .muted { color: inherit; opacity: 0.75; }
.blk-link-arrow { position: absolute; right: 18px; top: 18px; width: 26px; height: 26px; stroke-width: 1.2; transition: transform 0.4s var(--ease); }
.blk-linkbox:hover .blk-link-arrow { transform: translate(3px, -3px); }

.blk-fig { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.blk-media { position: relative; flex: 1; min-height: 120px; border-radius: var(--radius); overflow: hidden; }
.blk-media > .dimg { position: absolute; inset: 0; }
.blk-zoom { display: block; width: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; text-align: left; }
.blk-zoom .dimg { position: absolute; inset: 0; transition: transform 0.9s var(--ease); }
.blk-zoom:hover .dimg { transform: scale(1.025); }
.blk-zoom-ico {
  position: absolute; right: 10px; top: 10px; z-index: 2;
  display: grid; place-items: center; width: 34px; height: 34px;
  background: var(--paper); color: var(--blue); border-radius: var(--radius);
  opacity: 0; transform: scale(0.9); transition: opacity 0.3s, transform 0.3s var(--ease);
}
.blk-zoom-ico svg { width: 16px; height: 16px; }
.blk-zoom:hover .blk-zoom-ico, .blk-zoom:focus-visible .blk-zoom-ico { opacity: 1; transform: none; }
.blk-fig figcaption { color: var(--muted); }

@media (max-width: 1023px) {
  .blocks { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .blk.c-2, .blk.c-3 { grid-column: 1 / -1; }
}
@media (max-width: 639px) {
  .blocks { grid-template-columns: minmax(0, 1fr); }
  .blk { grid-row: auto !important; }
  .blk-image, .blk-video { min-height: 0; }
  .blk-media { flex: none; aspect-ratio: var(--ar, 4 / 3); min-height: 0; }
}
</style>

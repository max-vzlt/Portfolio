<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import type { Category, ProjectCard, PublicMedia } from '#shared/types'

const props = defineProps<{
  project: ProjectCard
  index: number
  categories: Category[]
  cover: PublicMedia | null
}>()
const { tr, lp, t } = useI18n()

const cats = computed(() =>
  props.project.categoryIds.map((id) => props.categories.find((c) => c.id === id)).filter(Boolean).map((c) => tr(c!.name)),
)
const num = computed(() => String(props.index + 1).padStart(2, '0'))
const sizes = computed(() => {
  const c = props.project.card.col
  return c === 3 ? '(max-width: 1023px) 100vw, 1240px' : c === 2 ? '(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 820px' : '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px'
})
</script>

<template>
  <article class="pcard" :class="[`c-${project.card.col}`, `r-${project.card.row}`]">
    <NuxtLink :to="lp(`/work/${project.slug}`)" class="pcard-link" :aria-label="`${t('work.open')} : ${tr(project.title)}`">
      <p class="label pcard-meta">
        <span>{{ num }}</span>
        <span v-for="c in cats" :key="c">{{ c }}</span>
        <span v-if="project.year" class="pcard-year">{{ project.year }}</span>
      </p>
      <h3 class="display-m pcard-title">
        <span class="pcard-title-text">{{ tr(project.title) }}</span>
        <ArrowUpRight class="pcard-arrow" aria-hidden="true" />
      </h3>
      <p v-if="tr(project.summary)" class="pcard-summary">{{ plainText(tr(project.summary)) }}</p>
      <div class="pcard-media">
        <DotImage
          :media="cover"
          :effect="project.coverEffect"
          :alt="cover ? tr(cover.alt) || tr(project.title) : tr(project.title)"
          :seed="project.id"
          :parallax="0.16"
          :sizes="sizes"
        />
      </div>
    </NuxtLink>
  </article>
</template>

<style>
.pcard { min-width: 0; }
.pcard.c-2 { grid-column: span 2; }
.pcard.c-3 { grid-column: 1 / -1; }
.pcard-link { display: flex; flex-direction: column; height: 100%; }
.pcard-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-bottom: 14px; color: var(--muted); }
.pcard-meta span:first-child { color: var(--fg); }
.pcard-year { margin-left: auto; }
.pcard-title { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
.pcard-title-text {
  background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
  transition: background-size 0.55s var(--ease);
}
.pcard-arrow {
  flex: none;
  width: 0.62em;
  height: 0.62em;
  margin-top: 0.12em;
  stroke-width: 1.2;
  opacity: 0;
  transform: translate(-8px, 8px);
  transition: opacity 0.35s var(--ease), transform 0.45s var(--ease);
}
.pcard-summary {
  max-width: 46ch;
  margin-bottom: 22px;
  font-size: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pcard-media {
  position: relative;
  margin-top: auto;
  height: var(--card-h);
  border-radius: var(--radius);
  overflow: hidden;
}
.pcard.r-2 .pcard-media { height: calc(var(--card-h) * 2 + var(--gap)); }
.pcard-media .dimg { transition: transform 0.9s var(--ease); }
.pcard-link:hover .pcard-media .dimg { transform: scale(1.035); }
.pcard-link:hover .pcard-arrow, .pcard-link:focus-visible .pcard-arrow { opacity: 1; transform: none; }
.pcard-link:hover .pcard-title-text { background-size: 100% 1px; }

@media (max-width: 1023px) {
  .pcard.c-2, .pcard.c-3 { grid-column: 1 / -1; }
}
@media (max-width: 639px) {
  .pcard.r-2 .pcard-media { height: calc(var(--card-h) * 1.5); }
  .pcard-arrow { opacity: 1; transform: none; }
}
</style>

<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, ArrowRight, EyeOff } from 'lucide-vue-next'
import type { ProjectPayload } from '#shared/types'
import type { LightboxItem } from '~/composables/useLightbox'

definePageMeta({
  validate: (route) => !route.params.lang || route.params.lang === 'en',
})

const route = useRoute()
const { t, tr, lp, lang } = useI18n()
const lightbox = useLightbox()
const preview = computed(() => route.query.preview !== undefined)

const { data, error } = await useFetch<ProjectPayload>(() => `/api/projects/${route.params.slug}`, {
  key: `project-${route.params.slug}${preview.value ? '-preview' : ''}`,
  query: computed(() => (preview.value ? { preview: 1 } : {})),
})
if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Projet introuvable', fatal: true })
}

const p = computed(() => data.value!.project)
const m = (id?: string | null) => (id && data.value?.media[id]) || null
const cats = computed(() =>
  p.value.categoryIds.map((id) => data.value!.categories.find((c) => c.id === id)).filter(Boolean).map((c) => tr(c!.name)),
)
const cover = computed(() => m(p.value.coverId))
const nextImg = ref<{ setReveal: (on: boolean, x: number, y: number) => void } | null>(null)
const nextHover = (e: PointerEvent, on: boolean) => {
  if (e.pointerType === 'mouse') nextImg.value?.setReveal(on, e.clientX, e.clientY)
}
const titleWords = computed(() => tr(p.value.title).split(/\s+/).filter(Boolean))
const external = computed(() => /^https?:/i.test(p.value.link.url))

// images and videos of the page, in reading order, for the viewer
const galleryBlocks = computed(() => p.value.blocks.filter((b) => (b.type === 'image' || b.type === 'video') && b.mediaId && m(b.mediaId)))
const gallery = computed<LightboxItem[]>(() =>
  galleryBlocks.value.map((b) => ({ media: m(b.mediaId)!, effect: b.effect || 'none', caption: tr(b.caption) })),
)
function zoom(blockId: string) {
  const i = galleryBlocks.value.findIndex((b) => b.id === blockId)
  if (i >= 0) lightbox.open(gallery.value, i)
}

useSeo({
  title: () => `${tr(p.value.title)} — Maxime Verzeletti`,
  description: () => plainText(tr(p.value.summary)).slice(0, 200),
  image: () => cover.value?.url,
})
if (!p.value.visible) useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

// structured data + Markdown twin for search engines and AI tools
const { data: site } = useSite()
const siteOrigin = useSiteOrigin()
useJsonLd(() => {
  if (!data.value) return null
  const path = `${lang.value === 'en' ? '/en' : ''}/work/${p.value.slug}`
  const graph: Record<string, unknown>[] = [
    projectLd(siteOrigin, p.value, { tr, lang: lang.value, categories: data.value.categories, media: data.value.media, path }),
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('nav.home'), item: `${siteOrigin}${lp('/')}` },
        { '@type': 'ListItem', position: 2, name: tr(p.value.title), item: `${siteOrigin}${path}` },
      ],
    },
  ]
  if (site.value) graph.push(personLd(siteOrigin, site.value.settings, tr, site.value.media))
  return { '@context': 'https://schema.org', '@graph': graph }
})
useMarkdownAlternate(() => `${lang.value === 'en' ? '/en' : ''}/work/${p.value.slug}.md`)
</script>

<template>
  <article v-if="data" class="project">
    <p v-if="!p.visible" class="preview-banner label"><EyeOff aria-hidden="true" /> {{ t('project.preview') }}</p>

    <!-- ===================================================== HEAD -->
    <header class="proj-hero tone-blue">
      <div class="wrap">
        <NuxtLink :to="{ path: lp('/'), hash: '#work' }" class="proj-back nav-label enter" @click="pin()">
          <ArrowLeft aria-hidden="true" /> <span class="link-underline">{{ t('project.back') }}</span>
        </NuxtLink>
        <div class="proj-head grid3">
          <div class="proj-title-wrap">
            <p class="label proj-kicker enter" style="--i: 1">
              <span v-for="c in cats" :key="c">{{ c }}</span>
              <span v-if="p.year">{{ p.year }}</span>
            </p>
            <h1 class="display-xl proj-title" :aria-label="tr(p.title)">
              <template v-for="(w, i) in titleWords" :key="i"><span class="enter-mask" aria-hidden="true"><span class="enter-word" :style="{ '--i': i + 2 }">{{ w }}</span></span>{{ ' ' }}</template>
            </h1>
          </div>
          <div class="proj-side enter" style="--i: 4">
            <SiteRichText v-if="tr(p.summary)" :text="tr(p.summary)" class="proj-summary" />
            <dl class="proj-meta">
              <div v-if="cats.length">
                <dt class="label">{{ t('project.category') }}</dt>
                <dd>{{ cats.join(' · ') }}</dd>
              </div>
              <div v-if="p.year">
                <dt class="label">{{ t('project.year') }}</dt>
                <dd>{{ p.year }}</dd>
              </div>
              <div v-if="p.tools.length">
                <dt class="label">{{ t('project.tools') }}</dt>
                <dd class="proj-tools"><span v-for="tool in p.tools" :key="tool" class="chip">{{ tool }}</span></dd>
              </div>
            </dl>
            <a
              v-if="p.link.url"
              :href="p.link.url"
              class="btn btn-solid"
              :target="external ? '_blank' : undefined"
              :rel="external ? 'noopener' : undefined"
            >
              {{ tr(p.link.label) || t('project.visit') }} <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </header>

    <div class="proj-cover-band">
      <div class="wrap">
        <div class="proj-cover enter-media">
          <DotImage
            :media="cover"
            :effect="p.coverEffect"
            :alt="tr(cover?.alt) || tr(p.title)"
            :seed="p.id"
            :parallax="0.22"
            reveal
            sizes="(max-width: 1023px) 100vw, 1240px"
            eager
          />
        </div>
      </div>
    </div>

    <!-- ===================================================== BODY -->
    <section v-if="p.blocks.length" class="proj-body tone-paper guides">
      <div class="wrap blocks">
        <SiteBlockView v-for="b in p.blocks" :key="b.id" :block="b" :media="data.media" @zoom="zoom" />
      </div>
    </section>

    <!-- ===================================================== NEXT -->
    <nav v-if="data.next" class="proj-next tone-blue" :aria-label="t('project.next')">
      <NuxtLink
        :to="lp(`/work/${data.next.slug}`)"
        class="wrap proj-next-link"
        @pointerenter="nextHover($event, true)"
        @pointerleave="nextHover($event, false)"
      >
        <div class="proj-next-text">
          <p class="label">{{ t('project.next') }}</p>
          <p class="display-l">{{ tr(data.next.title) }} <ArrowRight class="proj-next-arrow" aria-hidden="true" /></p>
        </div>
        <div class="proj-next-media">
          <DotImage ref="nextImg" reveal reveal-on="parent" :media="m(data.next.coverId)" :effect="data.next.coverEffect" :seed="data.next.slug" :parallax="0.2" sizes="400px" />
        </div>
      </NuxtLink>
    </nav>
  </article>
</template>

<style>
.preview-banner {
  position: fixed; left: 50%; bottom: 16px; z-index: 60; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: var(--blue-deep); color: var(--paper); border-radius: 4px; white-space: nowrap;
}
.preview-banner svg { width: 15px; height: 15px; }

.proj-hero {
  position: relative;
  padding: calc(var(--header-h) + clamp(32px, 5vw, 72px)) 0 clamp(150px, 18vw, 260px);
  overflow: hidden;
}
.proj-back { display: inline-flex; align-items: center; gap: 10px; margin-bottom: clamp(36px, 6vw, 80px); opacity: 0.85; }
.proj-back svg { width: 16px; height: 16px; transition: transform 0.35s var(--ease); }
.proj-back:hover { opacity: 1; }
.proj-back:hover svg { transform: translateX(-4px); }
.proj-head { align-items: end; }
.proj-title-wrap { grid-column: span 2; }
.proj-kicker { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-bottom: 20px; }
.proj-title { overflow-wrap: anywhere; }
.proj-side { display: grid; gap: 22px; align-content: end; justify-items: start; }
.proj-summary { font-size: 15.5px; color: color-mix(in srgb, var(--paper) 88%, var(--blue)); }
.proj-summary strong { color: var(--white); }
.proj-meta { display: grid; width: 100%; border-top: 1px solid var(--line); }
.proj-meta > div { display: grid; grid-template-columns: 6.5em 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 14.5px; }
.proj-meta dt { padding-top: 2px; opacity: 0.7; }
.proj-tools { display: flex; flex-wrap: wrap; gap: 6px; }
.proj-tools .chip { border-color: var(--line-strong); }

.proj-cover-band { position: relative; margin-top: calc(-1 * clamp(110px, 14vw, 210px)); }
.proj-cover-band::after { content: ''; position: absolute; inset: 50% 0 0; background: var(--paper); z-index: -1; }
.proj-cover { position: relative; height: clamp(300px, 52vw, 680px); border-radius: var(--radius); overflow: hidden; box-shadow: 0 40px 80px -50px rgba(9, 11, 208, 0.6); }

.proj-body { padding: clamp(64px, 9vw, 130px) 0 clamp(80px, 10vw, 150px); }

.proj-next { position: relative; overflow: hidden; }
.proj-next-link {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--gap);
  padding-block: clamp(56px, 8vw, 110px);
}
.proj-next-text .label { margin-bottom: 16px; opacity: 0.75; }
.proj-next-arrow { display: inline-block; width: 0.5em; height: 0.5em; stroke-width: 1; vertical-align: middle; transition: transform 0.5s var(--ease); }
.proj-next-link:hover .proj-next-arrow { transform: translateX(12px); }
.proj-next-media { position: relative; aspect-ratio: 4 / 3; border-radius: var(--radius); overflow: hidden; }

@media (max-width: 1023px) {
  .proj-title-wrap { grid-column: 1 / -1; }
  .proj-side { grid-column: 1 / -1; grid-template-columns: 1fr 1fr; align-items: start; }
  .proj-side .btn { grid-column: 1 / -1; }
}
@media (max-width: 639px) {
  .proj-side { grid-template-columns: 1fr; }
  .proj-next-link { grid-template-columns: 1fr; }
  .proj-next-media { order: -1; aspect-ratio: 16 / 9; }
}
</style>

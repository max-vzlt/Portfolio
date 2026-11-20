<script setup lang="ts">
import { ArrowDown, ArrowUpRight, Download, Mail } from 'lucide-vue-next'

definePageMeta({
  validate: (route) => !route.params.lang || route.params.lang === 'en',
})

const { t, tr, lang } = useI18n()
const { data, media, cvUrl } = useSite()
const route = useRoute()
const router = useRouter()
const active = useActiveSection()
const { scrollTo } = useSmoothScroll()

const s = computed(() => data.value?.settings)
const projects = computed(() => data.value?.projects || [])
const categories = computed(() => {
  const all = data.value?.categories || []
  return all
    .map((c) => ({ ...c, count: projects.value.filter((p) => p.categoryIds.includes(c.id)).length }))
    .filter((c) => c.count > 0)
})

/* ---------- filter (kept in the URL: ?cat=slug) ---------- */
const filter = computed({
  get: () => (typeof route.query.cat === 'string' ? route.query.cat : ''),
  set: (v: string) => {
    router.replace({ query: { ...route.query, cat: v || undefined } })
  },
})
const filtered = computed(() => {
  const cat = categories.value.find((c) => c.slug === filter.value)
  return cat ? projects.value.filter((p) => p.categoryIds.includes(cat.id)) : projects.value
})

/* ---------- hero console tabs ---------- */
const tab = ref(0)
const tabs = computed(() => s.value?.hero.tabs || [])

/* ---------- active section for the header ---------- */
let io: IntersectionObserver | null = null
onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) active.value = e.target.id
    },
    { rootMargin: '-45% 0px -50% 0px' },
  )
  document.querySelectorAll('section[data-nav]').forEach((el) => io!.observe(el))
})
onBeforeUnmount(() => {
  io?.disconnect()
  active.value = ''
})

useSeo({
  title: () => `${s.value?.name || 'Maxime Verzeletti'} — ${tr(s.value?.role) || 'Portfolio'}`,
  description: () => tr(s.value?.seo.description) || plainText(tr(s.value?.hero.intro)),
  image: () => media(s.value?.hero.imageId)?.url,
})

const heroTitle = computed(() => tr(s.value?.hero.title))
const mailto = computed(() => (s.value?.contact.email ? `mailto:${s.value.contact.email}` : ''))
const allLinks = computed(() => {
  const list = [...(s.value?.socials || [])].map((x) => ({ label: x.label, url: x.url, kind: 'social' as const }))
  if (mailto.value) list.unshift({ label: 'Email', url: mailto.value, kind: 'social' })
  return list
})
const hostOf = (url: string) => {
  if (url.startsWith('mailto:')) return url.slice(7)
  try {
    return new URL(url).hostname.replace(/^www\./, '') + new URL(url).pathname.replace(/\/$/, '')
  } catch {
    return url
  }
}

/* ---------- sections: order / visibility from the back-office ---------- */
const sections = computed(() =>
  (s.value?.home?.sections || [{ id: 'work', visible: true }, { id: 'about', visible: true }, { id: 'skills', visible: true }, { id: 'contact', visible: true }])
    .filter((x) => x.visible)
    .map((x, i) => ({ id: x.id, index: String(i + 1).padStart(2, '0') })),
)
const workTitle = computed(() => tr(s.value?.home?.work.title) || t('work.title'))
const showFilters = computed(() => s.value?.home?.work.filters !== false && categories.value.length > 1)
const heroWords = computed(() => heroTitle.value.split(/\s+/).filter(Boolean))
const { pin } = useHeaderPin()
watch(sections, () => nextTick(() => {
  io?.disconnect()
  document.querySelectorAll('section[data-nav]').forEach((el) => io?.observe(el))
}))

/* ---------- live preview from /admin/home (iframe + postMessage) ---------- */
if (import.meta.client && route.query.preview !== undefined) {
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return
    if (e.data?.type === 'mv-preview-scroll') {
      const id = String(e.data.id || '')
      return id === 'top' ? scrollTo(0) : scrollTo(`#${id}`)
    }
    if (e.data?.type !== 'mv-preview' || !data.value) return
    data.value = {
      ...data.value,
      settings: e.data.settings,
      media: { ...data.value.media, ...(e.data.media || {}) },
    }
  }
  onMounted(() => {
    window.addEventListener('message', onMessage)
    window.parent?.postMessage({ type: 'mv-preview-ready' }, window.location.origin)
  })
  onBeforeUnmount(() => window.removeEventListener('message', onMessage))
}
</script>


<template>
  <div v-if="s" :key="lang">
    <!-- ===================================================== HERO -->
    <section id="top" class="hero tone-blue">
      <div class="hero-frame" aria-hidden="true" />
      <div class="wrap hero-grid">
        <div class="hero-text">
          <p class="label hero-kicker enter" style="--i: 0">
            <span class="hero-dot" aria-hidden="true" />
            {{ tr(s.hero.kicker) }} — {{ tr(s.role) }}
          </p>
          <h1 class="display-xl hero-title" :aria-label="heroTitle">
            <template v-for="(w, i) in heroWords" :key="i"><span class="enter-mask" aria-hidden="true"><span class="enter-word" :style="{ '--i': i + 1 }">{{ w }}</span></span>{{ ' ' }}</template>
          </h1>
          <SiteRichText v-if="tr(s.hero.intro)" :text="tr(s.hero.intro)" class="hero-intro enter" style="--i: 4" />
          <div class="hero-actions enter" style="--i: 5">
            <NuxtLink v-if="sections.some((x) => x.id === 'work')" :to="{ hash: '#work' }" class="btn btn-solid" @click="pin()">
              <ArrowDown aria-hidden="true" /> {{ t('hero.cta') }}
            </NuxtLink>
            <a v-if="cvUrl" :href="cvUrl" class="btn btn-ghost" download target="_blank">
              <Download aria-hidden="true" /> {{ t('hero.cv') }}
            </a>
          </div>

          <div v-if="tabs.length" class="console enter" style="--i: 6">
            <div class="console-tabs" role="tablist">
              <button
                v-for="(tb, i) in tabs"
                :key="i"
                type="button"
                role="tab"
                class="console-tab"
                :class="{ 'is-active': tab === i }"
                :aria-selected="tab === i"
                @click="tab = i"
              >
                {{ tr(tb.label) }}
              </button>
            </div>
            <p class="console-line" aria-live="polite">
              <span class="console-prompt" aria-hidden="true">~/{{ (s.name.split(' ')[0] || 'me').toLowerCase() }} $</span>
              <Transition name="fade" mode="out-in">
                <span :key="tab">{{ tr(tabs[tab]?.line) }}</span>
              </Transition>
            </p>
          </div>
        </div>

        <div class="hero-media enter-media">
          <DotImage
            :media="media(s.hero.imageId)"
            :effect="s.hero.effect"
            :alt="tr(media(s.hero.imageId)?.alt) || s.name"
            :parallax="0.24"
            seed="globe-hero"
            sizes="(max-width: 1023px) 100vw, 620px"
            eager
          />
        </div>
      </div>
      <button v-if="sections.length" type="button" class="hero-scroll label" @click="scrollTo(`#${sections[0]!.id}`)">
        <span>{{ t('hero.scroll') }}</span>
        <ArrowDown aria-hidden="true" />
      </button>
    </section>

    <template v-for="sec in sections" :key="sec.id">
      <!-- ===================================================== WORK -->
      <section v-if="sec.id === 'work'" id="work" data-nav class="section tone-paper guides">
        <div class="wrap">
          <SiteSectionHead :index="sec.index" :title="workTitle" glyph="eye">
            <SiteFilterBar v-if="showFilters" v-model="filter" :categories="categories" :total="projects.length" />
          </SiteSectionHead>
          <SiteRichText v-if="tr(s.home?.work.intro)" :text="tr(s.home?.work.intro)" class="lead work-intro" v-reveal />

          <TransitionGroup tag="div" name="cards" class="grid3 work-grid">
            <SiteProjectCard
              v-for="(p, i) in filtered"
              :key="p.id"
              :project="p"
              :index="i"
              :categories="data!.categories"
              :cover="media(p.coverId)"
            />
          </TransitionGroup>
          <p v-if="!filtered.length" class="work-empty label">{{ t('work.empty') }}</p>
        </div>
      </section>

      <!-- ===================================================== ABOUT -->
      <section v-else-if="sec.id === 'about'" id="about" data-nav class="section tone-blue about">
        <div class="wrap">
          <SiteSectionHead :index="sec.index" :title="tr(s.about.title) || t('about.title')" glyph="spark" />
          <div class="grid3 about-grid">
            <div class="about-media" v-reveal>
              <DotImage
                :media="media(s.about.imageId)"
                :effect="s.about.effect"
                :alt="s.name"
                fit="contain"
                :parallax="0.12"
                seed="field-about"
                sizes="(max-width: 639px) 100vw, 400px"
              />
            </div>
            <SiteRichText :text="tr(s.about.body)" class="about-body lead" v-reveal="100" />
            <dl class="facts" v-reveal="200">
              <div v-for="(f, i) in s.about.facts" :key="i" class="fact">
                <dt class="label">{{ tr(f.label) }}</dt>
                <dd>{{ tr(f.value) }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <!-- ===================================================== SKILLS -->
      <section v-else-if="sec.id === 'skills'" id="skills" data-nav class="section tone-paper guides">
        <div class="wrap">
          <SiteSectionHead :index="sec.index" :title="tr(s.skills.title) || t('skills.title')" glyph="grid" />
          <div class="grid3 skills-grid">
            <div v-for="(g, gi) in s.skills.groups" :key="gi" class="skill-col" v-reveal="gi * 90">
              <p class="label muted">{{ String(gi + 1).padStart(2, '0') }} / {{ String(s.skills.groups.length).padStart(2, '0') }}</p>
              <h3 class="display-m">{{ tr(g.title) }}</h3>
              <ul class="skill-list">
                <li v-for="(item, ii) in g.items" :key="item">
                  <span class="label skill-idx">{{ String(ii + 1).padStart(2, '0') }}</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================== CONTACT -->
      <section v-else-if="sec.id === 'contact'" id="contact" data-nav class="section tone-paper contact">
        <div class="wrap">
          <SiteSectionHead :index="sec.index" :title="tr(s.contact.title) || t('contact.title')" glyph="mail">
            <a v-if="mailto" :href="mailto" class="btn btn-solid"><Mail aria-hidden="true" /> {{ t('contact.email') }}</a>
          </SiteSectionHead>
          <div class="grid3 contact-grid">
            <SiteRichText v-if="tr(s.contact.text)" :text="tr(s.contact.text)" class="lead contact-text" v-reveal />
            <ul class="contact-list">
              <li v-for="(l, i) in allLinks" :key="l.url" v-reveal="i * 60">
                <a :href="l.url" :target="l.url.startsWith('mailto:') ? undefined : '_blank'" rel="noopener" class="contact-row">
                  <span class="label muted contact-host">{{ hostOf(l.url) }}</span>
                  <span class="display-m contact-name">{{ l.label }}</span>
                  <ArrowUpRight class="contact-arrow" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style>
/* ------------------------------------------------------------------ hero */
.hero {
  position: relative;
  min-height: max(640px, 100svh);
  padding: calc(var(--header-h) + clamp(24px, 4vw, 56px)) 0 clamp(64px, 8vw, 110px);
  display: flex;
  align-items: center;
  overflow: hidden;
}
.hero-frame {
  position: absolute;
  inset: 6px;
  border: 1px solid color-mix(in srgb, var(--paper) 30%, transparent);
  pointer-events: none;
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-items: center;
  gap: clamp(32px, 5vw, 80px);
}
.hero-kicker { display: flex; align-items: center; gap: 10px; margin-bottom: clamp(20px, 3vw, 32px); }
.hero-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 4px color-mix(in srgb, var(--paper) 18%, transparent); animation: pulse 2.4s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 7px transparent; } }
.hero-title { margin-bottom: clamp(20px, 3vw, 30px); }
.hero-intro { max-width: 52ch; margin-bottom: 28px; font-size: clamp(15px, 1.15vw, 17px); color: color-mix(in srgb, var(--paper) 88%, var(--blue)); }
.hero-intro strong { color: var(--white); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: clamp(32px, 4vw, 48px); }

.console {
  max-width: 470px;
  padding: 4px;
  background: var(--blue-deep);
  border-radius: 4px;
  box-shadow: 0 20px 40px -24px rgba(9, 11, 208, 0.9);
}
.console-tabs { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
.console-tab {
  padding: 8px 10px;
  border: 0;
  border-radius: 2px;
  background: color-mix(in srgb, var(--paper) 7%, transparent);
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: color-mix(in srgb, var(--paper) 75%, transparent);
  transition: background 0.2s, color 0.2s;
}
.console-tab:hover { color: var(--paper); }
.console-tab.is-active { background: color-mix(in srgb, var(--paper) 16%, transparent); color: var(--paper); text-decoration: underline; text-underline-offset: 3px; }
.console-line { display: flex; gap: 10px; padding: 14px 12px 12px; font-family: var(--font-mono); font-size: 12.5px; line-height: 1.5; min-height: 48px; }
.console-prompt { flex: none; opacity: 0.55; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.hero-media {
  position: relative;
  aspect-ratio: 9 / 10;
  max-height: calc(100svh - var(--header-h) - 80px);
  width: 100%;
  justify-self: end;
}
.hero-media .dimg { border-radius: var(--radius); }
.hero-scroll {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 0;
  color: var(--paper);
  opacity: 0.7;
}
.hero-scroll svg { width: 14px; height: 14px; animation: nudge 1.8s var(--ease-io) infinite; }
@keyframes nudge { 50% { transform: translateY(4px); } }

@media (max-width: 1023px) {
  .hero { min-height: auto; }
  .hero-grid { grid-template-columns: 1fr; }
  .hero-media { aspect-ratio: 4 / 3; max-height: none; }
  .hero-scroll { display: none; }
}
@media (max-width: 639px) {
  .hero-media { aspect-ratio: 1; }
  .console-tab { font-size: 10.5px; padding: 8px 4px; }
}

/* ------------------------------------------------------------------ work */
.work-grid { row-gap: clamp(48px, 6vw, 88px); }
.work-empty { padding: 40px 0; color: var(--muted); }
.work-intro { max-width: 60ch; margin: calc(-1 * clamp(12px, 2vw, 28px)) 0 clamp(36px, 5vw, 56px); }
.cards-move, .cards-enter-active, .cards-leave-active { transition: opacity 0.45s var(--ease), transform 0.6s var(--ease); }
.cards-enter-from, .cards-leave-to { opacity: 0; transform: translateY(24px) scale(0.98); }
.cards-leave-active { position: absolute; visibility: hidden; }

/* ----------------------------------------------------------------- about */
.about-grid { align-items: start; }
.about-media { position: relative; aspect-ratio: 1; }
.about-media .dimg { background: transparent; }
.about-media .dimg-paper { display: none; }
.about-body { font-size: clamp(1.05rem, 1.3vw, 1.25rem); }
.about-body strong { color: var(--white); }
.facts { display: grid; border-top: 1px solid var(--line); }
.fact { display: grid; grid-template-columns: 7.5em 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.fact dt { padding-top: 3px; color: var(--muted); }
.fact dd { font-size: 15px; }
@media (max-width: 1023px) {
  .about-media { grid-row: span 2; }
}
@media (max-width: 639px) {
  .about-media { aspect-ratio: 1; grid-row: auto; max-width: 340px; }
}

/* ---------------------------------------------------------------- skills */
.skills-grid { row-gap: 56px; }
.skill-col .display-m { margin: 12px 0 24px; }
.skill-list { border-top: 1px solid var(--line-strong); }
.skill-list li {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  font-size: 15.5px;
  transition: padding 0.35s var(--ease), color 0.2s;
}
.skill-list li:hover { padding-left: 8px; color: var(--blue); }
.skill-idx { color: var(--muted); }

/* --------------------------------------------------------------- contact */
.contact { padding-bottom: clamp(40px, 6vw, 80px); }
.contact-grid { align-items: start; }
.contact-text { max-width: 36ch; }
.contact-list { grid-column: span 2; border-top: 1px solid var(--line-strong); }
.contact-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  align-items: center;
  gap: 16px;
  padding: 22px 0;
  border-bottom: 1px solid var(--line-strong);
  transition: padding 0.45s var(--ease), color 0.25s;
}
.contact-row:hover { padding-left: 14px; color: var(--blue); }
.contact-host { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contact-arrow { width: 26px; height: 26px; stroke-width: 1.2; transition: transform 0.45s var(--ease); }
.contact-row:hover .contact-arrow { transform: translate(4px, -4px); }
@media (max-width: 1023px) {
  .contact-list { grid-column: 1 / -1; }
}
@media (max-width: 639px) {
  .contact-row { grid-template-columns: 1fr auto; gap: 4px 12px; }
  .contact-host { grid-column: 1; grid-row: 2; }
  .contact-arrow { grid-row: span 2; }
}
</style>

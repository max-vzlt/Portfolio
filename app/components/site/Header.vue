<script setup lang="ts">
import { LayoutGrid, UserRound, Sparkles, Mail, Download, Languages, Workflow, WandSparkles } from 'lucide-vue-next'

const { t, lp, otherLangPath, lang } = useI18n()
const { data, cvUrl } = useSite()
const active = useActiveSection()
const route = useRoute()

const solid = ref(false)
const hidden = ref(false)

const isHome = computed(() => route.path === '/' || route.path === '/en')
const NAV = {
  work: { key: 'nav.work', icon: LayoutGrid },
  about: { key: 'nav.about', icon: UserRound },
  method: { key: 'nav.method', icon: Workflow },
  services: { key: 'nav.services', icon: WandSparkles },
  skills: { key: 'nav.skills', icon: Sparkles },
  contact: { key: 'nav.contact', icon: Mail },
} as const
// same order / visibility as the sections of the home page (editable in /admin/home)
const links = computed(() =>
  (data.value?.settings.home?.sections || [])
    .filter((s) => s.visible)
    .map((s) => ({ id: s.id, label: t(NAV[s.id].key), icon: NAV[s.id].icon })),
)
const half = computed(() => Math.ceil(links.value.length / 2))
const left = computed(() => links.value.slice(0, half.value))
const right = computed(() => links.value.slice(half.value))
const { until: pinUntil, pin } = useHeaderPin()
const rememberLang = useRememberLang()

const name = computed(() => (data.value?.settings.name || 'Maxime Verzeletti').trim())
const nameParts = computed(() => {
  const parts = name.value.split(/\s+/)
  return parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [name.value]
})

let lastY = 0
function onScroll() {
  const y = window.scrollY
  solid.value = y > 40
  // scrolling triggered by a link: keep the header on screen
  if (Date.now() < pinUntil.value) {
    hidden.value = false
    lastY = y
    return
  }
  if (Math.abs(y - lastY) > 6) {
    hidden.value = y > lastY && y > 420
    lastY = y
  }
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

watch(() => route.fullPath, () => (hidden.value = false))
</script>

<template>
  <header class="site-header" :class="{ 'is-solid': solid, 'is-hidden': hidden }">
    <div class="wrap header-grid">
      <nav class="h-group h-left" :aria-label="t('nav.home')">
        <span class="h-links">
        <NuxtLink
          v-for="l in left"
          :key="l.id"
          :to="{ path: lp('/'), hash: `#${l.id}` }"
          class="h-link"
          :class="{ 'is-active': isHome && active === l.id }"
          :title="l.label"
          :aria-label="l.label"
          @click="pin()"
        >
          <component :is="l.icon" class="h-ico" aria-hidden="true" />
          <span class="h-txt nav-label link-underline" :class="{ 'is-active': isHome && active === l.id }">{{ l.label }}</span>
        </NuxtLink>
        </span>
      </nav>

      <NuxtLink :to="lp('/')" class="h-logo" @click="pin()" :aria-label="`${name} — ${t('nav.home')}`">
        <span v-for="(p, i) in nameParts" :key="i">{{ p }}</span>
      </NuxtLink>

      <nav class="h-group h-right" aria-label="Menu">
        <span class="h-links">
        <NuxtLink
          v-for="l in right"
          :key="l.id"
          :to="{ path: lp('/'), hash: `#${l.id}` }"
          class="h-link"
          :title="l.label"
          :aria-label="l.label"
          @click="pin()"
        >
          <component :is="l.icon" class="h-ico" aria-hidden="true" />
          <span class="h-txt nav-label link-underline" :class="{ 'is-active': isHome && active === l.id }">{{ l.label }}</span>
        </NuxtLink>
        </span>
        <!-- language switch: a FR | EN pill, different from the other header items -->
        <NuxtLink
          :to="otherLangPath"
          class="h-lang"
          :hreflang="lang === 'fr' ? 'en' : 'fr'"
          :title="t('nav.lang')"
          :aria-label="t('nav.lang')"
          @click="rememberLang(lang === 'fr' ? 'en' : 'fr')"
        >
          <Languages class="h-lang-ico" aria-hidden="true" />
          <span class="h-lang-opt" :class="{ 'is-on': lang === 'fr' }">FR</span>
          <span class="h-lang-opt" :class="{ 'is-on': lang === 'en' }">EN</span>
        </NuxtLink>
        <a v-if="cvUrl" :href="cvUrl" class="btn h-cv" download target="_blank" :title="t('hero.cv')">
          <Download aria-hidden="true" />
          <span class="h-txt">{{ t('nav.cv') }}</span>
        </a>
      </nav>
    </div>
  </header>
</template>

<style>
.site-header {
  --fg: var(--paper);
  --hdr-bg: var(--blue);
  --line: color-mix(in srgb, var(--paper) 25%, transparent);
  background: var(--hdr-bg);
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  color: var(--fg);
  padding-top: env(safe-area-inset-top);
  transition: background 0.35s var(--ease), color 0.35s var(--ease), transform 0.5s var(--ease), box-shadow 0.35s var(--ease);
}
.site-header.is-solid {
  --fg: var(--ink);
  --hdr-bg: var(--page);
  --line: var(--rule);
  box-shadow: 0 1px 0 var(--line);
}
.site-header.is-hidden { transform: translateY(-110%); }

.header-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--gap);
  height: var(--header-h);
  transition: height 0.35s var(--ease);
}
.is-solid .header-grid { height: 64px; }

.h-group { display: flex; align-items: center; gap: clamp(12px, 1.8vw, 28px); }
.h-links { flex: 1; display: flex; align-items: center; justify-content: space-around; gap: clamp(12px, 2vw, 32px); }
.h-right { justify-content: flex-end; }

.h-link { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; }
.h-ico { display: none; width: 20px; height: 20px; stroke-width: 1.5; }
.h-lang {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 30px;
  padding: 2px 3px 2px 8px;
  border: 1px solid color-mix(in srgb, var(--fg) 45%, transparent);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  transition: border-color 0.25s var(--ease);
}
.h-lang:hover { border-color: var(--fg); }
.h-lang-ico { width: 13px; height: 13px; margin-right: 3px; stroke-width: 1.6; opacity: 0.75; }
.h-lang-opt { display: grid; place-items: center; min-width: 26px; height: 22px; padding: 0 6px; border-radius: 999px; opacity: 0.6; transition: background 0.25s var(--ease), color 0.25s var(--ease), opacity 0.25s; }
.h-lang-opt.is-on { background: var(--fg); color: var(--hdr-bg); opacity: 1; }
.h-lang:hover .h-lang-opt:not(.is-on) { opacity: 1; }

.h-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(22px, 2.3vw, 30px);
  line-height: 0.98;
  letter-spacing: -0.01em;
  text-align: center;
  transition: font-size 0.35s var(--ease);
}
.is-solid .h-logo { font-size: 21px; }

.h-cv {
  --btn-bg: var(--paper);
  --btn-fg: var(--blue);
  min-height: 36px;
  padding: 8px 12px;
}
.h-cv:hover { --btn-bg: var(--white); }
.is-solid .h-cv { --btn-bg: var(--blue); --btn-fg: var(--paper); }
.is-solid .h-cv:hover { --btn-bg: var(--blue-deep); }

/* Tablet: icons instead of words */
@media (max-width: 1023px) {
  .h-txt { display: none; }
  .h-ico { display: block; }
  .h-links { flex: none; gap: 4px; justify-content: flex-start; }
  .h-link { justify-content: center; min-width: 40px; }
  .h-cv { padding: 8px 10px; }
}

/* Phone: logo left, every action as an icon on the right */
@media (max-width: 639px) {
  :root { --header-h: 68px; }
  .header-grid { display: flex; gap: 2px; }
  .h-logo { order: -1; margin-right: auto; align-items: flex-start; text-align: left; font-size: 19px; }
  .is-solid .h-logo { font-size: 17px; }
  .h-group, .h-links { gap: 2px; }
  .h-link { min-width: 38px; min-height: 40px; }
  .h-ico { width: 19px; height: 19px; }
  .h-lang { padding-left: 3px; margin-left: 2px; }
  .h-lang-ico { display: none; }
  .h-lang-opt { min-width: 22px; padding: 0 4px; }
  .h-cv { min-height: 34px; padding: 7px 9px; margin-left: 6px; }
  .is-solid .header-grid { height: 58px; }
}
@media (max-width: 419px) {
  .h-link { min-width: 31px; }
  .h-ico { width: 18px; height: 18px; }
  .h-logo { font-size: 17px; }
}
@media (max-width: 359px) {
  .h-link { min-width: 28px; }
}
</style>

<script setup lang="ts">
import { LayoutGrid, UserRound, Sparkles, Mail, Download, Languages } from 'lucide-vue-next'

const { t, lp, otherLangPath, lang } = useI18n()
const { data, cvUrl } = useSite()
const active = useActiveSection()
const route = useRoute()

const solid = ref(false)
const hidden = ref(false)

const isHome = computed(() => route.path === '/' || route.path === '/en')
const links = computed(() => [
  { id: 'work', label: t('nav.work'), icon: LayoutGrid },
  { id: 'about', label: t('nav.about'), icon: UserRound },
  { id: 'skills', label: t('nav.skills'), icon: Sparkles },
  { id: 'contact', label: t('nav.contact'), icon: Mail },
])
const left = computed(() => links.value.slice(0, 2))
const right = computed(() => links.value.slice(2))

const name = computed(() => (data.value?.settings.name || 'Maxime Verzeletti').trim())
const nameParts = computed(() => {
  const parts = name.value.split(/\s+/)
  return parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [name.value]
})

let lastY = 0
function onScroll() {
  const y = window.scrollY
  solid.value = y > 40
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
        >
          <component :is="l.icon" class="h-ico" aria-hidden="true" />
          <span class="h-txt nav-label link-underline" :class="{ 'is-active': isHome && active === l.id }">{{ l.label }}</span>
        </NuxtLink>
        </span>
      </nav>

      <NuxtLink :to="lp('/')" class="h-logo" :aria-label="`${name} — ${t('nav.home')}`">
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
        >
          <component :is="l.icon" class="h-ico" aria-hidden="true" />
          <span class="h-txt nav-label link-underline" :class="{ 'is-active': isHome && active === l.id }">{{ l.label }}</span>
        </NuxtLink>
        </span>
        <NuxtLink :to="otherLangPath" class="h-link h-lang" :hreflang="lang === 'fr' ? 'en' : 'fr'" :title="t('nav.lang')" :aria-label="t('nav.lang')">
          <Languages class="h-ico" aria-hidden="true" />
          <span class="nav-label">{{ t('nav.langShort') }}</span>
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
  --line: color-mix(in srgb, var(--paper) 25%, transparent);
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  color: var(--fg);
  padding-top: env(safe-area-inset-top);
  transition: background 0.35s var(--ease), color 0.35s var(--ease), transform 0.5s var(--ease), box-shadow 0.35s var(--ease);
}
.site-header.is-solid {
  --fg: var(--blue-deep);
  --line: color-mix(in srgb, var(--blue) 18%, transparent);
  background: color-mix(in srgb, var(--paper) 86%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  backdrop-filter: blur(14px) saturate(1.4);
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
.h-lang .h-ico { display: none; }
.h-lang { opacity: 0.8; transition: opacity 0.2s; }
.h-lang:hover { opacity: 1; }

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
  .h-lang .nav-label { font-size: 12px; }
  .h-cv { min-height: 34px; padding: 7px 9px; margin-left: 6px; }
  .is-solid .header-grid { height: 58px; }
}
@media (max-width: 359px) {
  .h-link { min-width: 32px; }
}
</style>

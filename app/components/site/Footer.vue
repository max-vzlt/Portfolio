<script setup lang="ts">
import { Github, Linkedin, Instagram, Globe, Mail, ArrowUp } from 'lucide-vue-next'

const { t, otherLangPath, lang } = useI18n()
const { data, cvUrl } = useSite()
const { scrollTo } = useSmoothScroll()
const rememberLang = useRememberLang()

const settings = computed(() => data.value?.settings)
const year = new Date().getFullYear()

function iconFor(url: string) {
  if (/linkedin/i.test(url)) return Linkedin
  if (/github/i.test(url)) return Github
  if (/instagram/i.test(url)) return Instagram
  if (/^mailto:/i.test(url)) return Mail
  return Globe
}
const mark = computed(() => {
  const parts = (settings.value?.name || 'Verzeletti').trim().split(/\s+/)
  return parts[parts.length - 1]
})
</script>

<template>
  <footer class="site-footer tone-paper">
    <div class="footer-mark" aria-hidden="true">{{ mark }}</div>
    <div class="wrap footer-grid">
      <div class="footer-col">
        <p class="nav-label">{{ settings?.name }} — Portfolio</p>
        <p class="label muted">© {{ year }} · {{ t('footer.rights') }}</p>
      </div>
      <ul class="footer-socials">
        <li v-if="settings?.contact.email">
          <a :href="`mailto:${settings.contact.email}`" :aria-label="settings.contact.email" :title="settings.contact.email"><Mail aria-hidden="true" /></a>
        </li>
        <li v-for="s in settings?.socials || []" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener" :aria-label="s.label" :title="s.label">
            <component :is="iconFor(s.url)" aria-hidden="true" />
          </a>
        </li>
      </ul>
      <div class="footer-col footer-right">
        <p class="nav-label footer-links">
          <a v-if="cvUrl" :href="cvUrl" download target="_blank" class="link-underline">{{ t('nav.cv') }}</a>
          <span v-if="cvUrl" aria-hidden="true">|</span>
          <NuxtLink :to="otherLangPath" :hreflang="lang === 'fr' ? 'en' : 'fr'" class="link-underline" @click="rememberLang(lang === 'fr' ? 'en' : 'fr')">{{ t('nav.lang') }}</NuxtLink>
          <span aria-hidden="true">|</span>
          <button type="button" class="link-underline footer-top" @click="scrollTo(0)">
            {{ t('footer.top') }} <ArrowUp aria-hidden="true" />
          </button>
        </p>
        <p class="label muted">{{ t('footer.made') }} {{ settings?.name }} <span class="heart">♥</span></p>
      </div>
    </div>
  </footer>
</template>

<style>
.site-footer {
  position: relative;
  overflow: hidden;
  padding: clamp(120px, 22vw, 300px) 0 clamp(28px, 4vw, 48px);
  border-top: 1px solid var(--line);
}
.footer-mark {
  position: absolute;
  left: 50%;
  bottom: -0.16em;
  transform: translateX(-50%);
  font-family: var(--font-display);
  font-weight: 200;
  font-size: clamp(140px, 27vw, 430px);
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: color-mix(in srgb, var(--accent) 8%, var(--bg));
  pointer-events: none;
  user-select: none;
}
.footer-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: var(--gap);
}
.footer-col { display: grid; gap: 6px; }
.footer-right { justify-items: end; text-align: right; }
.footer-links { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.footer-top { display: inline-flex; align-items: center; gap: 4px; background: none; border: 0; padding: 0 0 2px; font: inherit; letter-spacing: inherit; text-transform: inherit; }
.footer-top svg { width: 14px; height: 14px; }
.footer-socials { display: flex; justify-content: center; gap: 12px; }
.footer-socials a {
  display: grid;
  place-items: center;
  width: 44px;
  height: 52px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  transition: background 0.25s var(--ease), color 0.25s var(--ease), transform 0.35s var(--ease);
}
.footer-socials a:hover { background: var(--blue); color: var(--paper); border-color: var(--blue); transform: translateY(-3px); }
.footer-socials svg { width: 20px; height: 20px; stroke-width: 1.4; }
.heart { color: var(--accent); }

@media (max-width: 767px) {
  .footer-grid { grid-template-columns: 1fr; justify-items: center; text-align: center; }
  .footer-col, .footer-right { justify-items: center; text-align: center; }
  .footer-links { justify-content: center; }
  .footer-socials { order: -1; margin-bottom: 8px; }
}
</style>

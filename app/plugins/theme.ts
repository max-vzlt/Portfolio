/**
 * Theme: html[data-theme] when the visitor picked one (cookie, so the server
 * renders it directly); otherwise CSS follows prefers-color-scheme.
 */
const BAR = { light: '#0037FF', dark: '#1432B8' }

export default defineNuxtPlugin(() => {
  const { pref, system } = useTheme()

  useHead({
    htmlAttrs: { 'data-theme': () => pref.value || undefined },
    meta: () =>
      pref.value
        ? [{ key: 'theme-color', name: 'theme-color', content: BAR[pref.value] }]
        : [
            { key: 'theme-color', name: 'theme-color', content: BAR.light, media: '(prefers-color-scheme: light)' },
            { key: 'theme-color-dark', name: 'theme-color', content: BAR.dark, media: '(prefers-color-scheme: dark)' },
          ],
  })

  if (import.meta.client) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    // only once hydration is over: the server cannot know the browser setting
    onNuxtReady(() => {
      system.value = mq.matches ? 'dark' : 'light'
      requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('theme-ready')))
    })
    mq.addEventListener('change', (e) => {
      system.value = e.matches ? 'dark' : 'light'
      if (!pref.value) window.dispatchEvent(new CustomEvent('mv-theme'))
    })
  }
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },

  css: [
    '@fontsource-variable/oswald/wght.css',
    '@fontsource-variable/mona-sans/wdth.css',
    '@fontsource-variable/geist-mono/wght.css',
    'lenis/dist/lenis.css',
    '~/assets/css/main.css',
  ],

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0037FF' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      // Lets CSS hide "reveal" elements only when JS is available (no flash without JS).
      script: [{ innerHTML: "document.documentElement.classList.add('js')", tagPosition: 'head' }],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  // Everything here can be overridden with NUXT_* environment variables (see .env.example).
  runtimeConfig: {
    adminPassword: '',
    sessionSecret: '',
    dataDir: '',
    deeplApiKey: '',
    deeplApiUrl: '',
    libretranslateUrl: '',
    libretranslateApiKey: '',
    mymemoryEmail: '',
    public: {
      siteUrl: '',
    },
  },

  // The back-office is a client-side app (drag & drop, uploads…)
  routeRules: {
    '/admin/**': { ssr: false },
    '/admin': { ssr: false },
  },

  nitro: {
    // sharp is a native module: keep it external so the build stays portable.
    externals: { external: ['sharp'] },
  },

  vite: {
    optimizeDeps: { include: ['sortablejs', 'lenis', 'lucide-vue-next'] },
  },

  typescript: { strict: false },
})

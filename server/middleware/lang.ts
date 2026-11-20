/**
 * Language from the visitor's browser / region (Accept-Language), on the first visit only.
 * French-speaking visitors get the French site, everyone else the English one.
 * The choice is remembered in the "mv_lang" cookie (also set when the visitor switches
 * language with the header button), and robots are never redirected (SEO).
 */
const BOTS = /bot|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|lighthouse|headless|python|curl|wget|gpt|claude|perplexity|anthropic|google-|bing|yandex|duckduck|applebot|mistral/i
const SKIP = /^\/(admin|api|_nuxt|_ipx|__nuxt|uploads)(\/|$)/

export function preferredLang(header?: string | null): 'fr' | 'en' | null {
  if (!header) return null
  const langs = header.split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((x) => x.trim().startsWith('q='))
      return { lang: (tag || '').trim().toLowerCase().split('-')[0]!, q: q ? Number(q.split('=')[1]) || 0 : 1 }
    })
    .filter((x) => x.lang && x.lang !== '*' && x.q > 0)
    .sort((a, b) => b.q - a.q)
  if (!langs.length) return null
  return langs[0]!.lang === 'fr' ? 'fr' : 'en'
}

export default defineEventHandler((event) => {
  if (event.method !== 'GET') return
  const [path = '/', query = ''] = event.path.split('?')
  if (SKIP.test(path) || /\.[a-z0-9]+$/i.test(path)) return
  if (!(getRequestHeader(event, 'accept') || '').includes('text/html')) return
  if (BOTS.test(getRequestHeader(event, 'user-agent') || '')) return
  if (/(^|&)preview(=|&|$)/.test(query)) return
  if (getCookie(event, 'mv_lang')) return

  const wanted = preferredLang(getRequestHeader(event, 'accept-language'))
  if (!wanted) return
  setCookie(event, 'mv_lang', wanted, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  const isEn = path === '/en' || path.startsWith('/en/')
  const qs = query ? `?${query}` : ''
  let target = ''
  if (wanted === 'en' && !isEn) target = path === '/' ? '/en' : `/en${path}`
  if (wanted === 'fr' && isEn) target = path.replace(/^\/en/, '') || '/'
  if (!target) return
  setResponseHeaders(event, { 'Cache-Control': 'private, no-store', Vary: 'Accept-Language, Cookie' })
  return sendRedirect(event, target + qs, 302)
})

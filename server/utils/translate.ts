import type { Lang } from '#shared/types'

/**
 * Automatic translation. Provider picked from the configuration:
 *  1. DeepL         (NUXT_DEEPL_API_KEY)
 *  2. LibreTranslate (NUXT_LIBRETRANSLATE_URL)
 *  3. MyMemory      (free, no key, limited daily quota) — default
 *
 * The mini-markdown (**bold**, *italic*, [link](url)) is converted to tags so
 * the providers keep the formatting, then converted back.
 */

export function translationProvider(): 'deepl' | 'libretranslate' | 'mymemory' {
  const cfg = useRuntimeConfig()
  if (cfg.deeplApiKey) return 'deepl'
  if (cfg.libretranslateUrl) return 'libretranslate'
  return 'mymemory'
}

function toTags(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, l, u) => `<a href="${u.replace(/"/g, '&quot;')}">${l}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/\n/g, '<br/>')
}

function fromTags(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/gi, (_m, u, l) => `[${l}](${u.replace(/&quot;/g, '"')})`)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

async function deepl(texts: string[], from: Lang, to: Lang): Promise<string[]> {
  const cfg = useRuntimeConfig()
  const key = cfg.deeplApiKey as string
  const endpoint = cfg.deeplApiUrl || (key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate')
  const res = await $fetch<{ translations: { text: string }[] }>(endpoint, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}` },
    body: {
      text: texts.map(toTags),
      source_lang: from.toUpperCase(),
      target_lang: to === 'en' ? 'EN-GB' : 'FR',
      tag_handling: 'xml',
      ignore_tags: ['x'],
    },
  })
  return res.translations.map((t) => fromTags(t.text))
}

async function libretranslate(texts: string[], from: Lang, to: Lang): Promise<string[]> {
  const cfg = useRuntimeConfig()
  const url = `${String(cfg.libretranslateUrl).replace(/\/$/, '')}/translate`
  const res = await $fetch<{ translatedText: string | string[] }>(url, {
    method: 'POST',
    body: { q: texts.map(toTags), source: from, target: to, format: 'html', api_key: cfg.libretranslateApiKey || undefined },
  })
  const out = Array.isArray(res.translatedText) ? res.translatedText : [res.translatedText]
  return out.map(fromTags)
}

/** MyMemory accepts ~500 bytes per request: split on sentences. */
function chunks(text: string, max = 450): string[] {
  if (text.length <= max) return [text]
  const parts = text.split(/(?<=[.!?…])\s+|(?<=<br\/>)/)
  const out: string[] = []
  let cur = ''
  for (const p of parts) {
    if ((cur + ' ' + p).length > max && cur) {
      out.push(cur)
      cur = p
    } else cur = cur ? `${cur} ${p}` : p
  }
  if (cur) out.push(cur)
  return out
}

async function mymemory(texts: string[], from: Lang, to: Lang): Promise<string[]> {
  const cfg = useRuntimeConfig()
  const results: string[] = []
  for (const text of texts) {
    const pieces: string[] = []
    for (const piece of chunks(toTags(text))) {
      const res = await $fetch<any>('https://api.mymemory.translated.net/get', {
        query: { q: piece, langpair: `${from}|${to}`, de: cfg.mymemoryEmail || undefined },
      })
      if (res?.responseStatus && Number(res.responseStatus) !== 200) {
        throw createError({ statusCode: 502, statusMessage: `MyMemory : ${res.responseDetails || 'erreur'}` })
      }
      pieces.push(res?.responseData?.translatedText ?? piece)
    }
    results.push(fromTags(pieces.join(' ')))
  }
  return results
}

export async function translateTexts(texts: string[], from: Lang, to: Lang): Promise<string[]> {
  const idx: number[] = []
  const todo: string[] = []
  texts.forEach((t, i) => {
    if (t && t.trim()) {
      idx.push(i)
      todo.push(t)
    }
  })
  const out = texts.map(() => '')
  if (!todo.length) return out
  const provider = translationProvider()
  const done = provider === 'deepl'
    ? await deepl(todo, from, to)
    : provider === 'libretranslate'
      ? await libretranslate(todo, from, to)
      : await mymemory(todo, from, to)
  done.forEach((t, k) => (out[idx[k]!] = t))
  return out
}

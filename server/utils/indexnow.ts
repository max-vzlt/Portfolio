import { promises as fs, existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

/**
 * IndexNow: tells Bing (which also feeds ChatGPT search and Copilot), Yandex, Seznam…
 * that pages changed, so they are re-read within hours instead of weeks.
 * Only active in production with NUXT_PUBLIC_SITE_URL set.
 */
let cachedKey: string | null = null
export async function indexNowKey(): Promise<string> {
  if (cachedKey) return cachedKey
  const file = join(dataDir(), '.indexnow-key')
  if (existsSync(file)) cachedKey = (await fs.readFile(file, 'utf8')).trim()
  else {
    cachedKey = randomBytes(16).toString('hex')
    await fs.mkdir(dataDir(), { recursive: true })
    await fs.writeFile(file, cachedKey)
  }
  return cachedKey
}

export async function notifyIndexNow(paths: string[]) {
  const site = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
  if (import.meta.dev || !/^https:\/\//.test(site) || !paths.length) return
  try {
    const key = await indexNowKey()
    const urls = [...new Set(paths.flatMap((p) => [site + p, `${site}/en${p === '/' ? '' : p}`]))]
    await $fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      body: { host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList: urls.slice(0, 1000) },
      timeout: 8000,
    })
  } catch (err: any) {
    console.warn('[indexnow]', err?.message || err)
  }
}

/** Pages to refresh after a change of content. */
export async function notifyContentChange(slugs: string[] = []) {
  await notifyIndexNow(['/', ...slugs.map((s) => `/work/${s}`), '/llms.txt', '/llms-full.txt'])
}

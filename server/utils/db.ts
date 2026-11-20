import { promises as fs, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { Database } from '#shared/types'

/**
 * Content is stored in a single JSON file (data/db.json) + one folder per
 * uploaded media (data/uploads/<id>/…). It is plenty for a portfolio, easy to
 * back up (copy the folder) and has no native dependency.
 */

export function dataDir(): string {
  const cfg = useRuntimeConfig()
  return resolve(cfg.dataDir || process.env.NUXT_DATA_DIR || 'data')
}
export const uploadsDir = () => join(dataDir(), 'uploads')
const dbFile = () => join(dataDir(), 'db.json')
const seedDir = () => resolve(process.env.NUXT_SEED_DIR || 'seed')

let cache: Database | null = null
let loading: Promise<Database> | null = null
let queue: Promise<unknown> = Promise.resolve()

async function load(): Promise<Database> {
  const file = dbFile()
  if (!existsSync(file)) {
    await fs.mkdir(uploadsDir(), { recursive: true })
    const seedDb = join(seedDir(), 'db.json')
    if (existsSync(seedDb)) {
      // First start: copy the starter content (projects of the previous site).
      await fs.copyFile(seedDb, file)
      const seedUploads = join(seedDir(), 'uploads')
      if (existsSync(seedUploads)) await fs.cp(seedUploads, uploadsDir(), { recursive: true })
      console.info('[portfolio] data initialised from /seed')
    } else {
      await fs.writeFile(file, JSON.stringify(emptyDatabase(), null, 2))
      console.info('[portfolio] empty database created')
    }
  }
  const db = JSON.parse(await fs.readFile(file, 'utf8')) as Database
  return migrate(db)
}

function migrate(db: Database): Database {
  const base = emptyDatabase()
  db.settings = { ...base.settings, ...db.settings }
  db.categories ||= []
  db.projects ||= []
  db.media ||= []
  return db
}

export async function getDB(): Promise<Database> {
  if (cache) return cache
  loading ||= load().then((db) => (cache = db))
  return loading
}

async function persist(db: Database) {
  const file = dbFile()
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(db, null, 2))
  await fs.rename(tmp, file)
}

/**
 * Runs `fn` on a copy of the database, saves it atomically and swaps the cache.
 * Calls are queued so concurrent requests never overwrite each other.
 */
export function mutateDB<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const current = await getDB()
    const draft = structuredClone(current)
    const result = await fn(draft)
    await persist(draft)
    cache = draft
    return result
  })
  queue = run.catch(() => {})
  return run
}

export async function sessionSecret(): Promise<string> {
  const cfg = useRuntimeConfig()
  if (cfg.sessionSecret && cfg.sessionSecret.length >= 32) return cfg.sessionSecret
  const file = join(dataDir(), '.session-secret')
  if (existsSync(file)) return (await fs.readFile(file, 'utf8')).trim()
  await fs.mkdir(dataDir(), { recursive: true })
  const secret = randomBytes(32).toString('hex')
  await fs.writeFile(file, secret, { mode: 0o600 })
  return secret
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('base64url').replace(/[-_]/g, 'x')}`
}

export function uniqueSlug(base: string, taken: string[]): string {
  const root = slugify(base) || 'projet'
  let slug = root
  let i = 2
  while (taken.includes(slug)) slug = `${root}-${i++}`
  return slug
}

import type { I18nText, Lang, PublicMedia } from '#shared/types'

export interface AdminMedia extends PublicMedia {
  originalName: string
  size: number
  createdAt: string
  usage: string[]
}

/* ------------------------------------------------------------------ toasts */
export interface Toast { id: number; text: string; error?: boolean }
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  let n = 0
  const push = (text: string, error = false) => {
    const id = Date.now() + n++
    toasts.value = [...toasts.value, { id, text, error }]
    setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), error ? 6000 : 2800)
  }
  return { toasts, success: (t: string) => push(t), error: (t: string) => push(t, true) }
}

export function errorMessage(err: any): string {
  return err?.data?.statusMessage || err?.statusMessage || err?.data?.message || err?.message || 'Erreur inattendue'
}

/* ------------------------------------------------------------------- api */
export function useAdminApi() {
  const toast = useToast()
  async function api<T = any>(url: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
      return (await $fetch<T>(url, opts as any)) as T
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        await navigateTo(`/admin/login?next=${encodeURIComponent(useRoute().fullPath)}`)
      } else {
        toast.error(errorMessage(err))
      }
      throw err
    }
  }
  return api
}

/* ---------------------------------------------------------------- upload */
export interface UploadItem { key: number; name: string; progress: number }

export function useUpload() {
  const items = useState<UploadItem[]>('uploads', () => [])
  const toast = useToast()

  function one(file: File): Promise<AdminMedia> {
    return new Promise((resolve, reject) => {
      const key = Date.now() + Math.random()
      const item: UploadItem = { key, name: file.name, progress: 0 }
      items.value = [...items.value, item]
      const done = () => (items.value = items.value.filter((i) => i.key !== key))
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/media')
      xhr.responseType = 'json'
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return
        items.value = items.value.map((i) => (i.key === key ? { ...i, progress: e.loaded / e.total } : i))
      }
      xhr.onload = () => {
        done()
        if (xhr.status >= 200 && xhr.status < 300) resolve((xhr.response as AdminMedia[])[0]!)
        else reject(new Error((xhr.response as any)?.statusMessage || `Échec de l'envoi de ${file.name}`))
      }
      xhr.onerror = () => {
        done()
        reject(new Error(`Échec de l'envoi de ${file.name}`))
      }
      const fd = new FormData()
      fd.append('file', file, file.name)
      xhr.send(fd)
    })
  }

  /** Uploads files (3 at a time), keeps the original order, skips failures. */
  async function upload(files: File[] | FileList): Promise<AdminMedia[]> {
    const list = Array.from(files)
    const out: (AdminMedia | null)[] = new Array(list.length).fill(null)
    let next = 0
    const worker = async () => {
      while (next < list.length) {
        const i = next++
        try {
          out[i] = await one(list[i]!)
        } catch (err: any) {
          toast.error(err?.message || 'Envoi impossible')
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    const ok = out.filter(Boolean) as AdminMedia[]
    if (ok.length) toast.success(ok.length > 1 ? `${ok.length} fichiers importés` : 'Fichier importé')
    return ok
  }

  return { items, upload }
}

/* ------------------------------------------------------------- translate */
export function useTranslate() {
  const api = useAdminApi()
  const busy = useState('translating', () => false)
  async function translate(texts: string[], from: Lang, to: Lang): Promise<string[]> {
    busy.value = true
    try {
      const res = await api<{ texts: string[] }>('/api/admin/translate', { method: 'POST', body: { texts, from, to } })
      return res.texts
    } finally {
      busy.value = false
    }
  }
  /** Fill `to` from `from` in every given field (only empty ones unless overwrite). */
  async function fill(fields: I18nText[], from: Lang, to: Lang, overwrite = false): Promise<number> {
    const todo = fields.filter((f) => f && f[from]?.trim() && (overwrite || !f[to]?.trim()))
    if (!todo.length) return 0
    const res = await translate(todo.map((f) => f[from]), from, to)
    todo.forEach((f, i) => (f[to] = res[i] || f[to]))
    return todo.length
  }
  return { busy, translate, fill }
}

export const formatBytes = (n: number) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} Mo` : n > 1e3 ? `${Math.round(n / 1e3)} Ko` : `${n} o`

/** Editing language shared by every bilingual field of a page. */
export const EDIT_LANG = Symbol('edit-lang')

/** Media known by the current admin page (id → media), shared with every field. */
export const MEDIA_MAP = Symbol('media-map')
export function provideMediaMap(initial: Record<string, PublicMedia> = {}) {
  const map = reactive<Record<string, PublicMedia>>({ ...initial })
  provide(MEDIA_MAP, map)
  return map
}
export function useMediaMap() {
  return inject<Record<string, PublicMedia>>(MEDIA_MAP, reactive({}))
}

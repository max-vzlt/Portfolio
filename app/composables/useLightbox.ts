import type { ImageEffect, PublicMedia } from '#shared/types'

export interface LightboxItem {
  media: PublicMedia
  effect: ImageEffect
  caption?: string
  /** id of the block showing it on the page: the viewer opens from / closes into it */
  source?: string
}

export function useLightbox() {
  const items = useState<LightboxItem[]>('lb-items', () => [])
  const index = useState<number>('lb-index', () => -1)
  /** 1 = next, -1 = previous (drives the change animation) */
  const dir = useState<number>('lb-dir', () => 1)
  const open = (list: LightboxItem[], i: number) => {
    items.value = list
    index.value = i
  }
  const close = () => (index.value = -1)
  const move = (d: number) => {
    if (!items.value.length) return
    dir.value = d >= 0 ? 1 : -1
    index.value = (index.value + d + items.value.length) % items.value.length
  }
  return { items, index, dir, open, close, move }
}

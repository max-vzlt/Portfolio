import type { ImageEffect, PublicMedia } from '#shared/types'

export interface LightboxItem {
  media: PublicMedia
  effect: ImageEffect
  caption?: string
}

export function useLightbox() {
  const items = useState<LightboxItem[]>('lb-items', () => [])
  const index = useState<number>('lb-index', () => -1)
  const open = (list: LightboxItem[], i: number) => {
    items.value = list
    index.value = i
  }
  const close = () => (index.value = -1)
  const move = (d: number) => {
    if (!items.value.length) return
    index.value = (index.value + d + items.value.length) % items.value.length
  }
  return { items, index, open, close, move }
}

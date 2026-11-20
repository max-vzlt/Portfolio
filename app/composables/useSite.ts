import type { PublicMedia, SitePayload } from '#shared/types'

/** Site-wide content (settings, categories, project cards), fetched once. */
export function useSite() {
  const nuxtApp = useNuxtApp()
  const req = useFetch<SitePayload>('/api/site', {
    key: 'site',
    dedupe: 'defer',
    getCachedData: (key) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  })
  const media = (id?: string | null): PublicMedia | null => (id && req.data.value?.media[id]) || null
  const cvUrl = computed(() => media(req.data.value?.settings.cvId)?.url || null)
  return { ...req, media, cvUrl }
}

/** Which home section is on screen (for the header). */
export const useActiveSection = () => useState<string>('active-section', () => '')

<script setup lang="ts">
import { X, Upload, Search, FileText, Video } from 'lucide-vue-next'
import type { MediaKind, PublicMedia } from '#shared/types'

const props = withDefaults(defineProps<{ open: boolean; kind?: MediaKind | 'any' }>(), { kind: 'image' })
const emit = defineEmits<{ close: []; select: [PublicMedia] }>()
const api = useAdminApi()
const { upload } = useUpload()
const map = useMediaMap()
const list = ref<AdminMedia[]>([])
const loading = ref(false)
const q = ref('')
const { lock } = useSmoothScroll()

const accept = computed(() => (props.kind === 'image' ? 'image/*' : props.kind === 'video' ? 'video/*' : props.kind === 'file' ? '.pdf,application/pdf' : 'image/*,video/*,.pdf'))
const shown = computed(() =>
  list.value
    .filter((m) => props.kind === 'any' || m.kind === props.kind)
    .filter((m) => !q.value || m.originalName.toLowerCase().includes(q.value.toLowerCase())),
)

watch(() => props.open, async (v) => {
  lock(v)
  if (!v) return
  loading.value = true
  try {
    list.value = await api<AdminMedia[]>('/api/admin/media')
  } finally {
    loading.value = false
  }
}, { immediate: true })

function choose(m: PublicMedia) {
  map[m.id] = m
  emit('select', m)
  emit('close')
}
async function onFiles(files: File[]) {
  const res = await upload(files)
  list.value = [...res, ...list.value]
  if (res.length === 1) choose(res[0]!)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  lock(false)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="admin a-modal-bg" @click.self="emit('close')">
      <div class="a-modal" role="dialog" aria-modal="true" aria-label="Médiathèque">
        <div class="a-panel-head">
          <p class="a-panel-title">Médiathèque</p>
          <div class="a-row">
            <label class="mp-search"><Search /><input v-model="q" class="a-input" placeholder="Rechercher"></label>
            <button type="button" class="a-btn is-icon is-ghost" aria-label="Fermer" @click="emit('close')"><X /></button>
          </div>
        </div>
        <div class="a-modal-body a-stack">
          <AdminDropzone class="a-drop" :accept="accept" @files="onFiles">
            <Upload /><strong>Glisse des fichiers ici</strong><span class="a-hint">ou clique pour les choisir sur ton ordinateur</span>
          </AdminDropzone>
          <p v-if="loading" class="a-empty">Chargement…</p>
          <p v-else-if="!shown.length" class="a-empty">Aucun média pour l'instant.</p>
          <div v-else class="mp-grid">
            <button v-for="m in shown" :key="m.id" type="button" class="mp-item" :title="m.originalName" @click="choose(m)">
              <img v-if="m.kind === 'image'" :src="m.url" :srcset="m.srcset" sizes="160px" alt="" loading="lazy">
              <span v-else class="mp-file"><Video v-if="m.kind === 'video'" /><FileText v-else /></span>
              <span class="mp-name">{{ m.originalName }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.mp-search { position: relative; display: block; }
.mp-search svg { position: absolute; left: 9px; top: 50%; width: 15px; height: 15px; transform: translateY(-50%); color: var(--muted); }
.mp-search .a-input { padding-left: 30px; width: 200px; }
.mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
.mp-item { position: relative; display: grid; aspect-ratio: 1; padding: 0; border: 1px solid var(--line); border-radius: 3px; background: #fff; overflow: hidden; text-align: left; }
.mp-item:hover { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue); }
.mp-item img { width: 100%; height: 100%; object-fit: cover; }
.mp-file { display: grid; place-items: center; color: var(--blue); }
.mp-file svg { width: 34px; height: 34px; stroke-width: 1.2; }
.mp-name { position: absolute; inset: auto 0 0; padding: 4px 6px; background: color-mix(in srgb, #fff 88%, transparent); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>

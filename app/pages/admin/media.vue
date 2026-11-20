<script setup lang="ts">
import { Upload, Trash2, Copy, FileText, Video, X, Search } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const api = useAdminApi()
const toast = useToast()
const { upload, items } = useUpload()
const editLang = ref<'fr' | 'en'>('fr')
provide(EDIT_LANG, editLang)

const list = ref<AdminMedia[]>(await api<AdminMedia[]>('/api/admin/media'))
const selected = ref<AdminMedia | null>(null)
const q = ref('')
const kind = ref<'all' | 'image' | 'video' | 'file'>('all')
const shown = computed(() => list.value.filter((m) => (kind.value === 'all' || m.kind === kind.value) && (!q.value || m.originalName.toLowerCase().includes(q.value.toLowerCase()))))
const total = computed(() => list.value.reduce((s, m) => s + m.size, 0))

async function onFiles(files: File[]) {
  const res = await upload(files)
  list.value = [...res, ...list.value]
}
async function saveAlt() {
  if (!selected.value) return
  await api(`/api/admin/media/${selected.value.id}`, { method: 'PUT', body: { alt: selected.value.alt } })
  toast.success('Texte alternatif enregistré')
}
async function remove(m: AdminMedia) {
  const msg = m.usage.length ? `Ce média est utilisé dans :\n- ${m.usage.join('\n- ')}\n\nIl sera retiré de ces endroits. Supprimer ?` : 'Supprimer ce média ?'
  if (!window.confirm(msg)) return
  await api(`/api/admin/media/${m.id}`, { method: 'DELETE' })
  list.value = list.value.filter((x) => x.id !== m.id)
  selected.value = null
  toast.success('Média supprimé')
}
async function copy(m: AdminMedia) {
  await navigator.clipboard?.writeText(location.origin + m.url)
  toast.success('Adresse copiée')
}
</script>

<template>
  <div class="a-page">
    <header class="a-head">
      <div>
        <h1 class="a-title">Médiathèque<sup>{{ list.length }}</sup></h1>
        <p class="a-sub">{{ formatBytes(total) }} au total · images converties automatiquement en versions optimisées (webp)</p>
      </div>
    </header>

    <AdminDropzone class="a-drop" accept="image/*,video/*,.pdf" @files="onFiles">
      <Upload /><strong>Importer des fichiers</strong>
      <span class="a-hint">Glisse-dépose depuis ton ordinateur ou clique · JPG, PNG, WEBP, AVIF, GIF, SVG, MP4, WEBM, PDF</span>
    </AdminDropzone>
    <div v-if="items.length" class="bc-uploads md-uploads">
      <div v-for="u in items" :key="u.key" class="bc-upload"><span>{{ u.name }}</span><i :style="{ width: `${Math.round(u.progress * 100)}%` }" /></div>
    </div>

    <div class="pl-filters md-filters">
      <label class="mp-search"><Search /><input v-model="q" class="a-input" placeholder="Rechercher"></label>
      <AdminSeg v-model="kind" :options="[{ value: 'all', label: 'Tout' }, { value: 'image', label: 'Images' }, { value: 'video', label: 'Vidéos' }, { value: 'file', label: 'Fichiers' }]" />
    </div>

    <div class="md-layout">
      <div class="mp-grid md-grid">
        <button v-for="m in shown" :key="m.id" type="button" class="mp-item" :class="{ 'is-sel': selected?.id === m.id }" :title="m.originalName" @click="selected = m">
          <img v-if="m.kind === 'image'" :src="m.url" :srcset="m.srcset" sizes="180px" alt="" loading="lazy">
          <span v-else class="mp-file"><Video v-if="m.kind === 'video'" /><FileText v-else /></span>
          <span class="mp-name">{{ m.originalName }}</span>
          <span v-if="!m.usage.length" class="md-unused a-badge">inutilisé</span>
        </button>
      </div>

      <aside v-if="selected" class="a-panel md-side">
        <div class="a-panel-head">
          <p class="a-panel-title md-name">{{ selected.originalName }}</p>
          <button type="button" class="a-btn is-icon is-ghost is-sm" aria-label="Fermer" @click="selected = null"><X /></button>
        </div>
        <div class="a-panel-pad a-stack">
          <div class="md-preview">
            <img v-if="selected.kind === 'image'" :src="selected.url" alt="">
            <video v-else-if="selected.kind === 'video'" :src="selected.url" controls playsinline />
            <a v-else :href="selected.url" target="_blank" class="a-btn"><FileText /> Ouvrir le fichier</a>
          </div>
          <p class="a-hint">
            {{ selected.mime }} · {{ formatBytes(selected.size) }}<template v-if="selected.width"> · {{ selected.width }}×{{ selected.height }} px</template>
          </p>
          <AdminI18nField v-if="selected.kind !== 'file'" v-model="selected.alt" label="Texte alternatif (accessibilité)" placeholder="Décris l'image en quelques mots" />
          <button v-if="selected.kind !== 'file'" type="button" class="a-btn is-sm" @click="saveAlt">Enregistrer le texte</button>
          <div v-if="selected.usage.length" class="a-field">
            <span class="a-label">Utilisé dans</span>
            <ul class="md-usage"><li v-for="u in selected.usage" :key="u">{{ u }}</li></ul>
          </div>
          <div class="a-row">
            <button type="button" class="a-btn is-sm" @click="copy(selected)"><Copy /> Copier l'adresse</button>
            <button type="button" class="a-btn is-sm is-danger" @click="remove(selected)"><Trash2 /> Supprimer</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style>
.md-uploads { margin-top: 10px; }
.md-filters { margin-top: 18px; }
.md-layout { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: start; }
.md-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.mp-item.is-sel { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue); }
.md-unused { position: absolute; left: 6px; top: 6px; background: #fff; }
.md-side { position: sticky; top: 16px; width: 340px; max-height: calc(100svh - 32px); overflow: auto; }
.md-name { font-size: 15px; word-break: break-all; }
.md-preview { display: grid; place-items: center; background: color-mix(in srgb, var(--blue) 5%, #fff); border-radius: 3px; overflow: hidden; }
.md-preview img, .md-preview video { max-height: 260px; width: 100%; object-fit: contain; }
.md-usage { display: grid; gap: 4px; font-size: 13px; }
.md-usage li::before { content: '→ '; color: var(--blue); }
@media (max-width: 900px) {
  .md-layout { grid-template-columns: 1fr; }
  .md-side { position: fixed; inset: auto 0 64px 0; width: auto; max-height: 70svh; z-index: 50; border-radius: 8px 8px 0 0; box-shadow: 0 -20px 50px -20px rgba(9, 11, 208, .5); }
}
</style>

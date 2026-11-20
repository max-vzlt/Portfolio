<script setup lang="ts">
import Sortable from 'sortablejs'
import { Plus, GripVertical, Pencil, Copy, Trash2, ExternalLink, Search, Upload, LoaderCircle } from 'lucide-vue-next'
import type { Category, Project, PublicMedia } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const api = useAdminApi()
const toast = useToast()
const { upload } = useUpload()

const projects = ref<Project[]>([])
const categories = ref<Category[]>([])
const map = provideMediaMap()
const loading = ref(true)
const creating = ref(false)

async function load() {
  const res = await api<{ projects: Project[]; categories: Category[]; media: Record<string, PublicMedia> }>('/api/admin/projects')
  projects.value = res.projects
  categories.value = res.categories
  Object.assign(map, res.media)
  loading.value = false
}
await load()

/* ---------- filters ---------- */
const q = ref('')
const cat = ref('')
const vis = ref<'all' | 'on' | 'off'>('all')
const filtering = computed(() => !!q.value || !!cat.value || vis.value !== 'all')
const shown = computed(() =>
  projects.value.filter((p) =>
    (!q.value || `${p.title.fr} ${p.title.en} ${p.slug}`.toLowerCase().includes(q.value.toLowerCase()))
    && (!cat.value || p.categoryIds.includes(cat.value))
    && (vis.value === 'all' || (vis.value === 'on' ? p.visible : !p.visible))),
)
const catName = (id: string) => categories.value.find((c) => c.id === id)?.name.fr || '?'

/* ---------- reorder ---------- */
const list = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null
onMounted(() => {
  if (!list.value) return
  sortable = Sortable.create(list.value, {
    handle: '.pl-handle',
    animation: 200,
    forceFallback: true,
    fallbackOnBody: true,
    ghostClass: 'pl-ghost',
    async onEnd(evt) {
      const { oldIndex, newIndex, item, from } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      from.removeChild(item)
      from.insertBefore(item, from.children[oldIndex] ?? null)
      const arr = [...projects.value]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved!)
      projects.value = arr
      await api('/api/admin/projects/order', { method: 'PUT', body: { ids: arr.map((p) => p.id) } })
      toast.success('Ordre enregistré')
    },
  })
})
watch(filtering, (f) => sortable?.option('disabled', f))
onBeforeUnmount(() => sortable?.destroy())

/* ---------- actions ---------- */
async function create(mediaIds: string[] = []) {
  creating.value = true
  try {
    const p = await api<Project>('/api/admin/projects', { method: 'POST', body: { mediaIds } })
    await navigateTo(`/admin/projects/${p.id}`)
  } finally {
    creating.value = false
  }
}
async function quickCreate(files: File[]) {
  creating.value = true
  try {
    const media = await upload(files)
    if (media.length) await create(media.map((m) => m.id))
  } finally {
    creating.value = false
  }
}
async function toggle(p: Project) {
  const visible = !p.visible
  p.visible = visible
  try {
    await api(`/api/admin/projects/${p.id}`, { method: 'PATCH', body: { visible } })
    toast.success(visible ? 'Trace visible sur le site' : 'Trace masquée')
  } catch {
    p.visible = !visible
  }
}
async function duplicate(p: Project) {
  await api(`/api/admin/projects/${p.id}/duplicate`, { method: 'POST' })
  await load()
  toast.success('Trace dupliquée (masquée)')
}
async function remove(p: Project) {
  if (!window.confirm(`Supprimer définitivement « ${p.title.fr} » ?\nLes images restent dans la médiathèque.`)) return
  await api(`/api/admin/projects/${p.id}`, { method: 'DELETE' })
  projects.value = projects.value.filter((x) => x.id !== p.id)
  toast.success('Trace supprimée')
}
const visibleCount = computed(() => projects.value.filter((p) => p.visible).length)
</script>

<template>
  <div class="a-page">
    <header class="a-head">
      <div>
        <h1 class="a-title">Traces<sup>{{ projects.length }}</sup></h1>
        <p class="a-sub">{{ visibleCount }} visible{{ visibleCount > 1 ? 's' : '' }} sur le site · glisse ⠿ pour changer l'ordre d'affichage</p>
      </div>
      <div class="a-actions">
        <button type="button" class="a-btn is-primary" :disabled="creating" @click="create()">
          <LoaderCircle v-if="creating" class="spin" /><Plus v-else /> Nouvelle trace
        </button>
      </div>
    </header>

    <AdminDropzone class="a-drop pl-quick" accept="image/*,video/*" @files="quickCreate">
      <Upload /><strong>Création express</strong>
      <span class="a-hint">Glisse des images ici (ou clique) : une nouvelle trace est créée avec la 1re en couverture et toutes les autres en blocs.</span>
    </AdminDropzone>

    <div class="pl-filters">
      <label class="mp-search"><Search /><input v-model="q" class="a-input" placeholder="Rechercher une trace"></label>
      <select v-model="cat" class="a-select" aria-label="Catégorie">
        <option value="">Toutes les catégories</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name.fr }}</option>
      </select>
      <AdminSeg v-model="vis" :options="[{ value: 'all', label: 'Toutes' }, { value: 'on', label: 'Visibles' }, { value: 'off', label: 'Masquées' }]" />
      <span v-if="filtering" class="a-hint">Le tri par glisser-déposer est désactivé pendant le filtrage.</span>
    </div>

    <div v-if="!loading && !projects.length" class="a-panel a-empty">Aucune trace pour l'instant. Crée la première !</div>

    <ul ref="list" class="pl-list">
      <li v-for="p in projects" v-show="shown.includes(p)" :key="p.id" class="pl-row a-panel" :class="{ 'is-off': !p.visible }">
        <button type="button" class="pl-handle bk-handle" :disabled="filtering" aria-label="Déplacer" title="Glisser pour réordonner"><GripVertical /></button>
        <NuxtLink :to="`/admin/projects/${p.id}`" class="pl-thumb">
          <DotImage :media="map[p.coverId || ''] || null" :effect="p.coverEffect" :seed="p.id" sizes="120px" :paper="false" />
        </NuxtLink>
        <NuxtLink :to="`/admin/projects/${p.id}`" class="pl-main">
          <strong class="pl-title">{{ p.title.fr || 'Sans titre' }}</strong>
          <span class="pl-sub">
            <span class="a-hint">/{{ p.slug }}</span>
            <span v-for="c in p.categoryIds" :key="c" class="a-badge">{{ catName(c) }}</span>
            <span v-if="!p.categoryIds.length" class="a-badge is-off">Sans catégorie</span>
            <span v-if="!p.title.en" class="a-badge is-off">EN manquant</span>
          </span>
        </NuxtLink>
        <span class="pl-meta a-hint">{{ p.year }}<br>{{ p.blocks.length }} bloc{{ p.blocks.length > 1 ? 's' : '' }}</span>
        <AdminSwitch :model-value="p.visible" class="pl-vis" @update:model-value="toggle(p)">{{ p.visible ? 'Visible' : 'Masquée' }}</AdminSwitch>
        <div class="pl-actions">
          <NuxtLink :to="`/admin/projects/${p.id}`" class="a-btn is-sm"><Pencil /> Éditer</NuxtLink>
          <a :href="`/work/${p.slug}?preview`" target="_blank" class="a-btn is-sm is-icon" title="Aperçu"><ExternalLink /></a>
          <button type="button" class="a-btn is-sm is-icon" title="Dupliquer" @click="duplicate(p)"><Copy /></button>
          <button type="button" class="a-btn is-sm is-icon is-danger" title="Supprimer" @click="remove(p)"><Trash2 /></button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style>
.pl-quick { margin-bottom: 18px; }
.pl-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
.pl-filters .a-select { width: auto; }
.pl-list { display: grid; gap: 8px; }
.pl-row { display: grid; grid-template-columns: auto 96px minmax(0, 1fr) auto auto auto; align-items: center; gap: 14px; padding: 8px 12px 8px 6px; }
.pl-row.is-off .pl-thumb, .pl-row.is-off .pl-main { opacity: .55; }
.pl-handle:disabled { opacity: .25; cursor: default; }
.pl-thumb { position: relative; width: 96px; height: 64px; border-radius: 3px; overflow: hidden; }
.pl-main { display: grid; gap: 4px; min-width: 0; }
.pl-title { font-family: var(--font-display); font-weight: 400; font-size: 19px; line-height: 1.1; }
.pl-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.pl-meta { text-align: right; line-height: 1.35; }
.pl-vis { min-width: 106px; font-size: 13px; }
.pl-actions { display: flex; gap: 4px; }
.pl-ghost { opacity: .4; border-style: dashed; }
@media (max-width: 900px) {
  .pl-row { grid-template-columns: auto 72px minmax(0, 1fr); }
  .pl-thumb { width: 72px; height: 54px; }
  .pl-meta { display: none; }
  .pl-vis, .pl-actions { grid-column: 2 / -1; }
  .pl-vis { grid-row: 2; }
  .pl-actions { grid-row: 2; justify-self: end; }
}
</style>

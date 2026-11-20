<script setup lang="ts">
import Sortable from 'sortablejs'
import { Plus, GripVertical, Pencil, Copy, Trash2, ExternalLink, Search, Upload, LoaderCircle, Star, X, Trophy } from 'lucide-vue-next'
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

/* ---------- highlights: ranking of the best projects (shown first on the site) ---------- */
const ranking = computed(() => projects.value.filter((p) => p.featured).sort((a, b) => a.featuredRank - b.featuredRank))
async function saveRanking(ids: string[]) {
  const order = await api<string[]>('/api/admin/projects/featured', { method: 'PUT', body: { ids } })
  for (const p of projects.value) {
    const i = order.indexOf(p.id)
    p.featured = i >= 0
    p.featuredRank = i >= 0 ? i + 1 : 0
  }
}
async function toggleFeatured(p: Project) {
  const ids = ranking.value.map((x) => x.id)
  await saveRanking(p.featured ? ids.filter((id) => id !== p.id) : [...ids, p.id])
  toast.success(p.featured ? `« ${p.title.fr} » ajoutée au classement (#${p.featuredRank})` : `« ${p.title.fr} » retirée du classement`)
}
const rankList = ref<HTMLElement | null>(null)
let rankSortable: Sortable | null = null
function mountRankSortable() {
  rankSortable?.destroy()
  rankSortable = null
  if (!rankList.value) return
  rankSortable = Sortable.create(rankList.value, {
    handle: '.rk-handle',
    animation: 200,
    forceFallback: true,
    fallbackOnBody: true,
    ghostClass: 'pl-ghost',
    async onEnd(evt) {
      const { oldIndex, newIndex, item, from } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      from.removeChild(item)
      from.insertBefore(item, from.children[oldIndex] ?? null)
      const ids = ranking.value.map((x) => x.id)
      const [moved] = ids.splice(oldIndex, 1)
      ids.splice(newIndex, 0, moved!)
      await saveRanking(ids)
      toast.success('Classement enregistré')
    },
  })
}
onMounted(mountRankSortable)
watch(() => ranking.value.length > 0, () => nextTick(mountRankSortable))
onBeforeUnmount(() => rankSortable?.destroy())
</script>

<template>
  <div class="a-page">
    <header class="a-head">
      <div>
        <h1 class="a-title">Traces<sup>{{ projects.length }}</sup></h1>
        <p class="a-sub">{{ visibleCount }} visible{{ visibleCount > 1 ? 's' : '' }} sur le site · les traces du classement passent en premier, glisse ⠿ pour l'ordre des autres</p>
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

    <section class="a-panel rk">
      <div class="a-panel-head">
        <div>
          <p class="a-panel-title rk-title"><Trophy /> Classement des meilleurs projets</p>
          <p class="a-hint">Ces traces apparaissent en premier sur le site, dans cet ordre, avec un badge « Top ». Glisse ⠿ pour changer le classement, ☆ sur une trace pour l’ajouter.</p>
        </div>
      </div>
      <ol v-if="ranking.length" ref="rankList" class="rk-list">
        <li v-for="p in ranking" :key="p.id" class="rk-row">
          <button type="button" class="rk-handle bk-handle" aria-label="Déplacer dans le classement"><GripVertical /></button>
          <span class="rk-num">#{{ p.featuredRank }}</span>
          <span class="rk-thumb"><DotImage :media="map[p.coverId || ''] || null" :effect="p.coverEffect" :seed="p.id" sizes="80px" :paper="false" /></span>
          <NuxtLink :to="`/admin/projects/${p.id}`" class="rk-name">{{ p.title.fr || 'Sans titre' }}</NuxtLink>
          <span v-if="!p.visible" class="a-badge is-off">Masquée</span>
          <button type="button" class="a-btn is-sm is-icon is-ghost" title="Retirer du classement" @click="toggleFeatured(p)"><X /></button>
        </li>
      </ol>
      <p v-else class="a-empty rk-empty">Aucun projet mis en avant : clique sur ☆ dans la liste ci-dessous.</p>
    </section>

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
        <button type="button" class="pl-star" :class="{ 'is-on': p.featured }" :title="p.featured ? `Top ${p.featuredRank} — retirer du classement` : 'Mettre en avant (ajouter au classement)'" @click="toggleFeatured(p)">
          <Star /><span v-if="p.featured">#{{ p.featuredRank }}</span>
        </button>
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
.pl-row { display: grid; grid-template-columns: auto 96px minmax(0, 1fr) auto auto auto auto; align-items: center; gap: 14px; padding: 8px 12px 8px 6px; }
.pl-star { display: inline-flex; align-items: center; gap: 4px; height: 30px; min-width: 34px; padding: 0 8px; border: 1px solid color-mix(in srgb, var(--blue) 25%, transparent); border-radius: 3px; background: #fff; color: var(--muted); font-family: var(--font-mono); font-size: 11px; }
.pl-star svg { width: 15px; height: 15px; }
.pl-star:hover { color: var(--blue); border-color: var(--blue); }
.pl-star.is-on { background: var(--blue); border-color: var(--blue); color: #fff; }
.pl-star.is-on svg { fill: currentColor; }
.rk { margin-bottom: 18px; }
.rk-title { display: inline-flex; align-items: center; gap: 8px; }
.rk-title svg { width: 18px; height: 18px; }
.rk-list { display: grid; gap: 6px; padding: 10px; margin: 0; list-style: none; }
.rk-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px 6px 4px; border: 1px solid var(--line); border-radius: 3px; background: color-mix(in srgb, var(--blue) 3%, #fff); }
.rk-num { min-width: 34px; font-family: var(--font-display); font-size: 22px; font-weight: 300; color: var(--blue); }
.rk-thumb { position: relative; width: 56px; height: 38px; border-radius: 2px; overflow: hidden; flex: none; }
.rk-name { flex: 1; min-width: 0; font-family: var(--font-display); font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rk-empty { padding: 18px; }
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
  .pl-row { grid-template-columns: auto 72px minmax(0, 1fr) auto; }
  .pl-thumb { width: 72px; height: 54px; }
  .pl-meta { display: none; }
  .pl-vis, .pl-actions { grid-column: 2 / -1; }
  .pl-star { grid-row: 1; grid-column: 4; }
  .pl-vis { grid-row: 2; }
  .pl-actions { grid-row: 2; justify-self: end; }
}
</style>

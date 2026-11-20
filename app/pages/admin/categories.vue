<script setup lang="ts">
import Sortable from 'sortablejs'
import { GripVertical, Plus, Trash2, Languages, LoaderCircle } from 'lucide-vue-next'
import type { Category } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const api = useAdminApi()
const toast = useToast()
const { fill, busy } = useTranslate()

type Row = Category & { count: number }
const rows = ref<Row[]>(await api<Row[]>('/api/admin/categories'))
const snapshot = new Map(rows.value.map((r) => [r.id, JSON.stringify(r)]))
const fresh = ref({ fr: '', en: '' })

async function add() {
  if (!fresh.value.fr.trim() && !fresh.value.en.trim()) return
  const c = await api<Category>('/api/admin/categories', { method: 'POST', body: { name: fresh.value } })
  rows.value = [...rows.value, { ...c, count: 0 }]
  snapshot.set(c.id, JSON.stringify({ ...c, count: 0 }))
  fresh.value = { fr: '', en: '' }
  toast.success('Catégorie ajoutée')
}
async function saveRow(r: Row) {
  if (snapshot.get(r.id) === JSON.stringify(r)) return
  const c = await api<Category>(`/api/admin/categories/${r.id}`, { method: 'PUT', body: { name: r.name, slug: r.slug } })
  Object.assign(r, c)
  snapshot.set(r.id, JSON.stringify(r))
  toast.success('Catégorie enregistrée')
}
async function remove(r: Row) {
  const msg = r.count ? `« ${r.name.fr} » est utilisée par ${r.count} trace(s). La supprimer quand même ?` : `Supprimer « ${r.name.fr} » ?`
  if (!window.confirm(msg)) return
  await api(`/api/admin/categories/${r.id}`, { method: 'DELETE' })
  rows.value = rows.value.filter((x) => x.id !== r.id)
  toast.success('Catégorie supprimée')
}
async function translateAll() {
  const n = await fill(rows.value.map((r) => r.name), 'fr', 'en')
  for (const r of rows.value) await saveRow(r)
  if (!n) toast.success('Toutes les catégories ont déjà un nom anglais')
}

const list = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null
onMounted(() => {
  if (!list.value) return
  sortable = Sortable.create(list.value, {
    handle: '.bk-handle',
    animation: 200,
    forceFallback: true,
    fallbackOnBody: true,
    ghostClass: 'pl-ghost',
    async onEnd(evt) {
      const { oldIndex, newIndex, item, from } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      from.removeChild(item)
      from.insertBefore(item, from.children[oldIndex] ?? null)
      const arr = [...rows.value]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved!)
      rows.value = arr
      await api('/api/admin/categories/order', { method: 'PUT', body: { ids: arr.map((r) => r.id) } })
      toast.success('Ordre enregistré')
    },
  })
})
onBeforeUnmount(() => sortable?.destroy())
</script>

<template>
  <div class="a-page cat-page">
    <header class="a-head">
      <div>
        <h1 class="a-title">Catégories<sup>{{ rows.length }}</sup></h1>
        <p class="a-sub">Ce sont les filtres proposés aux visiteurs. Une catégorie sans trace visible n'apparaît pas sur le site.</p>
      </div>
      <button type="button" class="a-btn" :disabled="busy" @click="translateAll">
        <LoaderCircle v-if="busy" class="spin" /><Languages v-else /> Traduire les noms en anglais
      </button>
    </header>

    <form class="a-panel a-panel-pad cat-add" @submit.prevent="add">
      <label class="a-field"><span class="a-label">Nom (FR)</span><input v-model="fresh.fr" class="a-input" placeholder="ex. Création visuelle"></label>
      <label class="a-field"><span class="a-label">Nom (EN)</span><input v-model="fresh.en" class="a-input" placeholder="ex. Visual design"></label>
      <button type="submit" class="a-btn is-primary"><Plus /> Ajouter</button>
    </form>

    <ul ref="list" class="cat-list">
      <li v-for="r in rows" :key="r.id" class="a-panel cat-row">
        <button type="button" class="bk-handle" aria-label="Déplacer"><GripVertical /></button>
        <label class="a-field"><span class="a-label">FR</span><input v-model="r.name.fr" class="a-input" @change="saveRow(r)"></label>
        <label class="a-field"><span class="a-label">EN</span><input v-model="r.name.en" class="a-input" placeholder="—" @change="saveRow(r)"></label>
        <label class="a-field"><span class="a-label">Filtre (URL)</span><input v-model="r.slug" class="a-input" @change="saveRow(r)"></label>
        <span class="a-badge" :class="{ 'is-off': !r.count }">{{ r.count }} trace{{ r.count > 1 ? 's' : '' }}</span>
        <button type="button" class="a-btn is-sm is-icon is-danger" title="Supprimer" @click="remove(r)"><Trash2 /></button>
      </li>
    </ul>
  </div>
</template>

<style>
.cat-page { max-width: 1100px; }
.cat-add { display: grid; grid-template-columns: 1fr 1fr auto; align-items: end; gap: 12px; margin-bottom: 18px; }
.cat-list { display: grid; gap: 8px; }
.cat-row { display: grid; grid-template-columns: auto 1fr 1fr 1fr auto auto; align-items: end; gap: 12px; padding: 10px 12px 10px 6px; }
.cat-row .bk-handle { align-self: center; }
.cat-row .a-badge { align-self: center; white-space: nowrap; }
.cat-row .a-btn { align-self: center; }
@media (max-width: 760px) {
  .cat-add { grid-template-columns: 1fr; }
  .cat-row { grid-template-columns: auto 1fr 1fr; }
  .cat-row > .a-field:nth-of-type(3) { grid-column: 2 / -1; }
}
</style>

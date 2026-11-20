<script setup lang="ts">
import { ArrowLeft, Save, ExternalLink, Languages, LoaderCircle, Copy, Trash2, Plus, Check } from 'lucide-vue-next'
import type { Category, I18nText, Lang, Project, PublicMedia } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const api = useAdminApi()
const toast = useToast()
const { fill, busy: translating } = useTranslate()

const editLang = ref<Lang>('fr')
provide(EDIT_LANG, editLang)
const map = provideMediaMap()

const id = String(route.params.id)
const res = await api<{ project: Project; categories: Category[]; media: Record<string, PublicMedia> }>(`/api/admin/projects/${id}`)
Object.assign(map, res.media)
const categories = ref<Category[]>(res.categories)
const draft = ref<Project>(structuredClone(res.project))
const savedJson = ref(JSON.stringify(res.project))
const dirty = computed(() => JSON.stringify(draft.value) !== savedJson.value)
const saving = ref(false)
const savedFlash = ref(false)

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const out = await api<Project>(`/api/admin/projects/${id}`, { method: 'PUT', body: draft.value })
    draft.value = structuredClone(out)
    savedJson.value = JSON.stringify(out)
    savedFlash.value = true
    setTimeout(() => (savedFlash.value = false), 1600)
  } finally {
    saving.value = false
  }
}

/* ---------- keyboard + leave guards ---------- */
function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}
const beforeUnload = (e: BeforeUnloadEvent) => {
  if (dirty.value) e.preventDefault()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', beforeUnload)
})
onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) return false
})

/* ---------- slug follows the title until edited by hand ---------- */
const slugTouched = ref(res.project.title.fr !== 'Nouvelle trace')
watch(() => draft.value.title.fr, (v) => {
  if (!slugTouched.value) draft.value.slug = slugify(v)
})

/* ---------- categories ---------- */
function toggleCat(cid: string) {
  const ids = draft.value.categoryIds
  draft.value.categoryIds = ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]
}
const newCat = ref('')
async function addCat() {
  const name = newCat.value.trim()
  if (!name) return
  const c = await api<Category>('/api/admin/categories', { method: 'POST', body: { name: { fr: name, en: '' } } })
  categories.value = [...categories.value, c]
  draft.value.categoryIds = [...draft.value.categoryIds, c.id]
  newCat.value = ''
  toast.success(`Catégorie « ${name} » créée`)
}

/* ---------- translation of the whole project ---------- */
function allTexts(p: Project): I18nText[] {
  const out: I18nText[] = [p.title, p.summary, p.link.label]
  for (const b of p.blocks) {
    if (b.text) out.push(b.text)
    if (b.caption) out.push(b.caption)
  }
  return out
}
const missingEn = computed(() => allTexts(draft.value).filter((t) => t.fr?.trim() && !t.en?.trim()).length)
async function translateAll() {
  const n = await fill(allTexts(draft.value), 'fr', 'en')
  toast.success(n ? `${n} champ${n > 1 ? 's' : ''} traduit${n > 1 ? 's' : ''} en anglais` : "Rien à traduire : l'anglais est déjà complet")
  if (n) editLang.value = 'en'
}

/* ---------- other actions ---------- */
async function duplicate() {
  const copy = await api<Project>(`/api/admin/projects/${id}/duplicate`, { method: 'POST' })
  savedJson.value = JSON.stringify(draft.value)
  await navigateTo(`/admin/projects/${copy.id}`)
}
async function remove() {
  if (!window.confirm(`Supprimer définitivement « ${draft.value.title.fr} » ?`)) return
  await api(`/api/admin/projects/${id}`, { method: 'DELETE' })
  savedJson.value = JSON.stringify(draft.value)
  toast.success('Trace supprimée')
  await navigateTo('/admin')
}
const previewUrl = computed(() => `/work/${JSON.parse(savedJson.value).slug}?preview`)
</script>

<template>
  <div class="ed">
    <!-- top bar -->
    <div class="ed-top">
      <NuxtLink to="/admin" class="a-btn is-ghost is-icon" aria-label="Retour aux traces" title="Retour aux traces"><ArrowLeft /></NuxtLink>
      <div class="ed-top-title">
        <strong>{{ draft.title.fr || 'Sans titre' }}</strong>
        <span class="a-hint">
          <template v-if="saving">Enregistrement…</template>
          <template v-else-if="dirty">● Modifications non enregistrées</template>
          <template v-else-if="savedFlash"><Check class="ed-ok" /> Enregistré</template>
          <template v-else>À jour</template>
        </span>
      </div>
      <div class="a-actions">
        <AdminSeg v-model="editLang" :options="[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]" label="Langue" />
        <button type="button" class="a-btn" :disabled="translating" :title="missingEn ? `${missingEn} champ(s) sans traduction anglaise` : 'Anglais complet'" @click="translateAll">
          <LoaderCircle v-if="translating" class="spin" /><Languages v-else />
          <span class="ed-hide-sm">Traduire en anglais</span>
          <span v-if="missingEn" class="a-badge">{{ missingEn }}</span>
        </button>
        <a :href="previewUrl" target="_blank" class="a-btn" title="Aperçu (version enregistrée)"><ExternalLink /> <span class="ed-hide-sm">Aperçu</span></a>
        <button type="button" class="a-btn is-primary" :disabled="saving || !dirty" title="Ctrl / Cmd + S" @click="save">
          <LoaderCircle v-if="saving" class="spin" /><Save v-else /> Enregistrer
        </button>
      </div>
    </div>

    <div class="ed-layout">
      <!-- content -->
      <section class="ed-canvas">
        <AdminI18nField v-model="draft.title" label="Titre" big placeholder="Titre de la trace" />
        <div class="a-panel a-panel-pad">
          <p class="a-label ed-canvas-label">Contenu de la page · grille de 3 colonnes</p>
          <AdminBlockCanvas v-model="draft.blocks" />
        </div>
      </section>

      <!-- settings -->
      <aside class="ed-side">
        <div class="a-panel a-panel-pad a-stack">
          <AdminSwitch v-model="draft.visible">
            <strong>{{ draft.visible ? 'Visible sur le site' : 'Masquée (brouillon)' }}</strong>
          </AdminSwitch>
        </div>

        <div class="a-panel a-panel-pad a-stack">
          <p class="a-panel-title">Catégories</p>
          <div class="ed-cats">
            <button v-for="c in categories" :key="c.id" type="button" class="a-chip" :class="{ 'is-on': draft.categoryIds.includes(c.id) }" @click="toggleCat(c.id)">
              {{ c.name.fr }}
            </button>
          </div>
          <form class="a-row" @submit.prevent="addCat">
            <input v-model="newCat" class="a-input ed-newcat" placeholder="Nouvelle catégorie">
            <button type="submit" class="a-btn is-sm" :disabled="!newCat.trim()"><Plus /> Créer</button>
          </form>
        </div>

        <div class="a-panel a-panel-pad a-stack">
          <p class="a-panel-title">Carte sur l'accueil</p>
          <AdminMediaField v-model="draft.coverId" v-model:effect="draft.coverEffect" label="Image de couverture" with-effect height="170px" />
          <AdminI18nField v-model="draft.summary" label="Résumé" multiline rich :rows="3" placeholder="Une ou deux phrases qui donnent envie de cliquer" />
          <div class="ed-card-size">
            <AdminSeg v-model="draft.card.col" label="Largeur" :options="[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]" />
            <AdminSeg v-model="draft.card.row" label="Hauteur" :options="[{ value: 1, label: '1' }, { value: 2, label: '2' }]" />
            <div class="ed-card-preview" aria-hidden="true">
              <i v-for="n in 3" :key="n" :class="{ on: n <= draft.card.col }" :style="{ height: draft.card.row === 2 ? '26px' : '14px' }" />
            </div>
          </div>
        </div>

        <div class="a-panel a-panel-pad a-stack">
          <p class="a-panel-title">Informations</p>
          <div class="a-grid2">
            <label class="a-field"><span class="a-label">Année</span><input v-model="draft.year" class="a-input" placeholder="2026"></label>
            <label class="a-field"><span class="a-label">Adresse (slug)</span><input v-model="draft.slug" class="a-input" @input="slugTouched = true"></label>
          </div>
          <AdminTags v-model="draft.tools" label="Outils / technos" placeholder="Unity, Figma… puis Entrée" />
          <label class="a-field"><span class="a-label">Lien externe</span><input v-model="draft.link.url" class="a-input" placeholder="https://…"></label>
          <AdminI18nField v-if="draft.link.url" v-model="draft.link.label" label="Texte du lien" placeholder="Voir le projet en ligne" />
        </div>

        <div class="a-panel a-panel-pad a-row">
          <button type="button" class="a-btn is-sm" @click="duplicate"><Copy /> Dupliquer</button>
          <button type="button" class="a-btn is-sm is-danger" @click="remove"><Trash2 /> Supprimer</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style>
.ed-top {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px clamp(16px, 3vw, 40px);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.ed-top-title { flex: 1; min-width: 160px; display: grid; }
.ed-top-title strong { font-family: var(--font-display); font-weight: 400; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ed-ok { width: 13px; height: 13px; display: inline; vertical-align: -2px; }
.ed-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; padding: 20px clamp(16px, 3vw, 40px) 100px; max-width: 1700px; }
.ed-canvas { display: grid; gap: 16px; min-width: 0; }
.ed-canvas-label { margin-bottom: 10px; }
.ed-side { position: sticky; top: 76px; display: grid; gap: 12px; max-height: calc(100svh - 90px); overflow: auto; padding-bottom: 8px; }
.ed-cats { display: flex; flex-wrap: wrap; gap: 6px; }
.ed-newcat { flex: 1; min-width: 0; }
.ed-card-size { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
.ed-card-preview { display: grid; grid-template-columns: repeat(3, 14px); gap: 3px; align-items: start; }
.ed-card-preview i { display: block; background: color-mix(in srgb, var(--blue) 14%, transparent); border-radius: 1px; transition: height .2s; }
.ed-card-preview i.on { background: var(--blue); }
@media (max-width: 1180px) {
  .ed-layout { grid-template-columns: 1fr; }
  .ed-side { position: static; max-height: none; overflow: visible; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
  .ed-side > * { align-self: start; }
}
@media (max-width: 640px) {
  .ed-hide-sm { display: none; }
}
</style>

<script setup lang="ts">
import { Save, LoaderCircle, Plus, Trash2, Languages, ArrowUp, ArrowDown } from 'lucide-vue-next'
import type { I18nText, Lang, PublicMedia, Settings } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const api = useAdminApi()
const toast = useToast()
const { fill, busy: translating } = useTranslate()

const editLang = ref<Lang>('fr')
provide(EDIT_LANG, editLang)
const map = provideMediaMap()

const res = await api<{ settings: Settings; media: Record<string, PublicMedia> }>('/api/admin/settings')
Object.assign(map, res.media)
const s = ref<Settings>(structuredClone(res.settings))
const saved = ref(JSON.stringify(res.settings))
const dirty = computed(() => JSON.stringify(s.value) !== saved.value)
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    const out = await api<Settings>('/api/admin/settings', { method: 'PUT', body: s.value })
    s.value = structuredClone(out)
    saved.value = JSON.stringify(out)
    toast.success('Réglages enregistrés')
  } finally {
    saving.value = false
  }
}
function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) return false
})

const e = () => ({ fr: '', en: '' })
function move<T>(arr: T[], i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
}
function texts(): I18nText[] {
  const v = s.value
  return [
    v.role, v.hero.kicker, v.hero.title, v.hero.intro, ...v.hero.tabs.flatMap((t) => [t.label, t.line]),
    v.about.title, v.about.body, ...v.about.facts.flatMap((f) => [f.label, f.value]),
    v.skills.title, ...v.skills.groups.map((g) => g.title), v.contact.title, v.contact.text, v.seo.description,
  ]
}
async function translateAll() {
  const n = await fill(texts(), 'fr', 'en')
  toast.success(n ? `${n} champ(s) traduit(s) — pense à enregistrer` : "L'anglais est déjà complet")
  if (n) editLang.value = 'en'
}
const itemsText = (g: { items: string[] }) => g.items.join(', ')
</script>

<template>
  <div class="a-page st">
    <header class="a-head st-head">
      <div>
        <h1 class="a-title">Réglages</h1>
        <p class="a-sub">Textes de l'accueil, « Qui suis-je », compétences, contact, réseaux et CV.</p>
      </div>
      <div class="a-actions">
        <AdminSeg v-model="editLang" :options="[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]" label="Langue" />
        <button type="button" class="a-btn" :disabled="translating" @click="translateAll">
          <LoaderCircle v-if="translating" class="spin" /><Languages v-else /> Traduire en anglais
        </button>
        <button type="button" class="a-btn is-primary" :disabled="saving || !dirty" @click="save">
          <LoaderCircle v-if="saving" class="spin" /><Save v-else /> Enregistrer
        </button>
      </div>
    </header>

    <div class="st-grid">
      <!-- identity -->
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Identité</p></div>
        <div class="a-panel-pad a-stack">
          <label class="a-field"><span class="a-label">Nom</span><input v-model="s.name" class="a-input"></label>
          <AdminI18nField v-model="s.role" label="Métier / rôle" />
          <AdminMediaField v-model="s.cvId" label="CV (PDF)" kind="file" />
          <AdminI18nField v-model="s.seo.description" label="Description pour Google" multiline :rows="2" />
        </div>
      </section>

      <!-- hero -->
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Accueil (haut de page)</p></div>
        <div class="a-panel-pad a-stack">
          <AdminI18nField v-model="s.hero.kicker" label="Petit texte au-dessus du titre" />
          <AdminI18nField v-model="s.hero.title" label="Grand titre" big />
          <AdminI18nField v-model="s.hero.intro" label="Introduction" multiline rich :rows="3" />
          <AdminMediaField v-model="s.hero.imageId" v-model:effect="s.hero.effect" label="Image principale (laisse vide pour le visuel généré)" with-effect height="220px" />
          <div class="a-field">
            <span class="a-label">Onglets de la console</span>
            <div v-for="(tb, i) in s.hero.tabs" :key="i" class="st-item">
              <AdminI18nField v-model="tb.label" compact placeholder="Onglet" />
              <AdminI18nField v-model="tb.line" compact placeholder="Phrase affichée" />
              <div class="st-item-actions">
                <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Monter" @click="move(s.hero.tabs, i, -1)"><ArrowUp /></button>
                <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Descendre" @click="move(s.hero.tabs, i, 1)"><ArrowDown /></button>
                <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" aria-label="Supprimer" @click="s.hero.tabs.splice(i, 1)"><Trash2 /></button>
              </div>
            </div>
            <button v-if="s.hero.tabs.length < 6" type="button" class="a-btn is-sm" @click="s.hero.tabs.push({ label: e(), line: e() })"><Plus /> Ajouter un onglet</button>
          </div>
        </div>
      </section>

      <!-- about -->
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Qui suis-je ?</p></div>
        <div class="a-panel-pad a-stack">
          <AdminI18nField v-model="s.about.title" label="Titre" />
          <AdminI18nField v-model="s.about.body" label="Texte" multiline rich :rows="6" />
          <AdminMediaField v-model="s.about.imageId" v-model:effect="s.about.effect" label="Portrait" with-effect fit="contain" height="220px" />
          <div class="a-field">
            <span class="a-label">Infos clés</span>
            <div v-for="(f, i) in s.about.facts" :key="i" class="st-item">
              <AdminI18nField v-model="f.label" compact placeholder="Formation…" />
              <AdminI18nField v-model="f.value" compact placeholder="BUT MMI…" />
              <div class="st-item-actions">
                <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Monter" @click="move(s.about.facts, i, -1)"><ArrowUp /></button>
                <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Descendre" @click="move(s.about.facts, i, 1)"><ArrowDown /></button>
                <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" aria-label="Supprimer" @click="s.about.facts.splice(i, 1)"><Trash2 /></button>
              </div>
            </div>
            <button type="button" class="a-btn is-sm" @click="s.about.facts.push({ label: e(), value: e() })"><Plus /> Ajouter une info</button>
          </div>
        </div>
      </section>

      <!-- skills -->
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Compétences</p></div>
        <div class="a-panel-pad a-stack">
          <AdminI18nField v-model="s.skills.title" label="Titre de la section" />
          <div v-for="(g, i) in s.skills.groups" :key="i" class="st-item st-group">
            <AdminI18nField v-model="g.title" compact placeholder="Je maîtrise…" />
            <AdminTags v-model="g.items" placeholder="HTML, CSS… puis Entrée" />
            <div class="st-item-actions">
              <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Monter" @click="move(s.skills.groups, i, -1)"><ArrowUp /></button>
              <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Descendre" @click="move(s.skills.groups, i, 1)"><ArrowDown /></button>
              <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" :aria-label="`Supprimer ${itemsText(g)}`" @click="s.skills.groups.splice(i, 1)"><Trash2 /></button>
            </div>
          </div>
          <button v-if="s.skills.groups.length < 6" type="button" class="a-btn is-sm" @click="s.skills.groups.push({ title: e(), items: [] })"><Plus /> Ajouter une colonne</button>
          <p class="a-hint">Idéalement 3 colonnes, pour suivre la grille du site.</p>
        </div>
      </section>

      <!-- contact -->
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Contact & réseaux</p></div>
        <div class="a-panel-pad a-stack">
          <AdminI18nField v-model="s.contact.title" label="Titre" />
          <AdminI18nField v-model="s.contact.text" label="Texte" multiline rich :rows="2" />
          <label class="a-field"><span class="a-label">Email (laisse vide pour le masquer)</span><input v-model="s.contact.email" type="email" class="a-input" placeholder="toi@exemple.com"></label>
          <div class="a-field">
            <span class="a-label">Réseaux sociaux</span>
            <div v-for="(so, i) in s.socials" :key="i" class="st-social">
              <input v-model="so.label" class="a-input" placeholder="LinkedIn">
              <input v-model="so.url" class="a-input" placeholder="https://…">
              <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" aria-label="Supprimer" @click="s.socials.splice(i, 1)"><Trash2 /></button>
            </div>
            <button type="button" class="a-btn is-sm" @click="s.socials.push({ label: '', url: '' })"><Plus /> Ajouter un réseau</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
.st-head { position: sticky; top: 0; z-index: 20; padding: 12px 0; margin: -12px 0 12px; background: color-mix(in srgb, var(--paper) 92%, transparent); backdrop-filter: blur(10px); }
.st-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 16px; align-items: start; }
.st-item { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto; gap: 8px; align-items: start; padding: 8px; border: 1px solid var(--line); border-radius: 3px; background: color-mix(in srgb, var(--blue) 2%, #fff); }
.st-group { grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) auto; }
.st-item .a-label { display: none; }
.st-item-actions { display: flex; gap: 0; }
.st-social { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; }
@media (max-width: 600px) {
  .st-item, .st-group { grid-template-columns: 1fr; }
}
</style>

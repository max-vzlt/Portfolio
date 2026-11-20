<script setup lang="ts">
import Sortable from 'sortablejs'
import {
  Save, LoaderCircle, Plus, Trash2, Languages, ArrowUp, ArrowDown, GripVertical, ChevronDown, Monitor, Tablet, Smartphone, RotateCw, ExternalLink, Eye, Pencil,
} from 'lucide-vue-next'
import type { HomeSectionId, I18nText, Lang, PublicMedia, Settings } from '#shared/types'

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

/* Only the keys of the home page are saved here (the rest lives in Réglages). */
const HOME_KEYS = ['hero', 'about', 'skills', 'contact', 'socials', 'home'] as const
const pick = (v: Settings) => JSON.stringify(HOME_KEYS.map((k) => v[k]))
const saved = ref(pick(res.settings))
const dirty = computed(() => pick(s.value) !== saved.value)
const saving = ref(false)

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const body = Object.fromEntries(HOME_KEYS.map((k) => [k, s.value[k]]))
    const out = await api<Settings>('/api/admin/settings', { method: 'PUT', body })
    s.value = structuredClone(out)
    saved.value = pick(out)
    toast.success("Page d'accueil enregistrée")
    reloadPreview()
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

/* ---------------------------------------------------------------- sections */
const META: Record<HomeSectionId, { name: string; hint: string }> = {
  work: { name: 'Réalisations', hint: 'La liste des traces et leurs cartes' },
  about: { name: 'Qui suis-je ?', hint: 'Portrait, présentation, infos clés' },
  skills: { name: 'Compétences', hint: 'Colonnes de compétences' },
  contact: { name: 'Contact', hint: 'Texte, email et réseaux' },
}
const open = ref<Record<string, boolean>>({ hero: true })
function toggle(id: string) {
  open.value = { ...open.value, [id]: !open.value[id] }
  if (open.value[id]) post({ type: 'mv-preview-scroll', id: id === 'hero' ? 'top' : id })
}
const list = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null
onMounted(() => {
  if (!list.value) return
  sortable = Sortable.create(list.value, {
    handle: '.hm-handle',
    animation: 200,
    forceFallback: true,
    fallbackOnBody: true,
    ghostClass: 'pl-ghost',
    onEnd(evt) {
      const { oldIndex, newIndex, item, from } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      from.removeChild(item)
      from.insertBefore(item, from.children[oldIndex] ?? null)
      const arr = [...s.value.home.sections]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved!)
      s.value.home.sections = arr
    },
  })
})
onBeforeUnmount(() => sortable?.destroy())

const e = () => ({ fr: '', en: '' })
function move<T>(arr: T[], i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
}
function texts(): I18nText[] {
  const v = s.value
  return [
    v.hero.kicker, v.hero.title, v.hero.intro, ...v.hero.tabs.flatMap((t) => [t.label, t.line]),
    v.home.work.title, v.home.work.intro,
    v.about.title, v.about.body, ...v.about.facts.flatMap((f) => [f.label, f.value]),
    v.skills.title, ...v.skills.groups.map((g) => g.title), v.contact.title, v.contact.text,
  ]
}
const missingEn = computed(() => texts().filter((t) => t.fr?.trim() && !t.en?.trim()).length)
async function translateAll() {
  const n = await fill(texts(), 'fr', 'en')
  toast.success(n ? `${n} champ(s) traduit(s) en anglais — pense à enregistrer` : "L'anglais est déjà complet")
  if (n) editLang.value = 'en'
}

/* ---------------------------------------------------------------- live preview */
type Device = 'desktop' | 'tablet' | 'mobile'
const device = ref<Device>('desktop')
const WIDTHS: Record<Device, number> = { desktop: 1440, tablet: 820, mobile: 390 }
const frame = ref<HTMLIFrameElement | null>(null)
const pane = ref<HTMLElement | null>(null)
const paneW = ref(600)
const paneH = ref(700)
const scale = computed(() => Math.min(1, paneW.value / WIDTHS[device.value]))
const src = computed(() => `${editLang.value === 'en' ? '/en' : '/'}?preview=1`)
const mobileView = ref<'edit' | 'preview'>('edit')

function post(msg: Record<string, unknown>) {
  frame.value?.contentWindow?.postMessage(msg, window.location.origin)
}
function sendDraft() {
  post({ type: 'mv-preview', settings: JSON.parse(JSON.stringify(s.value)), media: JSON.parse(JSON.stringify(map)) })
}
let t: ReturnType<typeof setTimeout> | undefined
watch(s, () => {
  clearTimeout(t)
  t = setTimeout(sendDraft, 160)
}, { deep: true })
watch(() => Object.keys(map).length, sendDraft)
function reloadPreview() {
  frame.value?.contentWindow?.location.reload()
}
const onMessage = (ev: MessageEvent) => {
  if (ev.origin === window.location.origin && ev.data?.type === 'mv-preview-ready') sendDraft()
}
let ro: ResizeObserver | null = null
onMounted(() => {
  window.addEventListener('message', onMessage)
  ro = new ResizeObserver(() => {
    if (!pane.value) return
    paneW.value = pane.value.clientWidth
    paneH.value = pane.value.clientHeight
  })
  if (pane.value) ro.observe(pane.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  ro?.disconnect()
})
</script>

<template>
  <div class="hm" :class="`is-${mobileView}`">
    <div class="hm-top">
      <div class="hm-top-title">
        <strong>Page d'accueil</strong>
        <span class="a-hint">{{ saving ? 'Enregistrement…' : dirty ? '● Modifications non enregistrées (visibles dans l’aperçu)' : 'À jour' }}</span>
      </div>
      <div class="a-actions">
        <AdminSeg v-model="mobileView" class="hm-switch" :options="[{ value: 'edit', label: 'Édition' }, { value: 'preview', label: 'Aperçu' }]" />
        <AdminSeg v-model="editLang" :options="[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]" label="Langue" />
        <button type="button" class="a-btn" :disabled="translating" @click="translateAll">
          <LoaderCircle v-if="translating" class="spin" /><Languages v-else />
          <span class="hm-hide-sm">Traduire en anglais</span>
          <span v-if="missingEn" class="a-badge">{{ missingEn }}</span>
        </button>
        <button type="button" class="a-btn is-primary" :disabled="saving || !dirty" title="Ctrl / Cmd + S" @click="save">
          <LoaderCircle v-if="saving" class="spin" /><Save v-else /> Enregistrer
        </button>
      </div>
    </div>

    <div class="hm-layout">
      <!-- ============================================================ editor -->
      <div class="hm-edit">
        <p class="a-hint hm-intro">Les sections apparaissent sur le site dans cet ordre. Glisse ⠿ pour les réordonner, l’interrupteur les masque. L’aperçu à droite se met à jour pendant que tu écris.</p>

        <!-- hero (always first) -->
        <section class="a-panel hm-card" :class="{ 'is-open': open.hero }">
          <header class="hm-card-head" @click="toggle('hero')">
            <span class="hm-handle is-fixed" aria-hidden="true">01</span>
            <div class="hm-card-title"><strong>Haut de page</strong><span class="a-hint">Titre, introduction, image, console</span></div>
            <ChevronDown class="hm-chevron" />
          </header>
          <div v-if="open.hero" class="a-panel-pad a-stack">
            <AdminI18nField v-model="s.hero.kicker" label="Petit texte au-dessus du titre" />
            <AdminI18nField v-model="s.hero.title" label="Grand titre" big />
            <AdminI18nField v-model="s.hero.intro" label="Introduction" multiline rich :rows="3" />
            <AdminMediaField v-model="s.hero.imageId" v-model:effect="s.hero.effect" label="Image principale (vide = visuel généré)" with-effect height="200px" />
            <div class="a-field">
              <span class="a-label">Onglets de la console (vide = pas de console)</span>
              <div v-for="(tb, i) in s.hero.tabs" :key="i" class="hm-item">
                <AdminI18nField v-model="tb.label" compact placeholder="Onglet" />
                <AdminI18nField v-model="tb.line" compact placeholder="Phrase affichée" />
                <div class="hm-item-actions">
                  <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Monter" @click="move(s.hero.tabs, i, -1)"><ArrowUp /></button>
                  <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Descendre" @click="move(s.hero.tabs, i, 1)"><ArrowDown /></button>
                  <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" aria-label="Supprimer" @click="s.hero.tabs.splice(i, 1)"><Trash2 /></button>
                </div>
              </div>
              <button v-if="s.hero.tabs.length < 6" type="button" class="a-btn is-sm" @click="s.hero.tabs.push({ label: e(), line: e() })"><Plus /> Ajouter un onglet</button>
            </div>
          </div>
        </section>

        <!-- sortable sections -->
        <div ref="list" class="hm-list">
          <section
            v-for="(sec, si) in s.home.sections"
            :key="sec.id"
            class="a-panel hm-card"
            :class="{ 'is-open': open[sec.id], 'is-off': !sec.visible }"
          >
            <header class="hm-card-head" @click="toggle(sec.id)">
              <button type="button" class="hm-handle bk-handle" aria-label="Déplacer" title="Glisser pour réordonner" @click.stop><GripVertical /></button>
              <div class="hm-card-title">
                <strong>{{ String(si + 2).padStart(2, '0') }} · {{ META[sec.id].name }}</strong>
                <span class="a-hint">{{ sec.visible ? META[sec.id].hint : 'Masquée sur le site' }}</span>
              </div>
              <AdminSwitch v-model="sec.visible" class="hm-vis" @click.stop>{{ sec.visible ? 'Visible' : 'Masquée' }}</AdminSwitch>
              <ChevronDown class="hm-chevron" />
            </header>

            <div v-if="open[sec.id]" class="a-panel-pad a-stack">
              <!-- work -->
              <template v-if="sec.id === 'work'">
                <AdminI18nField v-model="s.home.work.title" label="Titre de la section" />
                <AdminI18nField v-model="s.home.work.intro" label="Introduction (optionnelle)" multiline rich :rows="2" />
                <AdminSwitch v-model="s.home.work.filters">Afficher les filtres par catégorie</AdminSwitch>
                <p class="a-hint">L’ordre des traces, leur visibilité et la taille de leurs cartes se règlent dans <NuxtLink to="/admin" class="hm-link">Traces</NuxtLink>, les filtres dans <NuxtLink to="/admin/categories" class="hm-link">Catégories</NuxtLink>.</p>
              </template>

              <!-- about -->
              <template v-else-if="sec.id === 'about'">
                <AdminI18nField v-model="s.about.title" label="Titre" />
                <AdminI18nField v-model="s.about.body" label="Texte" multiline rich :rows="6" />
                <AdminMediaField v-model="s.about.imageId" v-model:effect="s.about.effect" label="Portrait" with-effect fit="contain" height="200px" />
                <div class="a-field">
                  <span class="a-label">Infos clés</span>
                  <div v-for="(f, i) in s.about.facts" :key="i" class="hm-item">
                    <AdminI18nField v-model="f.label" compact placeholder="Formation…" />
                    <AdminI18nField v-model="f.value" compact placeholder="BUT MMI…" />
                    <div class="hm-item-actions">
                      <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Monter" @click="move(s.about.facts, i, -1)"><ArrowUp /></button>
                      <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Descendre" @click="move(s.about.facts, i, 1)"><ArrowDown /></button>
                      <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" aria-label="Supprimer" @click="s.about.facts.splice(i, 1)"><Trash2 /></button>
                    </div>
                  </div>
                  <button type="button" class="a-btn is-sm" @click="s.about.facts.push({ label: e(), value: e() })"><Plus /> Ajouter une info</button>
                </div>
              </template>

              <!-- skills -->
              <template v-else-if="sec.id === 'skills'">
                <AdminI18nField v-model="s.skills.title" label="Titre" />
                <div v-for="(g, i) in s.skills.groups" :key="i" class="hm-item hm-group">
                  <AdminI18nField v-model="g.title" compact placeholder="Je maîtrise…" />
                  <AdminTags v-model="g.items" placeholder="HTML, CSS… puis Entrée" />
                  <div class="hm-item-actions">
                    <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Monter" @click="move(s.skills.groups, i, -1)"><ArrowUp /></button>
                    <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Descendre" @click="move(s.skills.groups, i, 1)"><ArrowDown /></button>
                    <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" aria-label="Supprimer" @click="s.skills.groups.splice(i, 1)"><Trash2 /></button>
                  </div>
                </div>
                <button v-if="s.skills.groups.length < 6" type="button" class="a-btn is-sm" @click="s.skills.groups.push({ title: e(), items: [] })"><Plus /> Ajouter une colonne</button>
                <p class="a-hint">Idéalement 3 colonnes, pour suivre la grille du site.</p>
              </template>

              <!-- contact -->
              <template v-else-if="sec.id === 'contact'">
                <AdminI18nField v-model="s.contact.title" label="Titre" />
                <AdminI18nField v-model="s.contact.text" label="Texte" multiline rich :rows="2" />
                <label class="a-field"><span class="a-label">Email (vide = masqué)</span><input v-model="s.contact.email" type="email" class="a-input" placeholder="toi@exemple.com"></label>
                <div class="a-field">
                  <span class="a-label">Réseaux (aussi affichés dans le pied de page)</span>
                  <div v-for="(so, i) in s.socials" :key="i" class="hm-social">
                    <input v-model="so.label" class="a-input" placeholder="LinkedIn">
                    <input v-model="so.url" class="a-input" placeholder="https://…">
                    <div class="hm-item-actions">
                      <button type="button" class="a-btn is-icon is-sm is-ghost" aria-label="Monter" @click="move(s.socials, i, -1)"><ArrowUp /></button>
                      <button type="button" class="a-btn is-icon is-sm is-ghost is-danger" aria-label="Supprimer" @click="s.socials.splice(i, 1)"><Trash2 /></button>
                    </div>
                  </div>
                  <button type="button" class="a-btn is-sm" @click="s.socials.push({ label: '', url: '' })"><Plus /> Ajouter un réseau</button>
                </div>
              </template>
            </div>
          </section>
        </div>
      </div>

      <!-- ============================================================ preview -->
      <aside class="hm-preview">
        <div class="hm-preview-bar">
          <span class="a-label"><Eye /> Aperçu en direct</span>
          <div class="a-seg" role="radiogroup" aria-label="Appareil">
            <button type="button" :class="{ 'is-on': device === 'desktop' }" title="Ordinateur" @click="device = 'desktop'"><Monitor /></button>
            <button type="button" :class="{ 'is-on': device === 'tablet' }" title="Tablette" @click="device = 'tablet'"><Tablet /></button>
            <button type="button" :class="{ 'is-on': device === 'mobile' }" title="Téléphone" @click="device = 'mobile'"><Smartphone /></button>
          </div>
          <button type="button" class="a-btn is-sm is-icon is-ghost" title="Recharger" @click="reloadPreview"><RotateCw /></button>
          <a :href="editLang === 'en' ? '/en' : '/'" target="_blank" class="a-btn is-sm is-icon is-ghost" title="Ouvrir le site (version enregistrée)"><ExternalLink /></a>
        </div>
        <div ref="pane" class="hm-pane">
          <div class="hm-device" :style="{ width: `${WIDTHS[device]}px`, height: `${paneH / scale}px`, transform: `scale(${scale})` }">
            <iframe ref="frame" :src="src" title="Aperçu de la page d'accueil" />
          </div>
        </div>
        <p class="a-hint hm-preview-note"><Pencil /> L’aperçu montre tes modifications avant l’enregistrement ; le site public change quand tu enregistres.</p>
      </aside>
    </div>
  </div>
</template>

<style>
.hm-top {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px clamp(16px, 3vw, 32px);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.hm-top-title { flex: 1; min-width: 180px; display: grid; }
.hm-top-title strong { font-family: var(--font-display); font-weight: 400; font-size: 20px; }
.hm-switch { display: none; }
.hm-layout { display: grid; grid-template-columns: minmax(380px, 1fr) minmax(0, 1.15fr); gap: 20px; align-items: start; padding: 18px clamp(16px, 3vw, 32px) 100px; }
.hm-edit { display: grid; gap: 10px; min-width: 0; }
.hm-intro { margin-bottom: 4px; }
.hm-list { display: grid; gap: 10px; }
.hm-card { overflow: hidden; transition: border-color .2s; }
.hm-card.is-open { border-color: color-mix(in srgb, var(--blue) 40%, transparent); }
.hm-card.is-off .hm-card-title { opacity: .55; }
.hm-card-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px 10px 8px; cursor: pointer; user-select: none; }
.hm-card-head:hover { background: color-mix(in srgb, var(--blue) 4%, #fff); }
.hm-handle.is-fixed { display: grid; place-items: center; width: 26px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
.hm-card-title { flex: 1; display: grid; min-width: 0; }
.hm-card-title strong { font-family: var(--font-display); font-weight: 400; font-size: 18px; letter-spacing: .01em; }
.hm-vis { font-size: 12.5px; }
.hm-chevron { width: 18px; height: 18px; color: var(--muted); transition: transform .3s var(--ease); }
.hm-card.is-open .hm-chevron { transform: rotate(180deg); }
.hm-card .a-panel-pad { border-top: 1px solid var(--line); }
.hm-item { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto; gap: 8px; align-items: start; padding: 8px; border: 1px solid var(--line); border-radius: 3px; background: color-mix(in srgb, var(--blue) 2%, #fff); }
.hm-group { grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) auto; }
.hm-item-actions { display: flex; }
.hm-social { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; }
.hm-link { text-decoration: underline; color: var(--blue); }

.hm-preview { position: sticky; top: 76px; display: grid; gap: 8px; min-width: 0; }
.hm-preview-bar { display: flex; align-items: center; gap: 8px; }
.hm-preview-bar .a-label { flex: 1; display: inline-flex; justify-content: flex-start; gap: 6px; }
.hm-preview-bar .a-label svg { width: 13px; height: 13px; }
.hm-preview-bar .a-seg button svg { width: 14px; height: 14px; }
.hm-pane { position: relative; height: calc(100svh - 160px); overflow: hidden; border: 1px solid var(--line-strong); border-radius: 6px; background: repeating-linear-gradient(45deg, #fff 0 8px, color-mix(in srgb, var(--blue) 4%, #fff) 8px 16px); }
.hm-device { position: absolute; top: 0; left: 50%; transform-origin: top center; margin-left: 0; translate: -50% 0; background: var(--paper); box-shadow: 0 0 0 1px var(--line); }
.hm-device iframe { width: 100%; height: 100%; border: 0; display: block; }
.hm-preview-note { display: flex; align-items: center; gap: 6px; }
.hm-preview-note svg { width: 13px; height: 13px; flex: none; }

@media (max-width: 1100px) {
  .hm-switch { display: inline-flex; }
  .hm-layout { grid-template-columns: 1fr; }
  .hm.is-edit .hm-preview { display: none; }
  .hm.is-preview .hm-edit { display: none; }
  .hm-preview { position: static; }
  .hm-pane { height: calc(100svh - 200px); }
}
@media (max-width: 640px) {
  .hm-hide-sm { display: none; }
  .hm-item, .hm-group { grid-template-columns: 1fr; }
  .hm-layout { grid-template-columns: minmax(0, 1fr); }
}
</style>

<script setup lang="ts">
import { Save, LoaderCircle, House } from 'lucide-vue-next'
import type { Lang, PublicMedia, Settings } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const api = useAdminApi()
const toast = useToast()

const editLang = ref<Lang>('fr')
provide(EDIT_LANG, editLang)
const map = provideMediaMap()

const res = await api<{ settings: Settings; media: Record<string, PublicMedia> }>('/api/admin/settings')
Object.assign(map, res.media)
const s = ref<Settings>(structuredClone(res.settings))

/* Only these keys are saved here; the home page content lives in /admin/home. */
const KEYS = ['name', 'role', 'cvId', 'seo', 'profile'] as const
const pick = (v: Settings) => JSON.stringify(KEYS.map((k) => v[k]))
const saved = ref(pick(res.settings))
const dirty = computed(() => pick(s.value) !== saved.value)
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    const body = Object.fromEntries(KEYS.map((k) => [k, s.value[k]]))
    const out = await api<Settings>('/api/admin/settings', { method: 'PUT', body })
    s.value = structuredClone(out)
    saved.value = pick(out)
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
</script>

<template>
  <div class="a-page st">
    <header class="a-head">
      <div>
        <h1 class="a-title">Réglages</h1>
        <p class="a-sub">Identité, CV et référencement. Le contenu de la page d’accueil se modifie dans <NuxtLink to="/admin/home" class="st-link"><House /> Accueil</NuxtLink>.</p>
      </div>
      <div class="a-actions">
        <AdminSeg v-model="editLang" :options="[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]" label="Langue" />
        <button type="button" class="a-btn is-primary" :disabled="saving || !dirty" @click="save">
          <LoaderCircle v-if="saving" class="spin" /><Save v-else /> Enregistrer
        </button>
      </div>
    </header>

    <div class="st-grid">
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Identité</p></div>
        <div class="a-panel-pad a-stack">
          <label class="a-field"><span class="a-label">Nom</span><input v-model="s.name" class="a-input"></label>
          <AdminI18nField v-model="s.role" label="Métier / rôle" />
          <AdminMediaField v-model="s.cvId" label="CV (PDF)" kind="file" />
        </div>
      </section>
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Profil public (Google &amp; IA)</p></div>
        <div class="a-panel-pad a-stack">
          <p class="a-hint">Invisible sur le site : ces informations alimentent les données lues par Google et les assistants IA (qui tu es, où, ce que tu sais faire). Plus elles sont précises, plus ton profil ressort.</p>
          <div class="a-grid2">
            <label class="a-field"><span class="a-label">Prénom</span><input v-model="s.profile.givenName" class="a-input"></label>
            <label class="a-field"><span class="a-label">Nom</span><input v-model="s.profile.familyName" class="a-input"></label>
          </div>
          <AdminI18nField v-model="s.profile.location" label="Ville / région" placeholder="Troyes, France" />
          <label class="a-field"><span class="a-label">École</span><input v-model="s.profile.school" class="a-input" placeholder="IUT de Troyes"></label>
          <AdminI18nField v-model="s.profile.studies" label="Formation" placeholder="BUT MMI…" />
          <AdminI18nField v-model="s.profile.availability" label="Disponibilité" placeholder="Ouvert aux stages, alternances et projets" />
          <AdminTags v-model="s.profile.expertise" label="Domaines d'expertise (mots-clés)" placeholder="Développement web, IA… puis Entrée" />
        </div>
      </section>
      <section class="a-panel">
        <div class="a-panel-head"><p class="a-panel-title">Référencement</p></div>
        <div class="a-panel-pad a-stack">
          <AdminI18nField v-model="s.seo.description" label="Description pour Google et les partages" multiline :rows="3" />
        </div>
      </section>
    </div>
  </div>
</template>

<style>
.st { max-width: 1100px; }
.st-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; align-items: start; }
.st-link { display: inline-flex; align-items: center; gap: 4px; color: var(--blue); text-decoration: underline; }
.st-link svg { width: 14px; height: 14px; }
</style>

<script setup lang="ts">
import { Languages, Bold, Italic, Link2, LoaderCircle } from 'lucide-vue-next'
import type { Ref } from 'vue'
import type { I18nText, Lang } from '#shared/types'

/** A FR / EN text field. The edited language is shared by the whole page (EDIT_LANG). */
const model = defineModel<I18nText>({ required: true })
const props = withDefaults(defineProps<{
  label?: string
  multiline?: boolean
  rows?: number
  rich?: boolean
  placeholder?: string
  big?: boolean
  compact?: boolean
}>(), { rows: 3 })

const shared = inject<Ref<Lang> | null>(EDIT_LANG, null)
const local = ref<Lang>('fr')
const lang = computed<Lang>({
  get: () => shared?.value ?? local.value,
  set: (v) => (shared ? (shared.value = v) : (local.value = v)),
})
const other = computed<Lang>(() => (lang.value === 'fr' ? 'en' : 'fr'))
const value = computed({
  get: () => model.value?.[lang.value] ?? '',
  set: (v: string) => (model.value = { fr: model.value?.fr ?? '', en: model.value?.en ?? '', [lang.value]: v }),
})
const missing = computed(() => !!model.value?.[other.value]?.trim() && !model.value?.[lang.value]?.trim())

const { translate } = useTranslate()
const busy = ref(false)
async function translateHere() {
  const src = model.value?.[other.value]
  if (!src?.trim()) return
  busy.value = true
  try {
    const [res] = await translate([src], other.value, lang.value)
    if (res) value.value = res
  } finally {
    busy.value = false
  }
}

/* auto-grow + formatting helpers */
const ta = ref<HTMLTextAreaElement | null>(null)
function grow() {
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight + 2}px`
}
watch(value, () => nextTick(grow))
onMounted(() => nextTick(grow))
watch(lang, () => nextTick(grow))

function wrap(before: string, after = before, placeholderText = 'texte') {
  const el = ta.value
  if (!el) return
  const { selectionStart: s, selectionEnd: e } = el
  const sel = value.value.slice(s, e) || placeholderText
  value.value = value.value.slice(0, s) + before + sel + after + value.value.slice(e)
  nextTick(() => {
    el.focus()
    el.setSelectionRange(s + before.length, s + before.length + sel.length)
  })
}
function addLink() {
  const url = window.prompt('Adresse du lien (https://…)')
  if (url) wrap('[', `](${url})`, 'lien')
}
const id = useId()
</script>

<template>
  <div class="a-field i18n" :class="{ 'is-compact': compact }">
    <div v-if="label || !compact" class="a-label">
      <label :for="id">{{ label }}</label>
      <span class="i18n-tools">
        <button v-if="model?.[other]?.trim() && (lang === 'en' || !model?.[lang]?.trim())" type="button" class="i18n-tr" :class="{ 'is-missing': missing }" :title="`Traduire depuis ${other.toUpperCase()}`" :disabled="busy" @click="translateHere">
          <LoaderCircle v-if="busy" class="spin" /><Languages v-else />
          <span>{{ other.toUpperCase() }} → {{ lang.toUpperCase() }}</span>
        </button>
        <span class="a-seg i18n-seg">
          <button v-for="l in (['fr', 'en'] as const)" :key="l" type="button" :class="{ 'is-on': lang === l }" @click="lang = l">
            {{ l.toUpperCase() }}<i v-if="!model?.[l]?.trim()" class="i18n-dot" title="Vide" />
          </button>
        </span>
      </span>
    </div>
    <div v-if="rich && multiline" class="i18n-rich">
      <button type="button" title="Gras" @click="wrap('**')"><Bold /></button>
      <button type="button" title="Italique" @click="wrap('*')"><Italic /></button>
      <button type="button" title="Lien" @click="addLink"><Link2 /></button>
      <span class="a-hint">**gras** · *italique* · ligne vide = paragraphe · « - » = liste</span>
    </div>
    <textarea
      v-if="multiline"
      :id="id"
      ref="ta"
      v-model="value"
      class="a-textarea"
      :rows="rows"
      :placeholder="placeholder || (lang === 'en' ? 'English…' : 'Français…')"
      @input="grow"
    />
    <input
      v-else
      :id="id"
      v-model="value"
      class="a-input"
      :class="{ 'is-big': big }"
      :placeholder="placeholder || (lang === 'en' ? 'English…' : 'Français…')"
    >
  </div>
</template>

<style>
.i18n-tools { display: inline-flex; align-items: center; gap: 6px; }
.i18n-seg button { height: 22px; min-width: 30px; font-size: 10.5px; position: relative; }
.i18n-dot { position: absolute; top: 3px; right: 3px; width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: .5; }
.i18n-tr { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px; border: 1px solid transparent; border-radius: 3px; background: none; color: var(--muted); font-family: var(--font-mono); font-size: 10px; letter-spacing: .04em; }
.i18n-tr:hover { color: var(--blue); border-color: color-mix(in srgb, var(--blue) 30%, transparent); }
.i18n-tr.is-missing { color: var(--blue); background: color-mix(in srgb, var(--blue) 9%, transparent); }
.i18n-tr svg { width: 13px; height: 13px; }
.i18n-rich { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; }
.i18n-rich button { display: grid; place-items: center; width: 26px; height: 24px; border: 0; border-radius: 3px; background: none; color: var(--blue-deep); }
.i18n-rich button:hover { background: color-mix(in srgb, var(--blue) 9%, transparent); }
.i18n-rich svg { width: 14px; height: 14px; }
.i18n-rich .a-hint { margin-left: 6px; font-size: 11px; }
.i18n.is-compact .a-textarea { min-height: 60px; }
</style>

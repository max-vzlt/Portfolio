<script setup lang="ts">
import { X } from 'lucide-vue-next'

const model = defineModel<string[]>({ default: () => [] })
defineProps<{ label?: string; placeholder?: string }>()
const draft = ref('')

function add() {
  const parts = draft.value.split(',').map((s) => s.trim()).filter(Boolean)
  const next = [...model.value]
  for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p)
  model.value = next
  draft.value = ''
}
function remove(i: number) {
  model.value = model.value.filter((_, k) => k !== i)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    add()
  } else if (e.key === 'Backspace' && !draft.value && model.value.length) remove(model.value.length - 1)
}
</script>

<template>
  <div class="a-field">
    <span v-if="label" class="a-label">{{ label }}</span>
    <div class="a-tags a-input" @click="($refs.inp as HTMLInputElement)?.focus()">
      <span v-for="(t, i) in model" :key="t" class="a-chip">{{ t }}<button type="button" :aria-label="`Retirer ${t}`" @click.stop="remove(i)"><X /></button></span>
      <input ref="inp" v-model="draft" :placeholder="model.length ? '' : placeholder || 'Ajouter puis Entrée'" @keydown="onKey" @blur="add">
    </div>
  </div>
</template>

<style>
.a-tags { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; padding: 6px; cursor: text; }
.a-tags input { flex: 1; min-width: 80px; border: 0; outline: none; background: none; padding: 3px 4px; font-size: 14px; }
.a-tags .a-chip button { display: grid; place-items: center; border: 0; background: none; padding: 0; margin-right: -2px; color: inherit; opacity: .6; }
.a-tags .a-chip button:hover { opacity: 1; }
</style>

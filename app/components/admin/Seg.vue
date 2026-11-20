<script setup lang="ts" generic="T extends string | number">
const model = defineModel<T>({ required: true })
defineProps<{ options: { value: T; label: string; title?: string }[]; label?: string }>()
</script>

<template>
  <div class="a-seg-wrap">
    <span v-if="label" class="a-label">{{ label }}</span>
    <div class="a-seg" role="radiogroup" :aria-label="label">
      <button
        v-for="o in options"
        :key="String(o.value)"
        type="button"
        role="radio"
        :aria-checked="model === o.value"
        :class="{ 'is-on': model === o.value }"
        :title="o.title"
        @click="model = o.value"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>

<style>
.a-seg-wrap { display: inline-flex; align-items: center; gap: 8px; }
.a-seg-wrap > .a-label { white-space: nowrap; }
</style>

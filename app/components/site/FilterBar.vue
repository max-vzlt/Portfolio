<script setup lang="ts">
import type { Category } from '#shared/types'

const props = defineProps<{ categories: (Category & { count: number })[]; total: number; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const { tr, t } = useI18n()
const select = (slug: string) => emit('update:modelValue', props.modelValue === slug ? '' : slug)
</script>

<template>
  <div class="filters" role="group" :aria-label="t('work.filter')">
    <button type="button" class="chip" :class="{ 'is-active': !modelValue }" :aria-pressed="!modelValue" @click="emit('update:modelValue', '')">
      {{ t('work.all') }} <sup>{{ total }}</sup>
    </button>
    <button
      v-for="c in categories"
      :key="c.id"
      type="button"
      class="chip"
      :class="{ 'is-active': modelValue === c.slug }"
      :aria-pressed="modelValue === c.slug"
      @click="select(c.slug)"
    >
      {{ tr(c.name) }} <sup>{{ c.count }}</sup>
    </button>
  </div>
</template>

<style>
.filters { display: flex; flex-wrap: wrap; gap: 8px; }
</style>

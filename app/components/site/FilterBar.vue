<script setup lang="ts">
import type { Category } from '#shared/types'

const props = defineProps<{ categories: (Category & { count: number })[]; total: number; modelValue: string; featured?: number }>()
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
      v-if="featured"
      type="button"
      class="chip chip-top"
      :class="{ 'is-active': modelValue === 'top' }"
      :aria-pressed="modelValue === 'top'"
      @click="select('top')"
    >
      <SitePixelGlyph name="star" /> {{ t('work.top') }} <sup>{{ featured }}</sup>
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
.chip-top .pixel-glyph { width: 9px; height: 9px; margin: 0; }
</style>

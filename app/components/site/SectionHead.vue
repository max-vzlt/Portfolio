<script setup lang="ts">
defineProps<{ index?: string; title: string; glyph?: 'eye' | 'star' | 'grid' | 'spark' | 'mail'; tag?: string }>()
</script>

<template>
  <header class="section-head">
    <div class="section-head-main" v-reveal>
      <p v-if="index" class="label section-index">({{ index }})</p>
      <component :is="tag || 'h2'" class="display-l">{{ title }}<SitePixelGlyph v-if="glyph" :name="glyph" /></component>
    </div>
    <div v-if="$slots.default" class="section-head-aside" v-reveal="120">
      <slot />
    </div>
  </header>
</template>

<style>
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px 40px;
  flex-wrap: wrap;
  margin-bottom: clamp(36px, 5vw, 64px);
}
.section-index { margin-bottom: 14px; color: var(--muted); }
.section-head-aside { padding-bottom: 8px; }
</style>

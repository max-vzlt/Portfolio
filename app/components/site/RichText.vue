<script setup lang="ts">
const props = defineProps<{ text?: string | null; tag?: string }>()
const html = computed(() => renderRich(props.text))
</script>

<template>
  <component :is="tag || 'div'" class="rich" v-html="html" />
</template>

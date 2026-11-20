<script setup lang="ts">
const model = defineModel<boolean>({ default: false })
defineProps<{ label?: string }>()
</script>

<template>
  <label class="a-switch">
    <input v-model="model" type="checkbox">
    <span class="a-switch-track" aria-hidden="true" />
    <span v-if="label || $slots.default"><slot>{{ label }}</slot></span>
  </label>
</template>

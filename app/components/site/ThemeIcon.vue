<script setup lang="ts">
/* Half-filled disc: the filled half turns over when the theme changes. */
const theme = useTheme()
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ 'is-dark': theme.current.value === 'dark' }">
    <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.5" />
    <path class="theme-ico-half" d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" />
  </svg>
</template>

<style>
.theme-ico-half { transform-origin: 12px 12px; }
.theme-ready .theme-ico-half { transition: transform 0.7s cubic-bezier(0.65, 0, 0.35, 1); }
.is-dark > .theme-ico-half { transform: rotate(180deg); }
</style>

<script setup lang="ts">
const { lang } = useI18n()
useHead({ htmlAttrs: { lang } })
</script>

<template>
  <div class="site">
    <a href="#main" class="sr-only">Contenu</a>
    <SiteHeader />
    <main id="main">
      <slot />
    </main>
    <SiteFooter />
    <SiteLightbox />
    <SiteCurtain />
    <SiteScrollbar />
  </div>
</template>

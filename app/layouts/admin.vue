<script setup lang="ts">
import { LayoutGrid, Tags, Images, Settings, ExternalLink, LogOut, CircleAlert, Check } from 'lucide-vue-next'
import '~/assets/css/admin.css'

const { toasts } = useToast()
const route = useRoute()
const bare = computed(() => route.path === '/admin/login')

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  await navigateTo('/admin/login')
}
useHead({ title: 'Back-office — Portfolio', meta: [{ name: 'robots', content: 'noindex, nofollow' }], htmlAttrs: { lang: 'fr' } })
</script>

<template>
  <div class="admin">
    <slot v-if="bare" />
    <div v-else class="a-shell">
      <aside class="a-side">
        <NuxtLink to="/admin" class="a-brand">
          <img src="/favicon.svg" alt="">
          <span>Portfolio<small>Back-office</small></span>
        </NuxtLink>
        <nav class="a-nav">
          <NuxtLink to="/admin" :class="{ 'router-link-active': route.path === '/admin' || route.path.startsWith('/admin/projects') }"><LayoutGrid /> <span>Traces</span></NuxtLink>
          <NuxtLink to="/admin/categories"><Tags /> <span>Catégories</span></NuxtLink>
          <NuxtLink to="/admin/media"><Images /> <span>Médiathèque</span></NuxtLink>
          <NuxtLink to="/admin/settings"><Settings /> <span>Réglages</span></NuxtLink>
        </nav>
        <div class="a-side-foot">
          <a href="/" target="_blank"><ExternalLink /> <span>Voir le site</span></a>
          <button type="button" @click="logout"><LogOut /> <span>Déconnexion</span></button>
        </div>
      </aside>
      <main class="a-main">
        <slot />
      </main>
    </div>
    <TransitionGroup tag="div" name="toast" class="a-toasts" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" class="a-toast" :class="{ 'is-error': t.error }">
        <CircleAlert v-if="t.error" /><Check v-else /> <span>{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

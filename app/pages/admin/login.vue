<script setup lang="ts">
import { LogIn, LoaderCircle } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })
const route = useRoute()
const password = ref('')
const error = ref('')
const busy = ref(false)
const me = await $fetch<{ admin: boolean; defaultPassword: boolean }>('/api/auth/me').catch(() => ({ admin: false, defaultPassword: false }))
if (me.admin) await navigateTo(String(route.query.next || '/admin'))

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
    await navigateTo(String(route.query.next || '/admin'))
  } catch (err: any) {
    error.value = errorMessage(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login tone-blue">
    <div class="hero-frame" aria-hidden="true" />
    <div class="login-art" aria-hidden="true"><DotImage seed="globe-login" /></div>
    <form class="login-card" @submit.prevent="submit">
      <img src="/favicon.svg" alt="" width="56" height="56">
      <h1 class="a-title">Back-office</h1>
      <p class="a-sub">Connecte-toi pour gérer les traces de ton portfolio.</p>
      <label class="a-field">
        <span class="a-label">Mot de passe</span>
        <input v-model="password" type="password" class="a-input" autocomplete="current-password" autofocus required>
      </label>
      <p v-if="me.defaultPassword" class="a-hint">Mode développement : le mot de passe par défaut est <code>admin</code> (définis NUXT_ADMIN_PASSWORD dans .env).</p>
      <p v-if="error" class="login-error">{{ error }}</p>
      <button type="submit" class="a-btn is-primary" :disabled="busy">
        <LoaderCircle v-if="busy" class="spin" /><LogIn v-else /> Se connecter
      </button>
      <a href="/" class="a-hint">← Retour au site</a>
    </form>
  </div>
</template>

<style>
.login { position: relative; min-height: 100svh; display: grid; place-items: center; padding: 20px; overflow: hidden; }
.login-art { position: absolute; inset: 0; opacity: .5; }
.login-card { position: relative; z-index: 2; width: min(400px, 100%); display: grid; gap: 14px; padding: 28px; background: var(--paper); color: var(--blue-deep); border-radius: 6px; box-shadow: 0 30px 80px -30px rgba(9, 11, 208, .9); --muted: color-mix(in srgb, var(--blue-deep) 62%, var(--paper)); --line: color-mix(in srgb, var(--blue) 20%, transparent); }
.login-card code { font-family: var(--font-mono); background: color-mix(in srgb, var(--blue) 10%, transparent); padding: 1px 4px; border-radius: 2px; }
.login-error { padding: 8px 10px; border: 1px solid var(--blue-deep); border-radius: 3px; font-size: 13px; }
</style>

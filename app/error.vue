<script setup lang="ts">
import type { NuxtError } from '#app'
import { ArrowLeft } from 'lucide-vue-next'

const props = defineProps<{ error: NuxtError }>()
const route = useRoute()
const en = computed(() => route.path.startsWith('/en'))
const is404 = computed(() => props.error?.statusCode === 404)
useHead({ title: () => `${props.error?.statusCode || 'Erreur'} — Maxime Verzeletti` })
</script>

<template>
  <div class="err tone-blue">
    <div class="hero-frame" aria-hidden="true" />
    <div class="err-media" aria-hidden="true">
      <DotImage seed="dunes-404" :parallax="0" />
    </div>
    <div class="wrap err-inner">
      <p class="label">Erreur {{ error?.statusCode }}</p>
      <h1 class="display-xl">{{ is404 ? (en ? 'Page not found' : 'Page introuvable') : (en ? 'Something went wrong' : 'Une erreur est survenue') }}</h1>
      <a :href="en ? '/en' : '/'" class="btn btn-solid" @click.prevent="clearError({ redirect: en ? '/en' : '/' })">
        <ArrowLeft /> {{ en ? 'Back to home' : "Retour à l'accueil" }}
      </a>
    </div>
  </div>
</template>

<style>
.err { position: relative; min-height: 100svh; display: grid; align-items: end; overflow: hidden; }
.err-media { position: absolute; inset: 0; opacity: 0.55; }
.err-inner { position: relative; display: grid; gap: 24px; justify-items: start; padding-block: 18vh; }
</style>

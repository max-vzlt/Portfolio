<script setup lang="ts">
import { Copy, Check } from 'lucide-vue-next'

/* Contact row that copies the email address, with some juice:
   blue fill sweeping the row, letters bouncing, a burst of round pixels, a bubble. */
const props = defineProps<{ email: string; label?: string }>()
const { t } = useI18n()
const state = ref<'idle' | 'in' | 'out'>('idle')
const msg = ref('')
const bursts = ref<{ id: number; dots: { dx: number; dy: number; s: number; d: number }[] }[]>([])
const addr = ref<HTMLElement | null>(null)
let n = 0
let t1: ReturnType<typeof setTimeout> | undefined
let t2: ReturnType<typeof setTimeout> | undefined

function selectAddress() {
  if (!addr.value) return
  const range = document.createRange()
  range.selectNodeContents(addr.value)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}
async function copy() {
  let ok = true
  try {
    await navigator.clipboard.writeText(props.email)
  } catch {
    ok = false
    selectAddress()
  }
  msg.value = ok ? t('contact.copied') : t('contact.copySelect')
  state.value = 'idle'
  await nextTick()
  state.value = 'in'
  const id = ++n
  bursts.value.push({
    id,
    dots: Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.35
      const r = 30 + Math.random() * 46
      return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, s: 0.45 + Math.random() * 0.9, d: Math.random() * 90 }
    }),
  })
  setTimeout(() => (bursts.value = bursts.value.filter((b) => b.id !== id)), 1100)
  clearTimeout(t1)
  clearTimeout(t2)
  t1 = setTimeout(() => (state.value = 'out'), 1150)
  t2 = setTimeout(() => (state.value = 'idle'), 1700)
}
onBeforeUnmount(() => {
  clearTimeout(t1)
  clearTimeout(t2)
})
</script>

<template>
  <button type="button" class="contact-row copy-row" :class="`is-${state}`" :title="t('contact.copy')" @click="copy">
    <!-- plain text in the HTML (readable by any tool); split into letters only while the copy animation plays -->
    <span ref="addr" class="label muted contact-host copy-addr"><template v-if="state === 'in'"><span v-for="(ch, i) in email" :key="i" class="copy-ch" :style="{ '--i': i }">{{ ch }}</span></template><template v-else>{{ email }}</template></span>
    <span class="display-m contact-name">{{ label || 'Email' }}</span>
    <span class="copy-ico" aria-hidden="true">
      <Check v-if="state !== 'idle'" class="copy-check" />
      <Copy v-else />
      <span v-for="b in bursts" :key="b.id" class="copy-burst">
        <i v-for="(d, k) in b.dots" :key="k" :style="{ '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--s': d.s, '--d': `${d.d}ms` }" />
      </span>
      <span v-if="state === 'in'" class="copy-bubble">{{ msg }}</span>
    </span>
    <span class="sr-only" aria-live="polite">{{ state === 'in' ? msg : '' }}</span>
  </button>
</template>

<style>
.copy-row {
  position: relative;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--line-strong);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: copy;
  isolation: isolate;
  transition: padding 0.45s var(--ease), color 0.25s var(--ease);
}
.copy-row::before {
  content: '';
  position: absolute;
  inset: 0 -14px;
  z-index: -1;
  background: var(--blue);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.45s cubic-bezier(0.7, 0, 0.2, 1);
}
.copy-row.is-in::before { transform: scaleX(1); }
.copy-row.is-out::before { transform: scaleX(0); transform-origin: right; }
/* stronger than .contact-row:hover so the text stays readable on the blue fill */
.contact-row.copy-row.is-in, .contact-row.copy-row.is-in:hover { color: var(--paper); }
.contact-row.copy-row.is-in .muted { color: color-mix(in srgb, var(--paper) 80%, transparent); }
.copy-ch { display: inline-block; white-space: pre; }
.copy-row.is-in .copy-ch { animation: chWave 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) both; animation-delay: calc(var(--i) * 16ms + 120ms); }
@keyframes chWave { 40% { transform: translateY(-7px); } }
.copy-ico { position: relative; display: grid; place-items: center; width: 26px; height: 26px; }
.copy-ico svg { width: 24px; height: 24px; stroke-width: 1.3; }
.copy-check { animation: copyPop 0.55s cubic-bezier(0.3, 1.8, 0.5, 1) both; }
@keyframes copyPop { from { transform: scale(0.2) rotate(-25deg); opacity: 0; } }
.copy-burst { position: absolute; left: 50%; top: 50%; pointer-events: none; }
.copy-burst i {
  position: absolute;
  width: 7px;
  height: 7px;
  margin: -3.5px;
  border-radius: 50%;
  background: var(--paper);
  box-shadow: 0 0 0 1.5px var(--blue);
  animation: copyBurst 0.85s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--d);
}
@keyframes copyBurst {
  0% { transform: translate(0, 0) scale(0); }
  30% { transform: translate(calc(var(--dx) * 0.6), calc(var(--dy) * 0.6)) scale(var(--s)); }
  100% { transform: translate(var(--dx), var(--dy)) scale(0); }
}
.copy-bubble {
  position: absolute;
  right: -6px;
  bottom: calc(100% + 12px);
  padding: 6px 10px 5px;
  background: var(--paper);
  color: var(--blue);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  box-shadow: 0 10px 24px -12px rgba(9, 11, 208, 0.9);
  animation: copyBubble 1.15s cubic-bezier(0.3, 1.6, 0.5, 1) both;
}
@keyframes copyBubble {
  0% { transform: translateY(10px) scale(0.5); opacity: 0; }
  25% { transform: translateY(-4px) scale(1.06); opacity: 1; }
  40% { transform: none; }
  85% { opacity: 1; }
  100% { transform: translateY(-6px); opacity: 0; }
}
</style>

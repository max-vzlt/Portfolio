<script setup lang="ts">
/** Drop files on the slot, or click it to browse. */
const props = withDefaults(defineProps<{ accept?: string; multiple?: boolean; clickable?: boolean; disabled?: boolean; tag?: string }>(), {
  accept: 'image/*,video/*',
  multiple: true,
  clickable: true,
  tag: 'div',
})
const emit = defineEmits<{ files: [File[]] }>()
const over = ref(false)
const input = ref<HTMLInputElement | null>(null)
let depth = 0

const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')
function enter(e: DragEvent) {
  if (props.disabled || !hasFiles(e)) return
  depth++
  over.value = true
}
function leave(e: DragEvent) {
  if (!hasFiles(e)) return
  depth = Math.max(0, depth - 1)
  if (!depth) over.value = false
}
function drop(e: DragEvent) {
  depth = 0
  over.value = false
  if (props.disabled || !e.dataTransfer?.files?.length) return
  const files = Array.from(e.dataTransfer.files)
  emit('files', props.multiple ? files : files.slice(0, 1))
}
function pick() {
  if (props.clickable && !props.disabled) input.value?.click()
}
function picked(e: Event) {
  const el = e.target as HTMLInputElement
  if (el.files?.length) emit('files', Array.from(el.files))
  el.value = ''
}
// a drop handled by a nested dropzone never reaches us: reset on any drop
const reset = () => {
  depth = 0
  over.value = false
}
onMounted(() => {
  window.addEventListener('drop', reset, true)
  window.addEventListener('dragend', reset, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('drop', reset, true)
  window.removeEventListener('dragend', reset, true)
})
defineExpose({ pick })
</script>

<template>
  <component
    :is="tag"
    :class="{ 'is-over': over }"
    @dragenter.prevent="enter"
    @dragover.prevent
    @dragleave="leave"
    @drop.prevent.stop="drop"
    @click="pick"
  >
    <slot :over="over" :pick="pick" />
    <input ref="input" type="file" :accept="accept" :multiple="multiple" hidden @change="picked" @click.stop>
  </component>
</template>

<script setup lang="ts">
/* Small decorative "round pixel" glyph next to section titles. */
const props = withDefaults(defineProps<{ name?: 'eye' | 'star' | 'grid' | 'spark' | 'mail' }>(), { name: 'star' })
const MAPS: Record<string, string[]> = {
  eye: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
  star: ['...#...', '...#...', '.#.#.#.', '#######', '.#.#.#.', '...#...', '...#...'],
  grid: ['##.##.#', '##.##.#', '.......', '##.##.#', '##.##.#', '.......', '##.##.#'],
  spark: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  mail: ['#######', '##...##', '#.#.#.#', '#..#..#', '#.....#', '#.....#', '#######'],
}
const dots = computed(() => {
  const out: { x: number; y: number }[] = []
  ;(MAPS[props.name] || MAPS.star!).forEach((row, y) => [...row].forEach((c, x) => c === '#' && out.push({ x, y })))
  return out
})
</script>

<template>
  <svg class="pixel-glyph" viewBox="0 0 7 7" aria-hidden="true">
    <circle v-for="(d, i) in dots" :key="i" :cx="d.x + 0.5" :cy="d.y + 0.5" r="0.42" />
  </svg>
</template>

<style>
.pixel-glyph { width: 0.28em; height: 0.28em; fill: currentColor; display: inline-block; vertical-align: top; margin-left: 0.12em; margin-top: 0.08em; }
</style>

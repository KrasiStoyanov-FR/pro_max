<template>
  <svg
    class="h-3 w-3 transition"
    :class="active ? 'text-white' : 'text-neutral-500'"
    viewBox="0 0 12 12"
    role="presentation"
    aria-hidden="true"
  >
    <path
      d="M3 8l3 3 3-3m0-4L6 1 3 4"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :transform="direction === 'asc' ? 'scale(1,1)' : 'scale(1,-1) translate(0,-12)'"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean
  direction: 'asc' | 'desc'
}>()
</script>



<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
    :class="statusClasses"
  >
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DetectionStatus } from '@/types/detections'

const props = defineProps<{
  status: DetectionStatus
}>()

const statusClasses = computed(() => {
  switch (props.status) {
    case 'Alarm':
      return 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
    case 'Track':
      return 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
    case 'Detect':
      return 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
    case 'Whitelisted':
      return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
    default:
      return 'bg-neutral-600 text-white'
  }
})
</script>



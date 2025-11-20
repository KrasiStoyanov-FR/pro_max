<template>
  <div class="flex items-center gap-2">
    <span
      class="inline-flex h-2.5 w-2.5 rounded-full"
      :class="riskColor"
      aria-hidden="true"
    />
    <span class="text-xs font-semibold uppercase tracking-wide text-neutral-200">
      {{ riskLevelLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DetectionRiskLevel } from '@/types/detections'

const props = defineProps<{
  riskLevel: DetectionRiskLevel
}>()

const riskColor = computed(() => {
  switch (props.riskLevel) {
    case 'high':
      return 'bg-rose-500 shadow shadow-rose-500/40'
    case 'medium':
      return 'bg-amber-400 shadow shadow-amber-400/40'
    default:
      return 'bg-emerald-400 shadow shadow-emerald-400/40'
  }
})

const riskLevelLabel = computed(() => props.riskLevel.toUpperCase())
</script>



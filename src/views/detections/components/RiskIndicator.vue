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
      return 'bg-red-500 shadow shadow-red-500/40'
    case 'medium':
      return 'bg-yellow-500 shadow shadow-yellow-500/40'
    default:
      return 'bg-blue-500 shadow shadow-blue-500/40'
  }
})

const riskLevelLabel = computed(() => props.riskLevel.toUpperCase())
</script>



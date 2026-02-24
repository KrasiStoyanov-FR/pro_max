<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="!isFullscreenMode"
      ref="widgetRef"
      class="p-4 z-10 rounded-2xl bg-neutral-900/40 backdrop-blur-3xl border border-white/10"
      role="region"
      aria-label="System Status"
    >
      <div class="flex flex-row gap-6">
        <!-- TODO: There's no need for handleDetectionsClick() method anymore -->
        <div class="w-full flex items-center space-x-3 transition-colors" :aria-label="`${rfDetections} RF detections`">
          <div class="w-4.5 h-4.5 bg-yellow-500 border border-white rounded-full flex-shrink-0"></div>
          <span class="space-x-2 text-white text-xs flex-1 text-left">
            <span class="whitespace-nowrap">RF {{ rfDetections === 1 ? 'Detection' : 'Detections' }}:</span>
            <span>{{ rfDetections }}</span>
          </span>
          <!-- <span v-if="isLoading" class="text-xs text-neutral-400 animate-pulse">⟳</span> -->
        </div>

        <!-- TODO: There's no need for handleDatabaseClick() method anymore -->
        <div
          class="w-full flex items-center space-x-3 transition-colors"
          :aria-label="`Database status: ${databaseStatusText}`"
        >
          <span class="flex gap-2 text-white text-xs flex-1 text-left">Database: <span v-html="databaseStatusIndicator"></span></span>
          <span v-if="isStale" class="text-xs text-neutral-400" aria-label="Data may be stale">⚠</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="mt-3 pt-3 border-t border-neutral-700/50">
        <div class="flex items-center space-x-2 text-xs text-red-400">
          <span>⚠</span>
          <span>{{ error }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStatus } from '@/composables/useSystemStatus'
import { useMapStore } from '@/store/map'
import Tooltip from '@/components/shared/Tooltip.vue'
import type { DatabaseStatus } from '@/types/system'

// Props
interface Props {
  isFullscreenMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFullscreenMode: false
})

// Emits
const emit = defineEmits<{
  openDronesPanel: []
  openDetectionsPanel: []
  openDatabaseStatus: []
}>()

// System status hook (for database status)
const {
  status,
  isLoading,
  error,
  isStale,
  databaseStatus
} = useSystemStatus()

// Map store (for counts based on time window only)
const mapStore = useMapStore()
const { pins, timeWindowMs } = storeToRefs(mapStore)

// Helper to check if a timestamp is within the active time window
const isWithinTimeWindow = (timestamp: string | null | undefined): boolean => {
  if (!timestamp) return false
  
  const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  
  // Get time window (same logic as useMapPins)
  const userWindow = timeWindowMs.value
  let windowMs: number
  
  if (userWindow !== null && userWindow > 0) {
    windowMs = userWindow
  } else if (isTestMode) {
    windowMs = ONE_YEAR_MS
  } else {
    const envValue = import.meta.env.VITE_ACTIVE_POSITION_WINDOW_MS
    windowMs = envValue ? parseInt(envValue, 10) : 15 * 60 * 1000
  }
  
  const timestampMs = new Date(timestamp).getTime()
  const now = Date.now()
  return timestampMs > 0 && (now - timestampMs) <= windowMs
}

// Count active drones (filtered by time window only, independent of visibility filters)
const activeDrones = computed(() => {
  return pins.value.filter(pin => {
    // Must be a drone type
    if (pin.type !== 'drone') return false
    
    // Must be within time window (ignore visibility filters)
    return isWithinTimeWindow(pin.timestamp)
  }).length
})

// Count RF detections (filtered by time window only, independent of visibility filters)
const rfDetections = computed(() => {
  // Get detection window (same logic as useMapPins)
  const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  
  const userWindow = timeWindowMs.value
  let windowMs: number
  
  if (userWindow !== null && userWindow > 0) {
    windowMs = userWindow
  } else if (isTestMode) {
    windowMs = ONE_YEAR_MS
  } else {
    const envValue = import.meta.env.VITE_DETECTION_WINDOW_MS
    windowMs = envValue ? parseInt(envValue, 10) : 60 * 60 * 1000
  }
  
  const cutoffTime = Date.now() - windowMs
  
  // RF detections are now attached to sensor pins, not separate target pins
  // Count detections from sensor pins that are within the time window
  // (ignore visibility filters - only filter by time window)
  let totalDetections = 0
  
  pins.value.forEach(pin => {
    // Only count from sensor pins
    if (pin.type !== 'sensor') return
    
    // Get detections from sensor pin data (regardless of visibility)
    const detections = Array.isArray(pin.data?.detections) ? pin.data.detections : []
    
    // Count detections within time window
    detections.forEach((detection: any) => {
      const timestampMs = detection.timestamp ? new Date(detection.timestamp).getTime() : 0
      if (timestampMs > 0 && timestampMs >= cutoffTime) {
        totalDetections++
      }
    })
  })
  
  return totalDetections
})


const widgetRef = ref<HTMLElement | null>(null)

// Computed values
const databaseStatusText = computed(() => {
  switch (databaseStatus.value) {
    case 'ok':
      return 'Database Connected'
    case 'degraded':
      return 'Database Degraded'
    case 'down':
      return 'Database Disconnected'
    default:
      return 'Database Unknown'
  }
})

const databaseStatusIndicator = computed(() => {
  switch (databaseStatus.value) {
    case 'ok':
      return '<span class="text-green-500">Connected</span>'
    case 'degraded':
      return '<span class="text-yellow-500">Degraded</span>'
    case 'down':
      return '<span class="text-red-500">Disconnected</span>'
    default:
      return '<span class="text-neutral-500">Unknown</span>'
  }
})

const databaseTooltip = computed(() => {
  const statusData = status.value?.database
  if (!statusData) {
    return 'Database status unknown'
  }

  const parts: string[] = []
  parts.push(`Status: ${databaseStatusText.value}`)
  
  if (statusData.message) {
    parts.push(`Details: ${statusData.message}`)
  }
  
  if (statusData.responseTime !== undefined) {
    parts.push(`Response time: ${statusData.responseTime}ms`)
  }
  
  if (statusData.lastCheck) {
    const lastCheck = new Date(statusData.lastCheck)
    const timeAgo = Math.round((Date.now() - lastCheck.getTime()) / 1000)
    parts.push(`Last check: ${timeAgo}s ago`)
  }

  return parts.join('<br>')
})

// Click handlers
const handleDatabaseClick = () => {
  emit('openDatabaseStatus')
  // TODO: Open database status panel/modal
}

const handleDronesClick = () => {
  emit('openDronesPanel')
  // TODO: Open drones list panel
}

const handleDetectionsClick = () => {
  emit('openDetectionsPanel')
  // TODO: Open RF detections list panel
}

// Focus management for keyboard navigation
onMounted(() => {
  // Widget is focusable by default via tabindex="0"
  // Additional keyboard handling can be added here if needed
})
</script>

<style scoped>
/* Ensure smooth transitions without layout shift */
.transition-all {
  will-change: transform, opacity;
}
</style>

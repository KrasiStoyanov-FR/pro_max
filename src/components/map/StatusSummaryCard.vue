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
      tabindex="0"
      class="w-64 p-4 absolute top-4 lg:top-6 right-4 lg:right-6 z-20 rounded-2xl bg-neutral-900/40 backdrop-blur-3xl shadow-md border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
      role="region"
      aria-label="System Status"
    >
      <div class="flex flex-col space-y-3">
        <!-- Database Status -->
        <Tooltip
          :content="databaseTooltip"
          position="left"
        >
          <button
            @click="handleDatabaseClick"
            class="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            :aria-label="`Database status: ${databaseStatusText}`"
          >
            <div
              class="w-3 h-3 rounded-full flex-shrink-0"
              :class="{
                'bg-green-500': databaseStatus === 'ok',
                'bg-yellow-500 animate-pulse': databaseStatus === 'degraded',
                'bg-red-500 animate-pulse': databaseStatus === 'down'
              }"
              :aria-label="`Database is ${databaseStatusText}`"
            ></div>
            <span class="text-white text-sm flex-1 text-left">{{ databaseStatusText }}</span>
            <span v-if="isStale" class="text-xs text-neutral-400" aria-label="Data may be stale">⚠</span>
          </button>
        </Tooltip>

        <!-- Active Drones -->
        <Tooltip
          :content="`Active drones currently tracked: ${activeDrones}`"
          position="left"
        >
          <button
            @click="handleDronesClick"
            class="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            :aria-label="`${activeDrones} active drones`"
            :disabled="isLoading"
          >
            <div class="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
            <span class="text-white text-sm flex-1 text-left">
              {{ activeDrones }} Active {{ activeDrones === 1 ? 'Drone' : 'Drones' }}
            </span>
            <span v-if="isLoading" class="text-xs text-neutral-400 animate-pulse">⟳</span>
          </button>
        </Tooltip>

        <!-- RF Detections -->
        <Tooltip
          :content="`RF detections in the last hour: ${rfDetections}`"
          position="left"
        >
          <button
            @click="handleDetectionsClick"
            class="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            :aria-label="`${rfDetections} RF detections`"
            :disabled="isLoading"
          >
            <div class="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>
            <span class="text-white text-sm flex-1 text-left">
              {{ rfDetections }} RF {{ rfDetections === 1 ? 'Detection' : 'Detections' }}
            </span>
            <span v-if="isLoading" class="text-xs text-neutral-400 animate-pulse">⟳</span>
          </button>
        </Tooltip>

        <!-- Operators Online -->
        <Tooltip
          :content="`Operators currently online: ${operatorsOnline}`"
          position="left"
        >
          <button
            @click="handleOperatorsClick"
            class="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            :aria-label="`${operatorsOnline} operators online`"
            :disabled="isLoading"
          >
            <div class="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
            <span class="text-white text-sm flex-1 text-left">
              {{ operatorsOnline }} {{ operatorsOnline === 1 ? 'Operator' : 'Operators' }} Online
            </span>
            <span v-if="isLoading" class="text-xs text-neutral-400 animate-pulse">⟳</span>
          </button>
        </Tooltip>
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
  openOperatorsPanel: []
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

// Map store (for filtered counts)
const mapStore = useMapStore()
const { pins, visibleMarkerTypes, timeWindowMs } = storeToRefs(mapStore)

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

// Count visible drones (filtered by type and time window)
const activeDrones = computed(() => {
  return pins.value.filter(pin => {
    // Must be a drone type
    if (pin.type !== 'drone') return false
    
    // Must be visible according to type filter
    if (!visibleMarkerTypes.value.has('drone')) return false
    
    // Must be within time window
    return isWithinTimeWindow(pin.timestamp)
  }).length
})

// Count visible RF detections (filtered by type and time window)
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
  let totalDetections = 0
  
  pins.value.forEach(pin => {
    // Only count from sensor pins
    if (pin.type !== 'sensor') return
    
    // Must be visible according to type filter
    if (!visibleMarkerTypes.value.has('sensor')) return
    
    // Get detections from sensor pin data
    const detections = Array.isArray(pin.data?.detections) ? pin.data.detections : []
    
    // Count detections within time window
    detections.forEach((detection: any) => {
      const timestampMs = detection.timestamp ? new Date(detection.timestamp).getTime() : 0
      if (timestampMs > 0 && timestampMs >= cutoffTime) {
        totalDetections++
      }
    })
  })
  
  // Debug logging
  console.log(`[StatusSummaryCard] RF Detections count:`, {
    totalDetections,
    filterEnabled: visibleMarkerTypes.value.has('sensor'),
    timeWindowMinutes: Math.round(windowMs / 1000 / 60),
    cutoffTime: new Date(cutoffTime).toISOString()
  })
  
  return totalDetections
})

// Count visible operators (filtered by type and time window)
const operatorsOnline = computed(() => {
  // Operators use 5 minute window (from api.ts)
  const OPERATOR_WINDOW_MS = 5 * 60 * 1000
  const cutoffTime = Date.now() - OPERATOR_WINDOW_MS
  
  return pins.value.filter(pin => {
    // Must be a friendly (operator) type
    if (pin.type !== 'friendly') return false
    
    // Must be visible according to type filter
    if (!visibleMarkerTypes.value.has('friendly')) return false
    
    // Must be within time window
    const timestampMs = pin.timestamp ? new Date(pin.timestamp).getTime() : 0
    return timestampMs > 0 && timestampMs >= cutoffTime
  }).length
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

const handleOperatorsClick = () => {
  emit('openOperatorsPanel')
  // TODO: Open operators list panel
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

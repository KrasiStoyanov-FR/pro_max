<template>
  <div class="absolute top-4 left-4 z-20 bg-neutral-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-700/50 p-3 max-w-56">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-white">Map Filters</h3>
      <button
        @click="toggleAll"
        class="text-xs text-neutral-400 hover:text-white transition-colors"
        title="Toggle all filters"
      >
        {{ allVisible ? 'Hide All' : 'Show All' }}
      </button>
    </div>
    
    <!-- Time Window Filter -->
    <div class="mb-3 pb-3 border-b border-neutral-700/50">
      <label class="block text-xs text-neutral-400 mb-1.5">Time Window</label>
      <select
        v-model="selectedTimeWindow"
        @change="onTimeWindowChange"
        class="w-full bg-neutral-800/50 border border-neutral-700/30 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option class="text-neutral-900" v-for="option in timeWindowOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <div v-if="customTimeWindow" class="mt-1.5">
        <DateRangePicker
          v-model="customDateRange"
          @update:model-value="handleDateRangeChange"
        />
      </div>
      <!-- Current Active Time Window Display -->
      <div class="mt-2 pt-2 border-t border-neutral-700/30">
        <div class="text-xs text-neutral-400">
          <div class="flex items-center justify-between">
            <span>Active:</span>
            <span class="text-primary-400 font-medium">{{ currentTimeWindowDisplay }}</span>
          </div>
          <div class="flex items-center justify-between mt-0.5">
            <span>Source:</span>
            <span class="text-neutral-300 text-[10px]">{{ timeWindowSource }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="space-y-1.5">
      <template v-for="type in markerTypes" :key="type.value">
        <!-- RF Detections filter (commented out) -->
        <!-- <button
          v-if="type.value === 'target'"
          @click="toggleType(type.value)"
          :class="[
            'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-sm transition-colors',
            isVisible(type.value)
              ? 'bg-primary-500/20 text-white border border-primary-500/50'
              : 'bg-neutral-800/50 text-neutral-400 border border-neutral-700/30 hover:bg-neutral-800/70'
          ]"
          :title="`Toggle ${type.label}`"
        >
          <div class="flex items-center space-x-2">
            <div
              :class="[
                'w-2.5 h-2.5 rounded-full flex-shrink-0',
                isVisible(type.value) ? 'opacity-100' : 'opacity-50'
              ]"
              :style="{ backgroundColor: type.color }"
            ></div>
            <div class="flex flex-col">
              <span>{{ type.label }}</span>
              <span v-if="type.description" class="text-[10px] text-neutral-500 mt-0.5">
                {{ type.description }}
              </span>
            </div>
          </div>
          <div
            :class="[
              'text-xs',
              isVisible(type.value) ? 'text-primary-400' : 'text-neutral-500'
            ]"
          >
            {{ isVisible(type.value) ? 'ON' : 'OFF' }}
          </div>
        </button> -->
        
        <template v-if="type.value !== 'target'">
          <button
            @click="toggleType(type.value)"
            :class="[
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-sm transition-colors',
              isVisible(type.value)
                ? 'bg-primary-500/20 text-white border border-primary-500/50'
                : 'bg-neutral-800/50 text-neutral-400 border border-neutral-700/30 hover:bg-neutral-800/70'
            ]"
            :title="`Toggle ${type.label}`"
          >
            <div class="flex items-center space-x-2">
              <div
                :class="[
                  'w-2.5 h-2.5 rounded-full flex-shrink-0',
                  isVisible(type.value) ? 'opacity-100' : 'opacity-50'
                ]"
                :style="{ backgroundColor: type.color }"
              ></div>
              <div class="flex flex-col">
                <span>{{ type.label }}</span>
                <span v-if="type.description" class="text-[10px] text-neutral-500 mt-0.5">
                  {{ type.description }}
                </span>
              </div>
            </div>
            <div
              :class="[
                'text-xs',
                isVisible(type.value) ? 'text-primary-400' : 'text-neutral-500'
              ]"
            >
              {{ isVisible(type.value) ? 'ON' : 'OFF' }}
            </div>
          </button>
          
          <!-- Sensor Filter Mode (shown directly under Sensors button when enabled) -->
          <div v-if="type.value === 'sensor' && isVisible('sensor')" class="ml-4 mb-2 mt-1">
            <select
              v-model="selectedSensorFilterMode"
              @change="onSensorFilterModeChange"
              class="w-full bg-neutral-800/50 border border-neutral-700/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option class="text-neutral-900" value="all">All Sensors</option>
              <option class="text-neutral-900" value="with_detections">With Recent RF Detections</option>
              <option class="text-neutral-900" value="without_detections">Without RF Detections</option>
            </select>
            <p class="text-[10px] text-neutral-500 mt-0.5">
              {{ sensorFilterModeDescription }}
            </p>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMapStore } from '@/store/map'
import type { MapPin } from '@/types/map'
import DateRangePicker from '@/components/shared/DateRangePicker.vue'

const mapStore = useMapStore()
const { visibleMarkerTypes, timeWindowMs, dateRange, sensorFilterMode } = storeToRefs(mapStore)

// Helper to format milliseconds to human-readable string
const formatTimeWindow = (ms: number | null): string => {
  if (ms === null) return 'Default'
  if (ms >= 365 * 24 * 60 * 60 * 1000) return '1 year'
  if (ms >= 30 * 24 * 60 * 60 * 1000) return `${Math.round(ms / (30 * 24 * 60 * 60 * 1000))} months`
  if (ms >= 7 * 24 * 60 * 60 * 1000) return `${Math.round(ms / (7 * 24 * 60 * 60 * 1000))} weeks`
  if (ms >= 24 * 60 * 60 * 1000) return `${Math.round(ms / (24 * 60 * 60 * 1000))} days`
  if (ms >= 60 * 60 * 1000) return `${Math.round(ms / (60 * 60 * 1000))} hours`
  if (ms >= 60 * 1000) return `${Math.round(ms / (60 * 1000))} minutes`
  return `${Math.round(ms / 1000)} seconds`
}

// Determine current active time window and source
const currentTimeWindowDisplay = computed(() => {
  // Check if date range is active
  const dateRange = mapStore.getDateRange()
  if (dateRange) {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    const daysDiff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const hoursDiff = Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000))
    
    if (daysDiff > 0) {
      return `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'}`
    } else if (hoursDiff > 0) {
      return `${hoursDiff} ${hoursDiff === 1 ? 'hour' : 'hours'}`
    } else {
      const minutesDiff = Math.round((end.getTime() - start.getTime()) / (60 * 1000))
      return `${minutesDiff} ${minutesDiff === 1 ? 'minute' : 'minutes'}`
    }
  }
  
  const userWindow = timeWindowMs.value
  if (userWindow !== null && userWindow > 0) {
    return formatTimeWindow(userWindow)
  }
  
  const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
  if (isTestMode) {
    return '1 year (test mode)'
  }
  
  const envValue = import.meta.env.VITE_ACTIVE_POSITION_WINDOW_MS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (parsed > 0) {
      return formatTimeWindow(parsed)
    }
  }
  
  return '15 minutes (default)'
})

const timeWindowSource = computed(() => {
  // Check if date range is active
  const dateRange = mapStore.getDateRange()
  if (dateRange) {
    return 'Custom Date Range'
  }
  
  const userWindow = timeWindowMs.value
  if (userWindow !== null && userWindow > 0) {
    return 'User Selection'
  }
  
  const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
  if (isTestMode) {
    return 'Test Mode'
  }
  
  const envValue = import.meta.env.VITE_ACTIVE_POSITION_WINDOW_MS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (parsed > 0) {
      return 'Environment Variable'
    }
  }
  
  return 'Default'
})

// Time window options (in milliseconds)
const timeWindowOptions = [
  { label: 'Use Default', value: null },
  { label: '15 minutes', value: 15 * 60 * 1000 },
  { label: '30 minutes', value: 30 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '3 hours', value: 3 * 60 * 60 * 1000 },
  { label: '6 hours', value: 6 * 60 * 60 * 1000 },
  { label: '12 hours', value: 12 * 60 * 60 * 1000 },
  { label: '24 hours', value: 24 * 60 * 60 * 1000 },
  { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Custom', value: 'custom' }
]

const selectedTimeWindow = ref<number | string | null>(timeWindowMs.value)
const customTimeWindow = ref(false)
const customDateRange = ref<{ start: string; end: string } | null>(null)

// Sensor filter mode
const selectedSensorFilterMode = ref<'all' | 'with_detections' | 'without_detections'>(sensorFilterMode.value)

// Watch for external changes to sensorFilterMode
watch(sensorFilterMode, (newValue) => {
  selectedSensorFilterMode.value = newValue
})

const onSensorFilterModeChange = () => {
  mapStore.setSensorFilterMode(selectedSensorFilterMode.value)
}

const sensorFilterModeDescription = computed(() => {
  switch (selectedSensorFilterMode.value) {
    case 'with_detections':
      return `Shows sensors with active RF detections within the active time window (${currentTimeWindowDisplay.value})`
    case 'without_detections':
      return 'Shows only sensors that have no RF detections (no alerts)'
    default:
      return 'Shows all sensors regardless of RF detection status'
  }
})

// Watch for external changes to timeWindowMs and dateRange
watch([timeWindowMs, dateRange], ([newWindow, newRange]) => {
  // Only update if we're not currently in the middle of selecting a custom date range
  if (customTimeWindow.value && selectedTimeWindow.value === 'custom') {
    // Don't interfere with custom date range selection
    if (newRange) {
      customDateRange.value = newRange
    }
    return
  }
  
  if (newRange) {
    // Date range is active
    customTimeWindow.value = true
    selectedTimeWindow.value = 'custom'
    customDateRange.value = newRange
  } else if (newWindow !== null && !timeWindowOptions.some(opt => opt.value === newWindow)) {
    // It's a custom value - try to infer dates from the time window
    customTimeWindow.value = true
    selectedTimeWindow.value = 'custom'
    // Set default dates if not already set
    if (!customDateRange.value) {
      const now = new Date()
      const endDate = now.toISOString()
      const startDate = new Date(now.getTime() - newWindow).toISOString()
      customDateRange.value = { start: startDate, end: endDate }
    }
  } else {
    selectedTimeWindow.value = newWindow
    customTimeWindow.value = false
    customDateRange.value = null
  }
}, { immediate: false })

const onTimeWindowChange = () => {
  if (selectedTimeWindow.value === 'custom') {
    customTimeWindow.value = true
    // Set default dates if not already set
    if (!customDateRange.value) {
      const now = new Date()
      const endDate = now.toISOString()
      // Default to 24 hours back
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      customDateRange.value = { start: startDate, end: endDate }
    }
    updateCustomTimeWindow()
  } else {
    customTimeWindow.value = false
    customDateRange.value = null
    mapStore.setTimeWindow(selectedTimeWindow.value as number | null)
  }
}

const handleDateRangeChange = (range: { start: string; end: string } | null) => {
  // Only update if we have a complete range (both start and end)
  if (range && range.start && range.end) {
    customDateRange.value = range
    updateCustomTimeWindow()
  } else if (range === null) {
    // Clear was explicitly triggered
    customDateRange.value = null
    updateCustomTimeWindow()
  }
  // Don't update if range is incomplete (user is still selecting)
}

const updateCustomTimeWindow = () => {
  if (customDateRange.value?.start && customDateRange.value?.end) {
    const start = new Date(customDateRange.value.start)
    const end = new Date(customDateRange.value.end)
    
    // Allow end date to be equal to or after start date
    // Same day selection is valid - it will show data from 00:00 to 23:59 of that day
    if (end >= start) {
      // Set the date range in the store (this will clear time window)
      mapStore.setDateRange({
        start: customDateRange.value.start,
        end: customDateRange.value.end
      })
    } else {
      // Invalid range (end before start) - don't apply
      console.warn('[MapFilters] Invalid date range: end date must be on or after start date')
      mapStore.setDateRange(null)
    }
  } else {
    mapStore.setDateRange(null)
  }
}

const markerTypes: Array<{ value: MapPin['type']; label: string; color: string; description?: string }> = [
  { value: 'drone', label: 'Targets', color: '#22c55e' },
  { value: 'sensor', label: 'Sensors', color: '#22d3ee' },
  { value: 'target', label: 'RF Detections', color: '#f59e0b', description: 'Shown at sensor locations' }
  // Note: 'radar', 'threat', 'friendly', and 'unknown' types are defined but not currently used
  // { value: 'radar', label: 'Radar', color: '#8b5cf6' },
  // { value: 'threat', label: 'Threats', color: '#ef4444' },
  // { value: 'friendly', label: 'Operators', color: '#3b82f6' },
  // { value: 'unknown', label: 'Unknown', color: '#6b7280' }
]

const isVisible = (type: MapPin['type']): boolean => {
  return mapStore.isMarkerTypeVisible(type)
}

const toggleType = (type: MapPin['type']) => {
  if (type === 'target') {
    // RF Detections filter: If enabling, automatically enable Sensors (they're coupled)
    const willBeVisible = !mapStore.isMarkerTypeVisible('target')
    if (willBeVisible && !mapStore.isMarkerTypeVisible('sensor')) {
      // Enable sensors when enabling RF detections
      mapStore.setMarkerTypeVisible('sensor', true)
    }
    // Toggle RF Detections (disabling it does NOT disable sensors)
    mapStore.toggleMarkerType(type)
  } else if (type === 'sensor') {
    // Sensors filter: If disabling, also disable RF Detections (they can't be shown without sensors)
    const willBeVisible = mapStore.isMarkerTypeVisible('sensor')
    if (!willBeVisible && mapStore.isMarkerTypeVisible('target')) {
      // Disable RF detections when disabling sensors
      mapStore.setMarkerTypeVisible('target', false)
    }
    mapStore.toggleMarkerType(type)
  } else {
    mapStore.toggleMarkerType(type)
  }
}

const allVisible = computed(() => {
  return markerTypes.every(type => isVisible(type.value))
})

const toggleAll = () => {
  const shouldShow = !allVisible.value
  markerTypes.forEach(type => {
    mapStore.setMarkerTypeVisible(type.value, shouldShow)
  })
}
</script>

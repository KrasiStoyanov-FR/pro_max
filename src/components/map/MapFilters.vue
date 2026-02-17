<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div class="p-4 absolute top-4 lg:top-22 left-4 lg:left-6 z-20 rounded-2xl bg-neutral-900/40 backdrop-blur-3xl border border-white/10">
      <div class="flex flex- items-center gap-6 lg:gap-10">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-white">Map Filters:</h3>
          <!-- <button
            @click="toggleAll"
            class="text-xs text-neutral-400 hover:text-white transition-colors"
            title="Toggle all filters"
          >
            {{ allVisible ? 'Hide All' : 'Show All' }}
          </button> -->
        </div>

        <!-- Time Window Filter -->
        <div class="relative">
          <button 
            @click.stop="toggleTimeWindowDropdown"
            class="min-w-32 flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity"
          >
            <span class="flex-1 text-xs text-left text-white font-medium">{{ getSelectedTimeWindowLabel }}</span>
            <PhCaretDown v-if="!showTimeWindowDropdown" weight="bold" class="w-3 h-3 text-neutral-400" />
            <PhCaretUp v-else weight="bold" class="w-3 h-3 text-neutral-400" />
          </button>
          
          <div 
            v-if="showTimeWindowDropdown" 
            class="w-40 max-h-60 flex flex-col absolute top-full left-0 p-1.5 mt-6 space-y-0.5 overflow-y-auto z-50 rounded shadow-xl bg-neutral-900/90 border border-white/10 overflow-hidden"
          >
            <button 
              v-for="(option, index) in timeWindowOptions" 
              :key="option.value ?? index" 
              @click="setTimeWindowOption(option.value)"
              class="px-3 py-2 rounded-lg text-left text-xs hover:text-white hover:bg-primary-500/20 transition-colors"
              :class="selectedTimeWindow === option.value ? 'bg-primary-500 text-neutral-900' : 'text-white'"
            >
              {{ option.label }}
            </button>
          </div>

          <div v-if="customTimeWindow" class="mt-1.5 absolute top-full left-0 z-50 min-w-[300px]">
            <DateRangePicker
              v-model="customDateRange"
              @update:model-value="handleDateRangeChange"
            />
          </div>
        </div>
        
        <div class="flex items-center gap-6">
          <template v-for="type in markerTypes" :key="type.value">
            <div class="relative flex items-center">
              <!-- Checkbox and Label Group -->
              <div class="flex items-center gap-2 cursor-pointer select-none" @click="toggleType(type.value)">
                <!-- Custom Checkbox -->
                <div 
                  class="w-4 h-4 rounded-md border border-neutral-100 flex items-center justify-center transition-colors"
                  :class="{ 'bg-white': isVisible(type.value) }"
                >
                  <PhCheck v-if="isVisible(type.value)" weight="bold" class="text-black text-xs" />
                </div>
                
                <!-- Shape Icon -->
                <div 
                  class="ml-2 shape shape--outline" 
                  :class="[
                    type.shapeClass, 
                    `shape--${type.value}`,

                    { 'shape--active': isVisible(type.value) },
                    { 'opacity-50': !isVisible(type.value) }
                  ]"
                ></div>
                
                <!-- Label with Count -->
                <span class="text-xs text-white font-medium" :class="{ 'opacity-50': !isVisible(type.value) }">
                  {{ type.label }} <span class="text-neutral-400">({{ getCount(type.value) }})</span>
                </span>
              </div>

              <!-- Sensor Dropdown Toggle -->
              <button 
                v-if="type.value === 'sensor'"
                @click.stop="toggleSensorDropdown"
                class="ml-0.5 p-0.5 text-neutral-400 hover:text-white transition-colors"
              >
                <PhCaretDown v-if="!showSensorDropdown" weight="bold" class="w-3 h-3" />
                <PhCaretUp v-else weight="bold" class="w-3 h-3" />
              </button>

              <!-- Sensor Filter Dropdown Menu -->
              <div 
                v-if="type.value === 'sensor' && showSensorDropdown" 
                class="w-48 max-h-60 flex flex-col absolute top-full left-0 p-1.5 mt-6 space-y-0.5 overflow-y-auto z-50 rounded shadow-xl bg-neutral-900/90 border border-white/10 overflow-hidden"
              >
                <button 
                  v-for="mode in ['all', 'with_detections', 'without_detections']" 
                  :key="mode"
                  @click="setSensorMode(mode)"
                  class="px-3 py-2 rounded-lg text-left text-xs hover:text-white hover:bg-primary-500/20 transition-colors"
                  :class="selectedSensorFilterMode === mode ? 'bg-primary-500 text-neutral-900' : 'text-white'"
                >
                  {{ mode === 'all' ? 'All sensors' : (mode === 'with_detections' ? 'With Recent RF Detections' : 'Without RF Detections') }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { PhCheck, PhCaretDown, PhCaretUp } from '@phosphor-icons/vue'
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

const showTimeWindowDropdown = ref(false)
const toggleTimeWindowDropdown = () => {
  showTimeWindowDropdown.value = !showTimeWindowDropdown.value
}

const setTimeWindowOption = (value: number | string | null) => {
  selectedTimeWindow.value = value
  onTimeWindowChange()
  showTimeWindowDropdown.value = false
}

const getSelectedTimeWindowLabel = computed(() => {
  const option = timeWindowOptions.find(o => o.value === selectedTimeWindow.value)
  return option ? option.label : 'Select Time'
})

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
  { label: 'Live View', value: null },
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
const selectedSensorFilterMode = ref<'all' | 'with_detections' | 'with_targets' | 'without_detections'>(sensorFilterMode.value)

// Watch for external changes to sensorFilterMode
watch(sensorFilterMode, (newValue) => {
  selectedSensorFilterMode.value = newValue
})

const onSensorFilterModeChange = () => {
  const mode = selectedSensorFilterMode.value
  mapStore.setSensorFilterMode(mode)

  // Coupling logic for filters
  if (mode === 'with_detections') {
    // "Only RF detections": shouldn't see targets (drones) on the map
    mapStore.setMarkerTypeVisible('target', true) // Show RF markers
    mapStore.setMarkerTypeVisible('drone', false) // Hide Drone markers
  } else if (mode === 'with_targets') {
    // "Sensors with targets": see only sensors with detections and a target (not RF detections)
    mapStore.setMarkerTypeVisible('drone', true) // Show Drone markers
    mapStore.setMarkerTypeVisible('target', false) // Hide RF markers
  } else if (mode === 'without_detections') {
    // "No detections": see all normal sensors
    mapStore.setMarkerTypeVisible('target', false) // Hide RF markers (noise)
    mapStore.setMarkerTypeVisible('drone', false) // Hide Drone markers (targets)
  } else if (mode === 'all') {
    // Restore visibility of detections when showing all sensors
    mapStore.setMarkerTypeVisible('target', true)
    mapStore.setMarkerTypeVisible('drone', true)
  }
}

const sensorFilterModeDescription = computed(() => {
  switch (selectedSensorFilterMode.value) {
    case 'with_detections':
      return `Shows sensors with active RF detections within the active time window (${currentTimeWindowDisplay.value})`
    case 'with_targets':
      return 'Shows sensors with active drone targets (non-RF detections)'
    case 'without_detections':
      return 'Shows only sensors that have no active detections (no alerts)'
    default:
      return 'Shows all sensors regardless of detection status'
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


const markerTypes: Array<{ value: MapPin['type']; label: string; shapeClass: string }> = [
  { value: 'drone', label: 'Drones', shapeClass: 'shape--circle' },
  { value: 'friendly', label: 'Operators', shapeClass: 'shape--square' },
  { value: 'sensor', label: 'All Sensors', shapeClass: 'shape--triangle' }
]

const getCount = (type: MapPin['type']): number => {
  return mapStore.pins.filter(pin => pin.type === type).length
}

const showSensorDropdown = ref(false)

const toggleSensorDropdown = () => {
  showSensorDropdown.value = !showSensorDropdown.value
}

const setSensorMode = (mode: any) => {
  selectedSensorFilterMode.value = mode
  onSensorFilterModeChange()
  showSensorDropdown.value = false
}


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

<style lang="scss" scoped>
$shape-size: 1.125rem;
$border-width: 0.0625rem;
$default-color: theme('colors.white');

@mixin shape-active-style($color) {
  &:not(.shape--triangle) {
    background-color: $color;
    border-color: $color;
  }

  &.shape--triangle {
    background-color: $color;
    border-color: transparent;
    clip-path: polygon(50% 15%, 0% 100%, 100% 100%);
    
    &::before {
      display: none;
    }
  }
}

.shape {
  &:not(.shape--triangle) {
    width: $shape-size;
    height: $shape-size;
  }

  &--circle {
    border-radius: theme('borderRadius.full');
  }

  &--triangle {
    width: 1.25rem;
    height: $shape-size;
    position: relative;
    transform: translateY(-0.0625rem); // Nudge up to visually center with circles/squares
    border-left: $border-width solid transparent;
    border-bottom: $border-width solid $default-color;

    &::before {
      content: "";
      width: $shape-size;
      height: $shape-size;
      position: absolute;
      transform: rotate(45deg) skew(10deg, 10deg);
      left: 0;
      bottom: -0.625rem;
    }

    &,
    &::before {
      display: block;
      box-sizing: border-box;
      border-right: $border-width solid transparent;
    }
  }

  &--outline {
    &:not(.shape--triangle) {
      border-width: $border-width;
      border-color: $default-color;
    }

    &.shape--triangle::before {
      border-left: $border-width solid $default-color;
      border-top: $border-width solid $default-color;
      border-bottom: $border-width solid transparent;
    }
  }

  &--active {
    &.shape--drone {
      @include shape-active-style(theme('colors.green.500'));
    }

    &.shape--friendly {
      @include shape-active-style(theme('colors.blue.500'));
    }

    &.shape--sensor {
      @include shape-active-style(#22d3ee);
    }
  }
}
</style>

<template>
  <aside
    v-if="visible"
    class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/60 p-4 text-white shadow-2xl shadow-black/40"
    aria-label="Sensor details"
  >
    <header class="mb-4 flex items-start justify-between">
      <div>
        <p class="text-xs uppercase tracking-widest text-primary-300/70">Sensor details</p>
        <h2 class="text-lg font-semibold leading-tight">
          {{ sensor?.name ?? 'No selection' }}
        </h2>
      </div>
      <button
        type="button"
        class="rounded-full p-1 text-neutral-400 transition hover:text-white"
        @click="$emit('close')"
        aria-label="Close details panel"
      >
        ✕
      </button>
    </header>

    <div class="mb-4">
      <MapPreview :coordinates="coordinates" />
    </div>

    <section class="flex-1 space-y-6 overflow-y-auto pr-2">
      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Summary</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Sensor ID</dt>
            <dd class="font-semibold text-white">{{ sensor?.id ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Type</dt>
            <dd class="font-semibold text-white">{{ sensor?.type ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Status</dt>
            <dd>
              <span
                v-if="sensor"
                class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide"
                :class="statusClasses(sensor.status)"
              >
                {{ sensor.status }}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Location</h3>
        <dl class="mt-3 grid grid-cols-1 gap-2 text-sm text-neutral-200">
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Latitude</dt>
            <dd class="font-semibold text-white">{{ formatCoordinate(sensor?.latitude) }}</dd>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Longitude</dt>
            <dd class="font-semibold text-white">{{ formatCoordinate(sensor?.longitude) }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="isAdmin">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Network</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Connection</dt>
            <dd class="font-semibold text-white">{{ sensor?.network.connectionType ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Carrier</dt>
            <dd class="font-semibold text-white">{{ sensor?.network.carrier ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">IP Address</dt>
            <dd class="font-semibold text-white">{{ sensor?.network.ipAddress ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Signal</dt>
            <dd class="font-semibold text-white">{{ formatSignal(sensor?.network.signalStrength) }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="isAdmin">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Hardware</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">CPU</dt>
            <dd class="font-semibold text-white">{{ formatPercent(sensor?.hardware.cpuLoad) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">RAM</dt>
            <dd class="font-semibold text-white">{{ formatPercent(sensor?.hardware.memoryUsage) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Temperature</dt>
            <dd class="font-semibold text-white">{{ formatTemperature(sensor?.hardware.temperatureCelsius) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Storage</dt>
            <dd class="font-semibold text-white">{{ formatPercent(sensor?.hardware.storageUsage) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Uptime</dt>
            <dd class="font-semibold text-white">{{ formatDuration(sensor?.hardware.uptimeSeconds) }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="isAdmin">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Software</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Firmware</dt>
            <dd class="font-semibold text-white">{{ sensor?.firmwareVersion ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Software</dt>
            <dd class="font-semibold text-white">{{ sensor?.softwareVersion ?? '—' }}</dd>
          </div>
        </dl>
      </div>

      <div>
        <div class="mb-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Recent detections</h3>
            <select
              v-model="selectedTimeWindow"
              @change="onTimeWindowChange"
              class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:border-primary-400 focus:outline-none"
            >
              <option class="text-neutral-900" v-for="option in timeWindowOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <p v-if="detectionsToDisplay.length > 0 || (props.detections && props.detections.length > 0)" class="text-xs text-neutral-500">
            Showing {{ detectionsToDisplay.length }} {{ detectionsToDisplay.length === 1 ? 'detection' : 'detections' }}
            <span v-if="totalDetectionsInWindow > detectionsToDisplay.length">
              (of {{ totalDetectionsInWindow }} within selected time window)
            </span>
            <span v-else-if="totalDetectionsInWindow > 0">
              within selected time window
            </span>
          </p>
        </div>
        <div v-if="detectionsLoading" class="mt-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-neutral-300">
          Loading detections…
        </div>
        <div
          v-else-if="detectionsError"
          class="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
        >
          {{ detectionsError }}
        </div>
        <ul v-else-if="detectionsToDisplay.length" class="mt-3 space-y-2">
          <template v-for="(detection, index) in detectionsToDisplay" :key="detection.id">
            <!-- Show gap indicator if there's a significant time gap from previous detection -->
            <li
              v-if="index > 0 && hasSignificantGap(detection, detectionsToDisplay[index - 1])"
              class="flex items-center gap-2 py-1 text-xs text-amber-400/70"
            >
              <div class="flex-1 border-t border-amber-500/30"></div>
              <span class="font-medium">Gap: {{ formatTimeGap(detection.lastSeen, detectionsToDisplay[index - 1].lastSeen) }}</span>
              <div class="flex-1 border-t border-amber-500/30"></div>
            </li>
            <li
              class="group rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-neutral-200 transition hover:border-white/20 hover:bg-white/10 cursor-pointer"
              @click="handleDetectionClick(detection)"
            >
            <div class="flex items-center justify-between text-xs">
              <div class="flex flex-col">
                <span class="font-medium text-white">{{ formatRelativeTime(detection.lastSeen) }}</span>
                <span class="text-neutral-500 text-[10px]">{{ formatAbsoluteTime(detection.lastSeen) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                  :class="detectionStatusClasses(detection.status)"
                >
                  {{ detection.status }}
                </span>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                  :class="detectionTypeClasses(detection.type)"
                >
                  {{ detection.type }}
                </span>
              </div>
            </div>
            <div class="mt-1.5 flex items-center gap-4 text-xs text-neutral-300">
              <span v-if="detection.signalStrength !== null && detection.signalStrength !== undefined">
                Signal: <span class="font-semibold text-white">{{ detection.signalStrength }} dBm</span>
              </span>
              <span v-if="detection.distanceMeters !== null && detection.distanceMeters !== undefined">
                Distance: <span class="font-semibold text-white">{{ formatDistance(detection.distanceMeters) }}</span>
              </span>
              <span v-if="hasValidFrequency(detection.frequency)">
                Freq: <span class="font-semibold text-white">{{ formatFrequency(detection.frequency) }}</span>
              </span>
            </div>
          </li>
          </template>
        </ul>
        <div v-if="detectionsToDisplay.length > 0" class="mt-3">
          <button
            type="button"
            class="w-full rounded-lg border border-primary-500/50 bg-primary-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-500/30"
            @click="handleViewAllDetections"
          >
            View all detections for this sensor
          </button>
        </div>
        <p v-else class="mt-3 text-sm text-neutral-400">
          <span v-if="props.detections && props.detections.length > 0">
            No detections found within the selected time window ({{ formatTimeWindow(selectedTimeWindow) }}).
            <span class="block mt-1 text-xs text-neutral-500">
              Try selecting a longer time window to see older detections.
            </span>
          </span>
          <span v-else>
            No recent detections for this sensor.
          </span>
        </p>
      </div>
    </section>

    <footer v-if="isAdmin" class="mt-6 border-t border-white/5 pt-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <button type="button" class="btn-secondary" disabled>Refresh status</button>
        <button type="button" class="btn-secondary" disabled>Open logs</button>
        <button type="button" class="col-span-2 btn-secondary" disabled>Locate / Blink LED</button>
      </div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMapStore } from '@/store/map'
import MapPreview from '@/components/shared/MapPreview.vue'
import type { SensorItem, SensorStatus } from '@/types/sensors'
import type { DetectionItem, DetectionStatus, DetectionType } from '@/types/detections'
import { usePermissions } from '@/composables/usePermissions'

const router = useRouter()
const mapStore = useMapStore()

// Time window options (in milliseconds) - same as map filters
const timeWindowOptions = [
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '30 min', value: 30 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '3 hours', value: 3 * 60 * 60 * 1000 },
  { label: '6 hours', value: 6 * 60 * 60 * 1000 },
  { label: '12 hours', value: 12 * 60 * 60 * 1000 },
  { label: '24 hours', value: 24 * 60 * 60 * 1000 },
  { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 }
]

// Get default detection window using same logic as map view
const getDefaultDetectionWindow = (): number => {
  // Priority 1: User-selected time window from map store
  const userWindow = mapStore.getTimeWindow()
  if (userWindow !== null && userWindow > 0) {
    return userWindow
  }
  
  // Priority 2: Test mode (1 year)
  const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
  if (isTestMode) {
    return 365 * 24 * 60 * 60 * 1000 // 1 year
  }
  
  // Priority 3: Environment variable
  const envValue = import.meta.env.VITE_DETECTION_WINDOW_MS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (parsed > 0) {
      return parsed
    }
  }
  
  // Priority 4: Default (1 hour)
  return 60 * 60 * 1000
}

// Initialize with default detection window
const selectedTimeWindow = ref<number>(getDefaultDetectionWindow())

const props = withDefaults(defineProps<{
  sensor: SensorItem | null
  visible: boolean
  detections?: DetectionItem[]
  detectionsLoading?: boolean
  detectionsError?: string | null
}>(), {
  detections: () => [],
  detectionsLoading: false,
  detectionsError: null
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'show-detection', detection: DetectionItem, timeWindow?: number): void
}>()

const { isAdmin } = usePermissions()

const coordinates = computed(() => {
  if (!props.sensor || props.sensor.latitude === null || props.sensor.longitude === null) {
    return null
  }
  return {
    lat: props.sensor.latitude,
    lng: props.sensor.longitude
  }
})

// Helper to filter and deduplicate detections by time window
const getFilteredDetections = (detections: DetectionItem[], timeWindowMs: number) => {
  // Calculate cutoff time based on selected time window
  const cutoffTime = Date.now() - timeWindowMs
  
  // Filter by time window first
  const filteredByTime = detections.filter(detection => {
    const detectionTime = new Date(detection.lastSeen).getTime()
    return detectionTime >= cutoffTime
  })
  
  // Deduplicate by detection ID (keep most recent)
  const seen = new Map<number, DetectionItem>()
  filteredByTime.forEach(detection => {
    const existing = seen.get(detection.id)
    if (!existing || new Date(detection.lastSeen).getTime() > new Date(existing.lastSeen).getTime()) {
      seen.set(detection.id, detection)
    }
  })
  
  return Array.from(seen.values())
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
}

const totalDetectionsInWindow = computed(() => {
  const detections = props.detections ?? []
  const filtered = getFilteredDetections(detections, selectedTimeWindow.value)
  return filtered.length
})

const MAX_DISPLAY_DETECTIONS = 20

const detectionsToDisplay = computed(() => {
  const detections = props.detections ?? []
  const filtered = getFilteredDetections(detections, selectedTimeWindow.value)
  // Limit to MAX_DISPLAY_DETECTIONS most recent for display
  return filtered.slice(0, MAX_DISPLAY_DETECTIONS)
})

const onTimeWindowChange = () => {
  // Time window is already updated via v-model
  // The computed property will automatically recalculate
}
const detectionsLoading = computed(() => props.detectionsLoading ?? false)
const detectionsError = computed(() => props.detectionsError ?? null)

const statusClasses = (status: SensorStatus) => {
  switch (status) {
    case 'online':
      return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
    case 'degraded':
      return 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
    default:
      return 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
  }
}

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatCoordinate = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(6)
}

const formatSignal = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value} dBm`
}

const formatPercent = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(0)}%`
}

const formatTemperature = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)} °C`
}

const formatDuration = (value?: number | null): string => {
  if (!value || Number.isNaN(value)) return '—'
  const hours = Math.floor((value ?? 0) / 3600)
  const minutes = Math.floor(((value ?? 0) % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const formatLogTime = (value?: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatRelativeTime = (value?: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  
  const now = Date.now()
  const timeMs = date.getTime()
  const diffMs = now - timeMs
  
  // If in the future (shouldn't happen, but handle it)
  if (diffMs < 0) return 'Just now'
  
  // Less than a minute
  if (diffMs < 60 * 1000) return 'Just now'
  
  // Less than an hour
  if (diffMs < 60 * 60 * 1000) {
    const minutes = Math.floor(diffMs / (60 * 1000))
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }
  
  // Less than a day
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000))
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  
  // Less than a week
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  
  // Less than a month
  if (diffMs < 30 * 24 * 60 * 60 * 1000) {
    const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }
  
  // Less than a year
  if (diffMs < 365 * 24 * 60 * 60 * 1000) {
    const months = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000))
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  
  // More than a year
  const years = Math.floor(diffMs / (365 * 24 * 60 * 60 * 1000))
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

const formatAbsoluteTime = (value?: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const detectionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  // If today, show only time
  if (detectionDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // If yesterday
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (detectionDate.getTime() === yesterday.getTime()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // If within the last week, show day name and time
  const diffDays = Math.floor((today.getTime() - detectionDate.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 7) {
    return `${date.toLocaleDateString([], { weekday: 'short' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // Otherwise show full date and time
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const hasSignificantGap = (current: DetectionItem, previous: DetectionItem): boolean => {
  const currentTime = new Date(current.lastSeen).getTime()
  const previousTime = new Date(previous.lastSeen).getTime()
  const gapMs = previousTime - currentTime // Previous is older, so gap is positive
  
  // Consider a gap significant if it's more than 2 hours
  return gapMs > 2 * 60 * 60 * 1000
}

const formatTimeGap = (newerTime: string, olderTime: string): string => {
  const newer = new Date(newerTime).getTime()
  const older = new Date(olderTime).getTime()
  const gapMs = older - newer // Older is before newer, so gap is positive
  
  if (gapMs < 60 * 1000) return 'Less than a minute'
  if (gapMs < 60 * 60 * 1000) {
    const minutes = Math.floor(gapMs / (60 * 1000))
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }
  if (gapMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(gapMs / (60 * 60 * 1000))
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  const days = Math.floor(gapMs / (24 * 60 * 60 * 1000))
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

const detectionStatusClasses = (status: DetectionStatus) => {
  switch (status) {
    case 'Alarm':
      return 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
    case 'Track':
      return 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
    case 'Detect':
      return 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
    case 'Whitelisted':
      return 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/40'
    default:
      return 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/40'
  }
}

const detectionTypeClasses = (type: DetectionType) => {
  switch (type) {
    case 'UAV':
      return 'bg-primary-500/20 text-primary-200 border border-primary-500/40'
    case 'RC':
      return 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
    case 'Interference':
      return 'bg-orange-500/20 text-orange-200 border border-orange-500/40'
    case 'Unknown':
      return 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/40'
    default:
      return 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/40'
  }
}

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

const hasValidFrequency = (freq: number | null | undefined): boolean => {
  if (freq === null || freq === undefined) return false
  const numFreq = typeof freq === 'string' ? parseFloat(freq) : freq
  return !Number.isNaN(numFreq) && Number.isFinite(numFreq)
}

const formatFrequency = (freq: number | null | undefined): string => {
  if (freq === null || freq === undefined) {
    return '—'
  }
  const numFreq = typeof freq === 'string' ? parseFloat(freq) : Number(freq)
  if (Number.isNaN(numFreq) || !Number.isFinite(numFreq)) {
    return '—'
  }
  if (numFreq >= 1000000) {
    return `${(numFreq / 1000000).toFixed(2)} MHz`
  }
  if (numFreq >= 1000) {
    return `${(numFreq / 1000).toFixed(2)} kHz`
  }
  return `${numFreq.toFixed(2)} Hz`
}

const formatTimeWindow = (ms: number): string => {
  if (ms >= 30 * 24 * 60 * 60 * 1000) {
    const days = Math.round(ms / (24 * 60 * 60 * 1000))
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  if (ms >= 24 * 60 * 60 * 1000) {
    const hours = Math.round(ms / (60 * 60 * 1000))
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  if (ms >= 60 * 60 * 1000) {
    const hours = Math.round(ms / (60 * 60 * 1000))
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  const minutes = Math.round(ms / (60 * 1000))
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}

const handleDetectionClick = (detection: DetectionItem) => {
  // Pass the time window so it can be included in navigation
  const timeWindowMinutes = Math.round(selectedTimeWindow.value / (60 * 1000))
  emit('show-detection', detection, timeWindowMinutes)
}

const handleViewAllDetections = () => {
  if (!props.sensor || !props.sensor.source) return
  
  const source = props.sensor.source as any
  const systemId = source?.system_id
  const sensorId = source?.unit_id ?? source?.id
  
  const query: Record<string, string> = {}
  if (systemId) {
    query.systemId = String(systemId)
  } else if (sensorId) {
    query.sensorId = String(sensorId)
  }
  
  // Add time window filter (convert milliseconds to minutes for the API)
  const timeWindowMinutes = Math.round(selectedTimeWindow.value / (60 * 1000))
  if (timeWindowMinutes > 0) {
    query.timeWindow = String(timeWindowMinutes)
  }
  
  router.push({
    path: '/detections',
    query
  })
}
</script>

<style scoped>
.btn-secondary {
  @apply rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold uppercase tracking-wide text-xs text-white opacity-70 transition;
}
.btn-secondary:disabled {
  @apply cursor-not-allowed;
}
</style>



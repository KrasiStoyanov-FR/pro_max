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
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Recent detections</h3>
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
          <li
            v-for="detection in detectionsToDisplay"
            :key="detection.id"
            class="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-neutral-200"
          >
            <div class="flex items-center justify-between text-xs text-neutral-400">
              <span>{{ formatLogTime(detection.lastSeen) }}</span>
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
              <span v-if="detection.frequency !== null && detection.frequency !== undefined">
                Freq: <span class="font-semibold text-white">{{ formatFrequency(detection.frequency) }}</span>
              </span>
            </div>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-neutral-400">No recent detections for this sensor.</p>
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
import { computed } from 'vue'
import MapPreview from '@/components/shared/MapPreview.vue'
import type { SensorItem, SensorStatus } from '@/types/sensors'
import type { DetectionItem, DetectionStatus, DetectionType } from '@/types/detections'
import { usePermissions } from '@/composables/usePermissions'

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

defineEmits<{
  (e: 'close'): void
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

const detectionsToDisplay = computed(() => {
  const detections = props.detections ?? []
  // Sort by most recent first and limit to 10 most recent
  return [...detections]
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
    .slice(0, 10)
})
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

const formatFrequency = (freq: number): string => {
  if (freq >= 1000000) {
    return `${(freq / 1000000).toFixed(2)} MHz`
  }
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(2)} kHz`
  }
  return `${freq.toFixed(2)} Hz`
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



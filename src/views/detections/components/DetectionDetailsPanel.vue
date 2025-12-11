<template>
  <aside
    v-if="visible"
    class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/60 p-4 text-white shadow-2xl shadow-black/40"
    aria-label="Detection details"
  >
    <header class="mb-4 flex items-start justify-between">
      <div>
        <p class="text-xs uppercase tracking-widest text-primary-300/70">Detection details</p>
        <h2 class="text-lg font-semibold leading-tight">
          {{ detection?.sensorName ?? 'No selection' }}
        </h2>
        <p class="text-xs text-neutral-400" v-if="detection">
          Last seen {{ formatDate(detection.lastSeen) }}
        </p>
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
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Target ID</dt>
            <dd class="font-semibold text-white">{{ detection?.targetId ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Type</dt>
            <dd class="font-semibold text-white">{{ detection?.type ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Risk</dt>
            <dd class="mt-1">
              <RiskIndicator v-if="detection" :risk-level="detection.riskLevel" />
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Confidence</dt>
            <dd class="font-semibold text-white">{{ formatNumber(detection?.confidence, 0, '%') }}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Kinematics</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Distance</dt>
            <dd class="font-semibold text-white">{{ formatDistance(detection?.distanceMeters) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Altitude</dt>
            <dd class="font-semibold text-white">{{ formatAltitude(detection?.altitudeMeters) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">AGL</dt>
            <dd class="font-semibold text-white">{{ formatAltitude(detection?.aglMeters) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Speed</dt>
            <dd class="font-semibold text-white">{{ formatSpeed(detection?.speedMetersPerSecond) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Bearing</dt>
            <dd class="font-semibold text-white">{{ formatBearing(detection?.bearingDegrees) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Angles</dt>
            <dd class="font-semibold text-white">
              {{ formatAnglePair(detection?.angleXDegrees, detection?.angleYDegrees) }}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Signal</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Frequency</dt>
            <dd class="font-semibold text-white">{{ formatNumber(detection?.frequency, 0, ' MHz') }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Band</dt>
            <dd class="font-semibold text-white">{{ detection?.band ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">RSSI</dt>
            <dd class="font-semibold text-white">
              {{ detection?.signalStrength !== undefined && detection?.signalStrength !== null ? `${detection.signalStrength} dBm` : '—' }}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Position</h3>
        <dl class="mt-3 grid grid-cols-1 gap-2 text-sm text-neutral-200">
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Latitude</dt>
            <dd class="font-semibold text-white">{{ formatCoordinate(detection?.latitude) }}</dd>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Longitude</dt>
            <dd class="font-semibold text-white">{{ formatCoordinate(detection?.longitude) }}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Sensors</h3>
        <ul class="mt-3 space-y-2 text-sm text-neutral-200" v-if="detection?.sensors?.length">
          <li
            v-for="sensor in detection.sensors"
            :key="sensor.name + (sensor.id ?? '')"
            class="rounded-lg border border-white/5 bg-white/5 px-3 py-2"
          >
            <p class="font-semibold text-white">{{ sensor.name }}</p>
            <p class="text-xs uppercase tracking-wide text-neutral-500" v-if="sensor.id">ID: {{ sensor.id }}</p>
          </li>
        </ul>
        <p v-else class="text-xs text-neutral-500">No additional sensor data.</p>
      </div>
    </section>

    <footer class="mt-6 border-t border-white/5 pt-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <button type="button" class="btn-secondary" disabled>Center on map</button>
        <button type="button" class="btn-secondary" disabled>Start track</button>
        <button type="button" class="btn-secondary" disabled>Link EO/IR</button>
        <button type="button" class="btn-secondary" disabled>Create incident</button>
        <button type="button" class="col-span-2 btn-secondary" disabled>Add to whitelist</button>
      </div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MapPreview from '@/components/shared/MapPreview.vue'
import RiskIndicator from './RiskIndicator.vue'
import type { DetectionItem } from '@/types/detections'

const props = defineProps<{
  detection: DetectionItem | null
  visible: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const coordinates = computed(() => {
  if (!props.detection || props.detection.latitude === null || props.detection.longitude === null) {
    return null
  }
  return {
    lat: props.detection.latitude,
    lng: props.detection.longitude
  }
})

const toNumeric = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(numeric as number) ? (numeric as number) : null
}

const formatNumber = (value: number | string | null | undefined, fractionDigits = 0, suffix = ''): string => {
  const numeric = toNumeric(value)
  if (numeric === null) return '—'
  return `${numeric.toFixed(fractionDigits)}${suffix}`
}

const formatDistance = (value: number | string | null | undefined): string => {
  const numeric = toNumeric(value)
  if (numeric === null) return '—'
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)} km`
  return `${numeric.toFixed(0)} m`
}

const formatAltitude = (value: number | string | null | undefined): string => {
  const numeric = toNumeric(value)
  if (numeric === null) return '—'
  return `${numeric.toFixed(0)} m`
}

const formatSpeed = (value: number | string | null | undefined): string => {
  const numeric = toNumeric(value)
  if (numeric === null) return '—'
  return `${numeric.toFixed(1)} m/s`
}

const formatBearing = (value: number | string | null | undefined): string => {
  const numeric = toNumeric(value)
  if (numeric === null) return '—'
  return `${numeric.toFixed(0)}°`
}

const formatAnglePair = (x?: number | null, y?: number | null): string => {
  const xNumeric = toNumeric(x ?? null)
  const yNumeric = toNumeric(y ?? null)
  if (xNumeric === null && yNumeric === null) return '—'
  const parts: string[] = []
  if (xNumeric !== null) {
    parts.push(`X ${xNumeric.toFixed(1)}°`)
  }
  if (yNumeric !== null) {
    parts.push(`Y ${yNumeric.toFixed(1)}°`)
  }
  return parts.length ? parts.join(' / ') : '—'
}

const formatCoordinate = (value?: number | null): string => {
  const numeric = toNumeric(value ?? null)
  if (numeric === null) return '—'
  return numeric.toFixed(6)
}

const formatDate = (value?: string): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
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



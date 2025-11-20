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
        <p class="text-xs text-neutral-400" v-if="sensor">
          Last communication {{ formatDate(sensor.lastCommunication) }}
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
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Location</dt>
            <dd class="font-semibold text-white">
              <span v-if="sensor?.locationLabel">{{ sensor.locationLabel }}</span>
              <span v-else>—</span>
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Position</h3>
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

      <div>
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

      <div>
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

      <div>
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
    </section>

    <footer class="mt-6 border-t border-white/5 pt-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <button type="button" class="btn-secondary" disabled>Refresh status</button>
        <button type="button" class="btn-secondary" disabled>Open logs</button>
        <button type="button" class="btn-secondary" disabled>Calibration</button>
        <button type="button" class="btn-secondary" disabled>Reboot</button>
        <button type="button" class="col-span-2 btn-secondary" disabled>Locate / Blink LED</button>
      </div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MapPreview from '@/components/shared/MapPreview.vue'
import type { SensorItem, SensorStatus } from '@/types/sensors'

const props = defineProps<{
  sensor: SensorItem | null
  visible: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const coordinates = computed(() => {
  if (!props.sensor || props.sensor.latitude === null || props.sensor.longitude === null) {
    return null
  }
  return {
    lat: props.sensor.latitude,
    lng: props.sensor.longitude
  }
})

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
</script>

<style scoped>
.btn-secondary {
  @apply rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold uppercase tracking-wide text-xs text-white opacity-70 transition;
}
.btn-secondary:disabled {
  @apply cursor-not-allowed;
}
</style>



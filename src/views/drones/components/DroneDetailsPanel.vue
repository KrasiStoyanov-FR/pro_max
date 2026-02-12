<template>
  <aside
    v-if="visible"
    class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/60 p-4 text-white shadow-2xl shadow-black/40"
    aria-label="Detection details"
  >
    <header class="mb-4 flex items-start justify-between">
      <div>
        <p class="text-xs uppercase tracking-widest text-primary-300/70">
          {{ detection ? 'Detection details' : 'Drone details' }}
        </p>
        <h2 class="text-lg font-semibold leading-tight">
          {{ panelTitle }}
        </h2>
        <p class="text-xs text-neutral-400" v-if="drone">
          Drone ID: {{ drone.id }}
        </p>
        <p class="text-xs text-neutral-400" v-else-if="detection">
          {{ detection.source === 'rf' ? 'RF' : 'Position' }} detection #{{ detection.id }}
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

    <div v-if="detectionCoords" class="mb-4">
      <MapPreview 
        :coordinates="detectionCoords" 
        :trajectory="droneTrajectory"
        :zoom="12"
      />
    </div>

    <section class="flex-1 space-y-6 overflow-y-auto pr-2">
      <!-- Detection (always when we have a row: sensor, time, type, altitude, etc.) -->
      <div v-if="detection">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Detection</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Type</dt>
            <dd class="font-semibold text-white">
              {{ detection.source === 'position' ? 'Position' : 'RF' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Time</dt>
            <dd class="font-semibold text-white">{{ formatDate(detection.time) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Sensor</dt>
            <dd class="font-semibold text-white">
              <button
                v-if="detection.systemId"
                type="button"
                class="inline-flex items-center rounded-md bg-primary-500/10 px-2 py-1 text-xs font-mono text-primary-300 underline-offset-2 hover:bg-primary-500/20 hover:underline"
                @click="goToSensor"
              >
                {{ detection.systemId }}
              </button>
              <span v-else class="text-neutral-500">—</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Altitude</dt>
            <dd class="font-semibold text-white">{{ formatAltitude(detection.altitude) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Speed</dt>
            <dd class="font-semibold text-white">{{ formatSpeed(detection.speed) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Receiver type</dt>
            <dd class="font-semibold text-white">{{ detection.receiverType ?? '—' }}</dd>
          </div>
          <template v-if="detection.source === 'rf'">
            <div>
              <dt class="text-xs uppercase tracking-widest text-neutral-500">Status</dt>
              <dd class="font-semibold text-white">
                {{ detection.detectionStatus !== undefined && detection.detectionStatus !== null ? (detection.detectionStatus ? 'Detect' : '—') : '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-widest text-neutral-500">Signal strength</dt>
              <dd class="font-semibold text-white">{{ formatNumber(detection.signalStrength) }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-widest text-neutral-500">Frequency</dt>
              <dd class="font-semibold text-white">{{ formatNumber(detection.frequency) }}</dd>
            </div>
          </template>
        </dl>
      </div>

      <!-- Drone identification (when we have a linked drone) -->
      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Identification</h3>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-200">
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Manufacturer</dt>
            <dd class="font-semibold text-white">
              {{ drone?.manufacturer ?? '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Model</dt>
            <dd class="font-semibold text-white">
              {{ drone?.modelName ?? '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">MAC Address</dt>
            <dd class="font-mono text-xs font-semibold text-white">{{ drone?.macAddress ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Serial Number</dt>
            <dd class="font-semibold text-white">{{ drone?.serialNumber ?? '—' }}</dd>
          </div>
          <div v-if="!detection">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Sensor</dt>
            <dd class="font-semibold text-white">
              <button
                v-if="drone?.systemId"
                type="button"
                class="inline-flex items-center rounded-md bg-primary-500/10 px-2 py-1 text-xs font-mono text-primary-300 underline-offset-2 hover:bg-primary-500/20 hover:underline"
                @click="goToSensor"
              >
                {{ drone.systemId }}
              </button>
              <span v-else class="text-neutral-500">—</span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Timestamps (drone first/last seen when we have a drone) -->
      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Timestamps</h3>
        <dl class="mt-3 grid grid-cols-1 gap-2 text-sm text-neutral-200">
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">First Seen</dt>
            <dd class="font-semibold text-white">{{ formatDate(drone?.firstSeen) }}</dd>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-widest text-neutral-500">Last Seen</dt>
            <dd class="font-semibold text-white">{{ drone?.lastSeen ? formatDate(drone.lastSeen) : '—' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Trajectory Points List (only if we have trajectory data) -->
      <div v-if="droneTrajectory && droneTrajectory.length > 0">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Flight Path</h3>
        <div class="mt-3 rounded-lg border border-white/5 bg-white/5 max-h-48 overflow-y-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-[#1F1F20] text-neutral-400 sticky top-0">
              <tr>
                <th class="px-3 py-2 font-medium">Time</th>
                <th class="px-3 py-2 font-medium">Lat, Lng</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <!-- Show in reverse chronological order (newest first) -->
              <tr v-for="(point, idx) in [...droneTrajectory].reverse()" :key="idx" class="hover:bg-white/5">
                <td class="px-3 py-2 text-neutral-300 whitespace-nowrap">{{ formatTimeOnly(point.timestamp) }}</td>
                <td class="px-3 py-2 font-mono text-neutral-400">{{ point.lat.toFixed(5) }}, {{ point.lng.toFixed(5) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <footer v-if="drone && hasPermission('detections.manage')" class="mt-6 border-t border-white/5 pt-4">
      <button 
        type="button" 
        class="w-full btn-secondary"
        @click="handleGenerateReport"
      >
        Generate Report
      </button>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissions } from '@/composables/usePermissions'
import { useDataStore } from '@/store/data'
import MapPreview from '@/components/shared/MapPreview.vue'
import type { DroneItem, UnifiedDetectionRow } from '@/types/drones'
import type { DroneTrajectoryPoint } from '@/types/map'

const { hasPermission } = usePermissions()
const router = useRouter()
const dataStore = useDataStore()

const props = withDefaults(
  defineProps<{
    drone?: DroneItem | null
    visible?: boolean
    /** Detection location for map preview */
    detectionCoords?: { lat: number; lng: number } | null
    /** Full detection row (sensor, time, type, altitude, RF fields, etc.) */
    detection?: UnifiedDetectionRow | null
  }>(),
  {
    drone: null,
    visible: false,
    detectionCoords: null,
    detection: null
  }
)

defineEmits<{
  (e: 'close'): void
}>()

// Computed property to extract trajectory data if available
// Computed property to extract trajectory data if available
const droneTrajectory = computed<DroneTrajectoryPoint[] | undefined>(() => {
  // Check if the detection row has trajectory data attached (RF source case)
  if (props.detection?.source === 'rf' && (props.detection as any).trajectory) {
    return (props.detection as any).trajectory
  }

  // For Position source (Drone), we need to fetch positions from the store
  if (props.detection?.source === 'position' && props.detection.drone?.id) {
    const droneId = props.detection.drone.id
    // Get all positions for this drone from the store
    const positions = dataStore.getDronePositionsByDroneId(droneId) || []
    
    // Sort by time
    const sorted = [...positions].sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime()
    })

    // Map to DroneTrajectoryPoint
    const points: DroneTrajectoryPoint[] = sorted
      .map(p => ({
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        timestamp: p.time
      }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))

    return points.length > 0 ? points : undefined
  }
  
  return undefined
})

const panelTitle = computed(() => {
  if (props.drone) return props.drone.displayName
  if (props.detection) {
    return props.detection.source === 'rf'
      ? `RF Detection #${props.detection.id}`
      : `Position Detection #${props.detection.id}`
  }
  return 'No selection'
})

const formatDate = (value?: string): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatTimeOnly = (value?: string): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString()
}

const formatAltitude = (value?: number | null): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`
  return `${value.toFixed(0)} m`
}

const formatSpeed = (value?: number | null): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toFixed(1)} m/s`
}

const formatNumber = (value?: number | null): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return String(value)
}

/** Use detection's sensor (the one that made the detection), not the drone's. */
const sensorSystemId = computed(() => props.detection?.systemId ?? props.drone?.systemId ?? null)

const goToSensor = (): void => {
  const systemId = sensorSystemId.value
  if (!systemId) return
  router.push({
    path: '/map',
    query: {
      systemId: String(systemId)
    }
  })
}

const handleGenerateReport = () => {
  // This will be handled by the parent component
  // For now, just emit an event or navigate
  console.log('Generate report for drone:', props.drone?.id)
}
</script>

<style scoped>
.btn-secondary {
  @apply rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold uppercase tracking-wide text-xs text-white transition hover:bg-white/10;
}
</style>




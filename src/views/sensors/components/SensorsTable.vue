<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between pb-3">
      <p class="text-sm text-neutral-400">
        Showing
        <span class="font-semibold text-white">{{ sensors.length }}</span>
        sensors
      </p>
    </div>

    <div class="flex-1 overflow-auto rounded-xl border border-white/5 bg-black/20">
      <table class="min-w-full text-left text-sm text-white">
        <thead class="sticky top-0 z-10 bg-neutral-900/80 text-xs uppercase text-neutral-400 backdrop-blur">
          <tr>
            <th scope="col" class="px-4 py-3">Sensor</th>
            <th scope="col" class="px-4 py-3">Type</th>
            <th scope="col" class="px-4 py-3">Status</th>
            <th scope="col" class="px-4 py-3">Last comm</th>
            <th scope="col" class="px-4 py-3">Firmware</th>
            <th scope="col" class="px-4 py-3">Software</th>
            <th scope="col" class="px-4 py-3">Signal</th>
            <th scope="col" class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading" class="border-t border-white/5 text-neutral-400">
            <td colspan="8" class="px-4 py-6 text-center text-sm">Loading sensors…</td>
          </tr>

          <tr v-else-if="!sensors.length" class="border-t border-white/5 text-neutral-400">
            <td colspan="8" class="px-4 py-6 text-center text-sm">No sensors available.</td>
          </tr>

          <tr
            v-for="sensor in sensors"
            :key="sensor.id"
            :class="[
              'border-t border-white/5 transition hover:bg-white/5 focus-within:bg-white/10',
              sensor.id === selectedId ? 'bg-white/10' : ''
            ]"
          >
            <td class="px-4 py-4">
              <div class="flex flex-col">
                <span class="font-semibold leading-tight">{{ sensor.name }}</span>
                <span class="text-xs text-neutral-400">ID: {{ sensor.id }}</span>
              </div>
            </td>
            <td class="px-4 py-4">
              {{ sensor.type }}
            </td>
            <td class="px-4 py-4">
              <span
                class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide"
                :class="statusClasses(sensor.status)"
              >
                {{ sensor.status }}
              </span>
            </td>
            <td class="px-4 py-4 text-neutral-200">
              {{ formatDate(sensor.lastCommunication) }}
            </td>
            <td class="px-4 py-4">
              {{ sensor.firmwareVersion ?? '—' }}
            </td>
            <td class="px-4 py-4">
              {{ sensor.softwareVersion ?? '—' }}
            </td>
            <td class="px-4 py-4">
              {{ formatSignal(sensor.network.signalStrength) }}
            </td>
            <td class="px-4 py-4 text-right">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                @click="emit('show-details', sensor)"
              >
                Details
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SensorItem, SensorStatus } from '@/types/sensors'

const props = defineProps<{
  sensors: SensorItem[]
  isLoading: boolean
  selectedId: string | null
  deletingId?: string | null
}>()

const emit = defineEmits<{
  (e: 'show-details', sensor: SensorItem): void
  (e: 'delete-sensor', sensor: SensorItem): void
}>()

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

const formatDate = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatSignal = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value} dBm`
}

// Check if sensor can be deleted (has valid unit_id in source)
const canDeleteSensor = (sensor: SensorItem): boolean => {
  const source = sensor.source as any
  // Only show delete button if sensor has a valid unit_id (the database primary key)
  return !!(source?.unit_id || source?.id)
}
</script>



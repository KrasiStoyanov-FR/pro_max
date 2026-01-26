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
            <th scope="col" class="px-4 py-3">Unit Group</th>
            <th scope="col" class="px-4 py-3">Type</th>
            <th scope="col" class="px-4 py-3">Status</th>
            <th scope="col" class="px-4 py-3">Firmware</th>
            <th scope="col" class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading" class="border-t border-white/5 text-neutral-400">
            <td colspan="6" class="px-4 py-6 text-center text-sm">Loading sensors…</td>
          </tr>

          <tr v-else-if="!sensors.length" class="border-t border-white/5 text-neutral-400">
            <td colspan="6" class="px-4 py-6 text-center text-sm">No sensors available.</td>
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
              {{ sensor.unitGroup ?? '—' }}
            </td>
            <td class="px-4 py-4">
              {{ sensor.type }}
            </td>
            <td class="px-4 py-4">
              <span
                class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide"
                :class="statusClasses(sensor)"
              >
                {{ getStatusDisplay(sensor) }}
              </span>
            </td>
            <td class="px-4 py-4">
              {{ sensor.firmwareVersion ?? '—' }}
            </td>
            <td class="px-4 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  class="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                  @click="emit('show-details', sensor)"
                >
                  Details
                </button>
                <button
                  v-if="canEditSensor(sensor)"
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-primary-500/50 bg-primary-500/20 text-white transition hover:bg-primary-500/30"
                  @click="emit('edit-sensor', sensor)"
                  :title="'Edit sensor'"
                  aria-label="Edit sensor"
                >
                  <PhPencilSimple :size="16" weight="bold" />
                </button>
                <button
                  v-if="canDeleteSensor(sensor)"
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-rose-500/50 bg-rose-500/20 text-white transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="emit('delete-sensor', sensor)"
                  :disabled="sensor.id === deletingId"
                  :title="sensor.id === deletingId ? 'Deleting...' : 'Delete sensor'"
                  :aria-label="sensor.id === deletingId ? 'Deleting...' : 'Delete sensor'"
                >
                  <PhTrash :size="16" weight="bold" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import type { SensorItem, SensorStatus } from '@/types/sensors'
import { usePermissions } from '@/composables/usePermissions'

const props = defineProps<{
  sensors: SensorItem[]
  isLoading: boolean
  selectedId: string | null
  deletingId?: string | null
}>()

const emit = defineEmits<{
  (e: 'show-details', sensor: SensorItem): void
  (e: 'edit-sensor', sensor: SensorItem): void
  (e: 'delete-sensor', sensor: SensorItem): void
}>()

const { hasPermission } = usePermissions()

const statusClasses = (sensor: SensorItem) => {
  // Get the real status from the source record
  const sourceStatus = (sensor.source as any)?.status
  const statusValue = sourceStatus ? String(sourceStatus).toLowerCase() : sensor.status.toLowerCase()
  
  // Map status values to appropriate colors
  if (statusValue === 'online' || statusValue === 'running' || statusValue === 'active' || statusValue === 'healthy') {
    return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
  }
  if (statusValue === 'degraded' || statusValue === 'warning') {
    return 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
  }
  // Default to offline/error styling
  return 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
}

const formatDate = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const getStatusDisplay = (sensor: SensorItem): string => {
  // Use the real status from the source record if available, otherwise use normalized status
  const sourceStatus = (sensor.source as any)?.status
  if (sourceStatus) {
    return String(sourceStatus)
  }
  return sensor.status
}

// Check if sensor can be edited (user has permission AND sensor has valid source)
const canEditSensor = (sensor: SensorItem): boolean => {
  // First check permission
  if (!hasPermission('sensors.edit')) {
    return false
  }
  // Then check if sensor has a valid source (the database record)
  const source = sensor.source as any
  return !!(source?.unit_id || source?.id)
}

// Check if sensor can be deleted (has valid unit_id in source AND user has permission)
const canDeleteSensor = (sensor: SensorItem): boolean => {
  // First check permission
  if (!hasPermission('sensors.delete')) {
    return false
  }
  // Then check if sensor has a valid unit_id (the database primary key)
  const source = sensor.source as any
  return !!(source?.unit_id || source?.id)
}
</script>



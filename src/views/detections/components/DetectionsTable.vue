<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between pb-3">
      <p class="text-sm text-neutral-400" role="status">
        Showing
        <span class="font-semibold text-white">{{ detections.length }}</span>
        detections
      </p>
      <slot name="actions" />
    </div>

    <div class="flex-1 overflow-auto rounded-xl border border-white/5 bg-black/20">
      <table class="min-w-full text-left text-sm text-white">
        <thead class="sticky top-0 z-10 bg-neutral-900/80 text-xs uppercase text-neutral-400 backdrop-blur">
          <tr>
            <th scope="col" class="px-4 py-3">Type</th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('status')" :aria-label="`Sort by status (${sortDirectionLabel})`">
                Status
                <SortIcon :active="sortField === 'status'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('distance')" :aria-label="`Sort by distance (${sortDirectionLabel})`">
                Distance
                <SortIcon :active="sortField === 'distance'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">Altitude</th>
            <th scope="col" class="px-4 py-3">Bearing</th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('lastSeen')" :aria-label="`Sort by last seen (${sortDirectionLabel})`">
                Last seen
                <SortIcon :active="sortField === 'lastSeen'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">Sensor</th>
            <th scope="col" class="px-4 py-3">Risk</th>
            <th scope="col" class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="isLoading" class="border-t border-white/5 text-neutral-400">
            <td colspan="9" class="px-4 py-6 text-center text-sm">
              Loading detections&hellip;
            </td>
          </tr>

          <tr v-else-if="!detections.length" class="border-t border-white/5 text-neutral-400">
            <td colspan="9" class="px-4 py-6 text-center text-sm">
              No detections match the current filters.
            </td>
          </tr>

          <tr
            v-for="detection in detections"
            :key="detection.id"
            :class="['border-t border-white/5 transition hover:bg-white/5 focus-within:bg-white/10', riskStripeClass(detection.riskLevel)]"
          >
            <td class="px-4 py-4 font-semibold">
              {{ detection.type }}
              <p v-if="detection.droneId" class="text-xs text-neutral-400">Drone #{{ detection.droneId }}</p>
            </td>
            <td class="px-4 py-4">
              <StatusBadge :status="detection.status" />
            </td>
            <td class="px-4 py-4">
              {{ formatMeters(detection.distanceMeters) }}
            </td>
            <td class="px-4 py-4">
              {{ formatMeters(detection.altitudeMeters) }}
            </td>
            <td class="px-4 py-4">
              {{ formatBearing(detection.bearingDegrees) }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-neutral-200">
              {{ formatTimestamp(detection.lastSeen) }}
            </td>
            <td class="px-4 py-4">
              <div class="flex flex-col">
                <span class="font-semibold leading-tight">{{ detection.sensorName }}</span>
                <span v-if="detection.sensorId" class="text-xs text-neutral-400">
                  ID: {{ detection.sensorId }}
                </span>
              </div>
            </td>
            <td class="px-4 py-4">
              <RiskIndicator :risk-level="detection.riskLevel" />
            </td>
            <td class="px-4 py-4 flex justify-end gap-2">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                @click="emit('show-details', detection)"
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
import { computed } from 'vue'
import type { DetectionItem, DetectionRiskLevel, DetectionSortField } from '@/types/detections'
import RiskIndicator from './RiskIndicator.vue'
import StatusBadge from './StatusBadge.vue'
import SortIcon from './SortIcon.vue'

const props = defineProps<{
  detections: DetectionItem[]
  isLoading: boolean
  sortField: DetectionSortField | null
  sortDirection: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  (e: 'change-sort', value: DetectionSortField): void
  (e: 'show-details', detection: DetectionItem): void
}>()

const emitSort = (field: DetectionSortField) => {
  emit('change-sort', field)
}

const formatMeters = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`
  return `${value.toFixed(0)} m`
}

const formatBearing = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return '—'
  return `${value.toFixed(0)}°`
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const riskStripeClass = (risk: DetectionRiskLevel): string => {
  switch (risk) {
    case 'high':
      return 'border-l-4 border-l-rose-500/60'
    case 'medium':
      return 'border-l-4 border-l-amber-400/60'
    default:
      return 'border-l-4 border-l-emerald-400/60'
  }
}

const sortDirectionLabel = computed(() => (props.sortDirection === 'asc' ? 'ascending' : 'descending'))
</script>



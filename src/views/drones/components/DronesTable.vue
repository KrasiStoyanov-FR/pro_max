<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between pb-3">
      <p class="text-sm text-neutral-400" role="status">
        Showing
        <span class="font-semibold text-white">{{ drones.length }}</span>
        drones
      </p>
      <slot name="actions" />
    </div>

    <div class="flex-1 overflow-auto rounded-xl border border-white/5 bg-black/20">
      <table class="min-w-full text-left text-sm text-white">
        <thead class="sticky top-0 z-10 bg-neutral-900/80 text-xs uppercase text-neutral-400 backdrop-blur">
          <tr>
            <th scope="col" class="px-4 py-3 w-12">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                @change="handleSelectAllChange"
                class="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                aria-label="Select all drones"
              />
            </th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('id')" :aria-label="`Sort by ID (${sortDirectionLabel})`">
                ID
                <SortIcon :active="sortField === 'id'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">Name</th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('macAddress')" :aria-label="`Sort by MAC address (${sortDirectionLabel})`">
                MAC Address
                <SortIcon :active="sortField === 'macAddress'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">Serial Number</th>
            <th scope="col" class="px-4 py-3">UAS ID</th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('firstSeen')" :aria-label="`Sort by first seen (${sortDirectionLabel})`">
                First Seen
                <SortIcon :active="sortField === 'firstSeen'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('lastSeen')" :aria-label="`Sort by last seen (${sortDirectionLabel})`">
                Last Seen
                <SortIcon :active="sortField === 'lastSeen'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('isActive')" :aria-label="`Sort by status (${sortDirectionLabel})`">
                Status
                <SortIcon :active="sortField === 'isActive'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="isLoading" class="border-t border-white/5 text-neutral-400">
            <td colspan="10" class="px-4 py-6 text-center text-sm">
              Loading drones&hellip;
            </td>
          </tr>

          <tr v-else-if="!drones.length" class="border-t border-white/5 text-neutral-400">
            <td colspan="10" class="px-4 py-6 text-center text-sm">
              No drones match the current filters.
            </td>
          </tr>

          <tr
            v-for="drone in drones"
            :key="drone.id"
            :class="[
              'border-t border-white/5 transition hover:bg-white/5 focus-within:bg-white/10',
              selectedIds.has(drone.id) ? 'bg-primary-500/10' : ''
            ]"
          >
            <td class="px-4 py-4">
              <input
                type="checkbox"
                :checked="selectedIds.has(drone.id)"
                @change="handleToggle(drone.id)"
                class="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                :aria-label="`Select drone ${drone.displayName}`"
              />
            </td>
            <td class="px-4 py-4 font-semibold">
              {{ drone.id }}
            </td>
            <td class="px-4 py-4 font-semibold">
              {{ drone.displayName }}
            </td>
            <td class="px-4 py-4 font-mono text-xs">
              {{ drone.macAddress }}
            </td>
            <td class="px-4 py-4">
              {{ drone.serialNumber || '—' }}
            </td>
            <td class="px-4 py-4">
              {{ drone.uasId || '—' }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-neutral-200">
              {{ formatTimestamp(drone.firstSeen) }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-neutral-200">
              {{ drone.lastSeen ? formatTimestamp(drone.lastSeen) : '—' }}
            </td>
            <td class="px-4 py-4">
              <StatusBadge :status="drone.isActive ? 'active' : 'inactive'" />
            </td>
            <td class="px-4 py-4 flex justify-end gap-2">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                @click="emit('show-details', drone)"
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
import type { DroneItem, DroneSortField } from '@/types/drones'
import StatusBadge from '@/views/detections/components/StatusBadge.vue'
import SortIcon from '@/views/detections/components/SortIcon.vue'

const props = defineProps<{
  drones: DroneItem[]
  isLoading: boolean
  sortField: DroneSortField | null
  sortDirection: 'asc' | 'desc'
  selectedIds: Set<number>
}>()

const emit = defineEmits<{
  (e: 'change-sort', value: DroneSortField): void
  (e: 'show-details', drone: DroneItem): void
  (e: 'toggle-selection', droneId: number): void
  (e: 'toggle-select-all', checked: boolean): void
}>()

const emitSort = (field: DroneSortField) => {
  emit('change-sort', field)
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const sortDirectionLabel = computed(() => (props.sortDirection === 'asc' ? 'ascending' : 'descending'))

const allSelected = computed(() => {
  if (props.drones.length === 0) return false
  return props.drones.every(drone => props.selectedIds.has(drone.id))
})

const someSelected = computed(() => {
  if (props.drones.length === 0) return false
  const selectedCount = props.drones.filter(drone => props.selectedIds.has(drone.id)).length
  return selectedCount > 0 && selectedCount < props.drones.length
})

const handleToggle = (droneId: number) => {
  emit('toggle-selection', droneId)
}

const handleSelectAllChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('toggle-select-all', target.checked)
}
</script>


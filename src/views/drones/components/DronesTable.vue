<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between pb-3">
      <p class="text-sm text-neutral-400" role="status">
        <template v-if="pagination">
          Showing
          <span class="font-semibold text-white">{{ paginationStart }}-{{ paginationEnd }}</span>
          of
          <span class="font-semibold text-white">{{ paginationTotalItems }}</span>
          detections
        </template>
        <template v-else>
          Showing
          <span class="font-semibold text-white">{{ rows.length }}</span>
          detections
        </template>
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
                aria-label="Select all"
              />
            </th>
            <th scope="col" class="px-4 py-3">Detection type</th>
            <th scope="col" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1" @click="emitSort('id')" :aria-label="`Sort by ID (${sortDirectionLabel})`">
                ID
                <SortIcon :active="sortField === 'id'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-1"
                @click="emitSort('manufacturer')"
                :aria-label="`Sort by manufacturer (${sortDirectionLabel})`"
              >
                Manufacturer
                <SortIcon :active="sortField === 'manufacturer'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-1"
                @click="emitSort('modelName')"
                :aria-label="`Sort by model (${sortDirectionLabel})`"
              >
                Model
                <SortIcon :active="sortField === 'modelName'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-1"
                @click="emitSort('serialNumber')"
                :aria-label="`Sort by serial number (${sortDirectionLabel})`"
              >
                Serial Number
                <SortIcon :active="sortField === 'serialNumber'" :direction="sortDirection" />
              </button>
            </th>
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
              <button type="button" class="flex items-center gap-1" @click="emitSort('time')" :aria-label="`Sort by time (${sortDirectionLabel})`">
                Time
                <SortIcon :active="sortField === 'time'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3">Altitude</th>
            <th scope="col" class="px-4 py-3">Status</th>
            <th scope="col" class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-1"
                @click="emitSort('systemId')"
                :aria-label="`Sort by sensor (${sortDirectionLabel})`"
              >
                Sensor
                <SortIcon :active="sortField === 'systemId'" :direction="sortDirection" />
              </button>
            </th>
            <th scope="col" class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="!rows.length" class="border-t border-white/5 text-neutral-400">
            <td colspan="13" class="px-4 py-6 text-center text-sm">
              No detections match the current filters.
            </td>
          </tr>

          <tr
            v-for="row in rows"
            :key="row.rowKey"
            :class="[
              'border-t border-white/5 transition hover:bg-white/5 focus-within:bg-white/10',
              selectedRowKeys.has(row.rowKey) ? 'bg-primary-500/10' : ''
            ]"
          >
            <td class="px-4 py-4">
              <input
                type="checkbox"
                :checked="selectedRowKeys.has(row.rowKey)"
                @change="handleToggle(row.rowKey)"
                class="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                :aria-label="`Select row ${row.rowKey}`"
              />
            </td>
            <td class="px-4 py-4 font-semibold">
              {{ row.source === 'position' ? 'Position' : 'RF' }}
            </td>
            <td class="px-4 py-4 font-semibold">
              {{ row.drone ? row.drone.id : (row.source === 'rf' ? `RF-${row.id}` : '—') }}
            </td>
            <td class="px-4 py-4 font-semibold">
              {{ row.drone?.manufacturer ?? '—' }}
            </td>
            <td class="px-4 py-4">
              {{ row.drone?.modelName ?? '—' }}
            </td>
            <td class="px-4 py-4">
              {{ row.drone?.serialNumber ?? '—' }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-neutral-200">
              {{ row.drone ? formatTimestamp(row.drone.firstSeen) : '—' }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-neutral-200">
              {{ row.drone?.lastSeen ? formatTimestamp(row.drone.lastSeen) : '—' }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-neutral-200">
              {{ formatTimestamp(row.time) }}
            </td>
            <td class="px-4 py-4">
              {{ formatAltitude(row.altitude) }}
            </td>
            <td class="px-4 py-4">
              <template v-if="row.source === 'rf' && row.detectionStatus !== undefined && row.detectionStatus !== null">
                {{ row.detectionStatus ? 'Detect' : '—' }}
              </template>
              <span v-else-if="row.source === 'position'">Position</span>
              <span v-else class="text-neutral-500">—</span>
            </td>
            <td class="px-4 py-4">
              <button
                v-if="row.systemId"
                type="button"
                class="inline-flex items-center rounded-md bg-primary-500/10 px-2 py-1 text-xs font-mono text-primary-300 underline-offset-2 hover:bg-primary-500/20 hover:underline"
                @click="goToSensor(row)"
              >
                {{ row.systemId }}
              </button>
              <span v-else class="text-neutral-500">—</span>
            </td>
            <td class="px-4 py-4 flex justify-end gap-2">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                @click="emit('show-details', row)"
              >
                Details
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Controls -->
    <div v-if="pagination" class="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
      <div class="flex items-center gap-3">
        <label class="text-xs text-neutral-400">
          Rows per page:
          <select
            :value="unwrapValue(pagination.pageSize)"
            @change="handlePageSizeChange"
            class="ml-2 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white focus:border-primary-400 focus:outline-none"
          >
            <option class="text-neutral-900" value="25">25</option>
            <option class="text-neutral-900" value="50">50</option>
            <option class="text-neutral-900" value="100">100</option>
            <option class="text-neutral-900" value="200">200</option>
          </select>
        </label>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="hasMultiplePages"
          type="button"
          :disabled="unwrapValue(pagination.currentPage) === 1"
          class="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          @click="pagination.setPage(unwrapValue(pagination.currentPage) - 1)"
        >
          Previous
        </button>

        <div v-if="hasMultiplePages" class="flex items-center gap-1">
          <template v-for="page in visiblePages" :key="page">
            <button
              v-if="typeof page === 'number'"
              type="button"
              :class="[
                'min-w-[2rem] rounded px-2 py-1 text-xs font-medium transition',
                page === unwrapValue(pagination.currentPage)
                  ? 'bg-primary-500 text-white'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              ]"
              @click="pagination.setPage(page)"
            >
              {{ page }}
            </button>
            <span v-else class="px-1 text-neutral-400">...</span>
          </template>
        </div>

        <button
          v-if="hasMultiplePages"
          type="button"
          :disabled="unwrapValue(pagination.currentPage) === unwrapValue(pagination.totalPages)"
          class="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          @click="pagination.setPage(unwrapValue(pagination.currentPage) + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DroneSortField, UnifiedDetectionRow } from '@/types/drones'
import SortIcon from '@/components/shared/SortIcon.vue'

interface PaginationControls {
  currentPage: number | { value: number }
  pageSize: number | { value: number }
  totalPages: number | { value: number }
  totalItems: number | { value: number }
  setPage: (page: number) => void
  setPageSize: (size: number) => void
}

const props = defineProps<{
  rows: UnifiedDetectionRow[]
  isLoading: boolean
  sortField: DroneSortField | null
  sortDirection: 'asc' | 'desc'
  selectedRowKeys: Set<string>
  pagination?: PaginationControls
}>()

const unwrapValue = (value: unknown): number => {
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return Number((value as { value: unknown }).value)
  }
  return Number(value)
}

const router = useRouter()

const emit = defineEmits<{
  (e: 'change-sort', value: DroneSortField): void
  (e: 'show-details', row: UnifiedDetectionRow): void
  (e: 'toggle-selection', rowKey: string): void
  (e: 'toggle-select-all', checked: boolean): void
}>()

const emitSort = (field: DroneSortField) => {
  emit('change-sort', field)
}

const goToSensor = (row: UnifiedDetectionRow) => {
  if (!row.systemId) return
  router.push({
    path: '/map',
    query: {
      systemId: String(row.systemId)
    }
  })
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatAltitude = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`
  return `${value.toFixed(0)} m`
}

const sortDirectionLabel = computed(() => (props.sortDirection === 'asc' ? 'ascending' : 'descending'))

const allSelected = computed(() => {
  if (props.rows.length === 0) return false
  return props.rows.every(row => props.selectedRowKeys.has(row.rowKey))
})

const someSelected = computed(() => {
  if (props.rows.length === 0) return false
  const selectedCount = props.rows.filter(row => props.selectedRowKeys.has(row.rowKey)).length
  return selectedCount > 0 && selectedCount < props.rows.length
})

const handleToggle = (rowKey: string) => {
  emit('toggle-selection', rowKey)
}

const handleSelectAllChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('toggle-select-all', target.checked)
}

const paginationTotalItems = computed(() => {
  if (!props.pagination) return 0
  return unwrapValue(props.pagination.totalItems)
})

const paginationStart = computed(() => {
  if (!props.pagination) return 0
  const currentPage = unwrapValue(props.pagination.currentPage)
  const pageSize = unwrapValue(props.pagination.pageSize)
  if (!Number.isFinite(currentPage) || !Number.isFinite(pageSize) || currentPage < 1 || pageSize < 1) {
    return 1
  }
  return (currentPage - 1) * pageSize + 1
})

const paginationEnd = computed(() => {
  if (!props.pagination) return 0
  const currentPage = unwrapValue(props.pagination.currentPage)
  const pageSize = unwrapValue(props.pagination.pageSize)
  const totalItems = unwrapValue(props.pagination.totalItems)
  if (!Number.isFinite(currentPage) || !Number.isFinite(pageSize) || !Number.isFinite(totalItems)) {
    return 0
  }
  return Math.min(currentPage * pageSize, totalItems)
})

const hasMultiplePages = computed(() => {
  if (!props.pagination) return false
  const totalPages = unwrapValue(props.pagination.totalPages)
  return totalPages > 1
})

const visiblePages = computed(() => {
  if (!props.pagination) return []
  const currentPage = unwrapValue(props.pagination.currentPage)
  const totalPages = unwrapValue(props.pagination.totalPages)
  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage <= 4) {
      for (let i = 2; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages)
    } else if (currentPage >= totalPages - 3) {
      pages.push('...')
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages)
    }
  }
  return pages
})

const handlePageSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newSize = parseInt(target.value, 10)
  if (props.pagination && !isNaN(newSize)) {
    props.pagination.setPageSize(newSize)
  }
}
</script>




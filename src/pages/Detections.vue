<template>
  <LayoutWrapper>
    <template #content>
      <section class="flex h-full flex-col bg-neutral-950 text-white">
        <header class="border-b border-white/5 px-6 py-5 lg:px-8">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-primary-300/80">Operations</p>
              <h1 class="text-2xl font-semibold text-white">Detections</h1>
              <p class="text-sm text-neutral-400">
                Live and recent detections pulled directly from the mission database
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button
                v-if="selectedDronesForReport.length > 0 && hasPermission('detections.manage')"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-primary-500/50 bg-primary-500/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                @click="openReportModal"
                :disabled="isLoading"
              >
                <PhFileText :size="16" weight="bold" />
                Generate Report ({{ selectedDronesForReport.length }})
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                @click="refresh"
                :disabled="isLoading"
              >
                <span
                  v-if="isLoading"
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Refresh
              </button>
              <p class="text-xs text-neutral-400">
                <span class="font-medium text-white">{{ filteredCount }}</span>
                of
                <span class="font-medium text-white">{{ totalCount }}</span>
                detections
              </p>
            </div>
          </div>
        </header>

        <div class="border-b border-white/5 bg-neutral-900/40 px-6 py-4 lg:px-8">
          <DronesFilters
            v-model:search="filterSearch"
            v-model:type="filterType"
            v-model:status="filterStatus"
            v-model:time-window="filterTimeWindow"
            v-model:system-id="filterSystemId"
            :sensors="availableSensors"
            :is-loading="isLoading"
          />
        </div>

        <div class="flex-1 overflow-hidden px-4 py-4 lg:px-8">
          <div class="relative flex h-full flex-col gap-4 lg:flex-row">
            <div
              class="flex-1 min-w-0 overflow-auto rounded-2xl border border-white/5 bg-neutral-900/30 p-4 shadow-lg shadow-black/30"
              :class="tableContainerClass"
            >
              <div
                v-if="error"
                class="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100"
                role="alert"
              >
                <p class="font-medium text-rose-50">Unable to load detections</p>
                <p class="text-rose-200/80">{{ error }}</p>
                <button
                  type="button"
                  class="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-500/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-50 transition hover:border-rose-400"
                  @click="refresh"
                >
                  Retry
                </button>
              </div>

              <DronesTable
                :rows="paginatedRows"
                :is-loading="isLoading"
                :sort-field="sortField"
                :sort-direction="sortDirection"
                :selected-row-keys="selectedRowKeys"
                :pagination="{
                  currentPage,
                  pageSize,
                  totalPages,
                  totalItems: filteredCount,
                  setPage,
                  setPageSize
                }"
                @change-sort="setSort"
                @show-details="handleShowDetails"
                @toggle-selection="handleToggleSelection"
                @toggle-select-all="handleToggleSelectAll"
              />
            </div>
            <transition name="slide-in">
              <DroneDetailsPanel
                v-if="panelVisible"
                class="w-full flex-shrink-0 overflow-hidden lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:w-[28rem]"
                :visible="panelVisible"
                :drone="selectedDrone"
                :detection-coords="selectedDetectionCoords"
                :detection="selectedRow"
                @close="closeDetails"
              />
            </transition>
          </div>
        </div>
      </section>

      <!-- Report Generation Modal -->
      <ReportModal
        v-if="showReportModal"
        :selected-drone-ids="selectedDronesForReport.map(d => d.id)"
        :visible="showReportModal"
        @close="closeReportModal"
        @report-generated="handleReportGenerated"
      />
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { usePermissions } from '@/composables/usePermissions'
import { useMergedDetections } from '@/composables/useMergedDetections'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import DronesFilters from '@/views/drones/components/DronesFilters.vue'
import DronesTable from '@/views/drones/components/DronesTable.vue'
import DroneDetailsPanel from '@/views/drones/components/DroneDetailsPanel.vue'
import ReportModal from '@/views/drones/components/ReportModal.vue'
import { PhFileText } from '@phosphor-icons/vue'
import type { DroneItem, DroneSortField, UnifiedDetectionRow } from '@/types/drones'
import type { DetectionTypeFilter } from '@/views/drones/components/DronesFilters.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
useAuth()
const { hasPermission } = usePermissions()

const {
  mergedDetections,
  isLoading,
  error,
  refresh
} = useMergedDetections({
  refreshInterval: 30000,
  enabled: true
})

const filterSearch = ref('')
const filterType = ref<DetectionTypeFilter>('all')
const filterStatus = ref<'all' | 'active' | 'inactive'>('all')
const filterTimeWindow = ref<number | null>(null)
const filterSystemId = ref<string | null>(null)
const sortField = ref<DroneSortField | null>('time')
const sortDirection = ref<'asc' | 'desc'>('desc')

const setSort = (field: DroneSortField) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

const matchesSearch = (row: UnifiedDetectionRow, search: string): boolean => {
  if (!search.trim()) return true
  const q = search.trim().toLowerCase()
  if (row.drone) {
    const d = row.drone
    return (
      String(d.id).toLowerCase().includes(q) ||
      (d.displayName?.toLowerCase().includes(q) ?? false) ||
      (d.serialNumber?.toLowerCase().includes(q) ?? false) ||
      (d.macAddress?.toLowerCase().includes(q) ?? false) ||
      (d.uasId?.toLowerCase().includes(q) ?? false)
    )
  }
  return row.rowKey.toLowerCase().includes(q) || String(row.id).includes(q)
}

const matchesStatus = (row: UnifiedDetectionRow, status: 'all' | 'active' | 'inactive'): boolean => {
  if (status === 'all') return true
  if (!row.drone) return true
  return status === 'active' ? row.drone.isActive : !row.drone.isActive
}

const matchesType = (row: UnifiedDetectionRow, type: DetectionTypeFilter): boolean => {
  if (type === 'all') return true
  return type === 'position' ? row.source === 'position' : row.source === 'rf'
}

const matchesTimeWindow = (row: UnifiedDetectionRow, minutes: number | null): boolean => {
  if (minutes === null || !Number.isFinite(minutes)) return true
  const t = new Date(row.time).getTime()
  if (!Number.isFinite(t)) return true
  const cutoff = Date.now() - minutes * 60 * 1000
  return t >= cutoff
}

const matchesSystemId = (row: UnifiedDetectionRow, systemId: string | null): boolean => {
  if (systemId === null || systemId === '') return true
  return (row.systemId ?? '') === systemId
}

const availableSensors = computed(() => {
  const ids = new Set<string>()
  mergedDetections.value.forEach(row => {
    if (row.systemId) ids.add(String(row.systemId))
  })
  const q = route.query
  if (q.systemId && String(q.systemId).trim()) ids.add(String(q.systemId).trim())
  if (q.sensorId && String(q.sensorId).trim()) ids.add(String(q.sensorId).trim())
  return Array.from(ids).sort()
})

const filteredRows = computed(() => {
  const list = mergedDetections.value
  const search = typeof filterSearch.value === 'string' ? filterSearch.value : ''
  const status = filterStatus.value ?? 'all'
  const type = filterType.value ?? 'all'
  const timeWindow = filterTimeWindow.value ?? null
  const systemId = filterSystemId.value ?? null
  let rows = list.filter(
    row =>
      matchesSearch(row, search) &&
      matchesStatus(row, status) &&
      matchesType(row, type) &&
      matchesTimeWindow(row, timeWindow) &&
      matchesSystemId(row, systemId)
  )
  const field = sortField.value
  const dir = sortDirection.value
  if (field) {
    rows = [...rows].sort((a, b) => {
      let cmp = 0
      switch (field) {
        case 'time':
          cmp = new Date(a.time).getTime() - new Date(b.time).getTime()
          break
        case 'id':
          cmp = (a.drone?.id ?? a.id) - (b.drone?.id ?? b.id)
          break
        case 'manufacturer':
          cmp = (a.drone?.manufacturer ?? '').localeCompare(b.drone?.manufacturer ?? '')
          break
        case 'modelName':
          cmp = (a.drone?.modelName ?? '').localeCompare(b.drone?.modelName ?? '')
          break
        case 'serialNumber':
          cmp = (a.drone?.serialNumber ?? '').localeCompare(b.drone?.serialNumber ?? '')
          break
        case 'firstSeen':
          cmp = new Date(a.drone?.firstSeen ?? 0).getTime() - new Date(b.drone?.firstSeen ?? 0).getTime()
          break
        case 'lastSeen':
          cmp = new Date(a.drone?.lastSeen ?? 0).getTime() - new Date(b.drone?.lastSeen ?? 0).getTime()
          break
        case 'systemId':
          cmp = (a.systemId ?? '').localeCompare(b.systemId ?? '')
          break
        default:
          break
      }
      return dir === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const totalCount = computed(() => mergedDetections.value.length)
const filteredCount = computed(() => filteredRows.value.length)

const pageSize = ref(50)
const currentPage = ref(1)
const totalPages = computed(() => {
  const total = filteredRows.value.length
  const size = Math.max(1, pageSize.value)
  return Math.ceil(total / size) || 1
})
const paginatedRows = computed(() => {
  const list = filteredRows.value
  const size = Math.max(1, pageSize.value)
  const start = (Math.max(1, currentPage.value) - 1) * size
  return list.slice(start, start + size)
})
const paginationStart = computed(() => {
  const total = filteredRows.value.length
  if (total === 0) return 0
  const size = Math.max(1, pageSize.value)
  const page = Math.max(1, currentPage.value)
  return (page - 1) * size + 1
})
const paginationEnd = computed(() => {
  const total = filteredRows.value.length
  const size = Math.max(1, pageSize.value)
  const page = Math.max(1, currentPage.value)
  return Math.min(page * size, total)
})
const hasMultiplePages = computed(() => totalPages.value > 1)
const setPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}
const setPageSize = (size: number) => {
  pageSize.value = Math.max(25, Math.min(200, size))
  currentPage.value = 1
}

watch(totalPages, (pages) => {
  if (currentPage.value > pages && pages >= 1) {
    currentPage.value = pages
  }
})

const selectedRowKeys = ref<Set<string>>(new Set())
const selectedDronesForReport = computed(() => {
  const seen = new Set<number>()
  return filteredRows.value
    .filter(row => {
      if (!selectedRowKeys.value.has(row.rowKey) || !row.drone) return false
      if (seen.has(row.drone.id)) return false
      seen.add(row.drone.id)
      return true
    })
    .map(row => row.drone as DroneItem)
})

const selectedDrone = ref<DroneItem | null>(null)
const selectedRow = ref<UnifiedDetectionRow | null>(null)
const panelVisible = ref(false)

const selectedDetectionCoords = computed(() => {
  const row = selectedRow.value
  if (row?.latitude == null || row?.longitude == null) return null
  const lat = Number(row.latitude)
  const lng = Number(row.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
})

const handleShowDetails = (row: UnifiedDetectionRow) => {
  selectedDrone.value = row.drone ?? null
  selectedRow.value = row
  panelVisible.value = true
}

const closeDetails = () => {
  panelVisible.value = false
  selectedRow.value = null
}

const handleToggleSelection = (rowKey: string) => {
  if (selectedRowKeys.value.has(rowKey)) {
    selectedRowKeys.value.delete(rowKey)
  } else {
    selectedRowKeys.value.add(rowKey)
  }
}

const handleToggleSelectAll = (checked: boolean) => {
  const rows = paginatedRows.value
  if (checked) {
    rows.forEach(row => selectedRowKeys.value.add(row.rowKey))
  } else {
    rows.forEach(row => selectedRowKeys.value.delete(row.rowKey))
  }
}

const tableContainerClass = computed(() => {
  return panelVisible.value ? 'lg:pr-6 lg:mr-[30rem]' : ''
})

const showReportModal = ref(false)

const openReportModal = () => {
  if (selectedDronesForReport.value.length > 0) {
    showReportModal.value = true
  }
}

const closeReportModal = () => {
  showReportModal.value = false
}

const handleReportGenerated = () => {}

function applyRouteQueryToFilters() {
  const { systemId, sensorId, timeWindow, type, status, search } = route.query

  if (systemId) {
    filterSystemId.value = String(systemId)
  } else if (sensorId) {
    filterSystemId.value = String(sensorId)
  }

  if (timeWindow) {
    const min = parseInt(String(timeWindow), 10)
    if (!isNaN(min) && min > 0) {
      filterTimeWindow.value = min
    }
  }

  if (type === 'position' || type === 'rf') {
    filterType.value = type
  }
  if (status === 'active' || status === 'inactive') {
    filterStatus.value = status
  }
  if (typeof search === 'string' && search.trim()) {
    filterSearch.value = search.trim()
  }
}

onMounted(() => {
  applyRouteQueryToFilters()
})

watch(
  () => route.query,
  () => {
    applyRouteQueryToFilters()
  },
  { deep: true }
)

// Watch for data changes to handle auto-selection from route query
watch(filteredRows, (rows) => {
  const { droneId, detectionId } = route.query
  if ((!droneId && !detectionId) || panelVisible.value || rows.length === 0) return

  const targetRow = rows.find(row => {
    // Match by droneId if available (preferred for grouped rows)
    if (droneId && row.drone?.id === Number(droneId)) return true
    
    // Fallback to detectionId (for specific RF detections or if grouping logic matches)
    if (detectionId && String(row.id) === String(detectionId)) return true
    
    return false
  })

  if (targetRow) {
    handleShowDetails(targetRow)
  }
}, { immediate: true })
</script>

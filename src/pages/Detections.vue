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
                Live and recent RF detections pulled directly from the mission database
              </p>
            </div>
            <div class="flex items-center gap-3">
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
      <DetectionsFilters
        v-model:search="filterSearch"
        v-model:type="filterType"
        v-model:status="filterStatus"
        v-model:timeWindow="filterTimeWindow"
        v-model:zone="filterZone"
        v-model:sensorId="filterSensorId"
        v-model:systemId="filterSystemId"
        :is-loading="isLoading"
        :zones="availableZones"
        :sensors="availableSensors"
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

              <DetectionsTable
                :detections="paginatedDetections"
                :is-loading="isLoading"
                :sort-field="sortField"
                :sort-direction="sortDirection"
                :pagination="pagination"
                @change-sort="setSort"
                @show-details="handleShowDetails"
              />
            </div>
            <transition name="slide-in">
              <DetectionDetailsPanel
                v-if="panelVisible"
                class="w-full flex-shrink-0 overflow-hidden lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:w-[28rem]"
                :visible="panelVisible"
                :detection="selectedDetection"
                @close="closeDetails"
              />
            </transition>
          </div>
        </div>
      </section>
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useDetections } from '@/composables/useDetections'
import { useSensors } from '@/composables/useSensors'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import DetectionsFilters from '@/views/detections/components/DetectionsFilters.vue'
import DetectionsTable from '@/views/detections/components/DetectionsTable.vue'
import DetectionDetailsPanel from '@/views/detections/components/DetectionDetailsPanel.vue'
import type { DetectionItem } from '@/types/detections'

useAuth()
const route = useRoute()
const router = useRouter()

const {
  detections,
  filteredDetections,
  paginatedDetections,
  isLoading,
  error,
  filters,
  sort,
  pagination,
  refresh
} = useDetections({
  refreshInterval: 0, // Disabled auto-refresh
  enabled: true
})

const sortField = sort.field
const sortDirection = sort.direction
const setSort = sort.setSort

const filterSearch = filters.search
const filterType = filters.type
const filterStatus = filters.status
const filterTimeWindow = filters.timeWindow
const filterZone = filters.zone
const filterSensorId = filters.sensorId
const filterSystemId = filters.systemId

// Load sensors for filter dropdown
const { sensors } = useSensors({ enabled: true })
const availableSensors = computed(() => {
  return sensors.value.map(sensor => {
    const source = sensor.source as any
    return {
      id: sensor.id,
      name: sensor.name,
      systemId: source?.system_id ?? null,
      sensorId: source?.unit_id ?? source?.id ?? null
    }
  })
})

const totalCount = computed(() => detections.value.length)
const filteredCount = computed(() => filteredDetections.value.length)
const availableZones = computed(() => {
  const zones = new Set<string>()
  let hasUnassigned = false
  detections.value.forEach(detection => {
    if (detection.zone && detection.zone.trim().length > 0) {
      zones.add(detection.zone)
    } else {
      hasUnassigned = true
    }
  })
  const sortedZones = Array.from(zones).sort()
  if (hasUnassigned) {
    sortedZones.unshift('none')
  }
  return sortedZones
})

const selectedDetectionId = ref<number | null>(null)
const panelVisible = ref(false)

const selectedDetection = computed(() => {
  // First try to find in filtered detections (current view)
  const inFiltered = filteredDetections.value.find(detection => detection.id === selectedDetectionId.value)
  if (inFiltered) return inFiltered
  // Fallback to all detections
  return detections.value.find(detection => detection.id === selectedDetectionId.value) ?? null
})

const handleShowDetails = (detection: DetectionItem) => {
  selectedDetectionId.value = detection.id
  panelVisible.value = true
}

const closeDetails = () => {
  panelVisible.value = false
}

const tableContainerClass = computed(() => {
  return panelVisible.value ? 'lg:pr-6 lg:mr-[30rem]' : ''
})

// Function to apply query params to filters
const applyQueryParams = async () => {
  const sensorId = route.query.sensorId as string | undefined
  const systemId = route.query.systemId as string | undefined
  const detectionId = route.query.detectionId as string | undefined
  const timeWindow = route.query.timeWindow as string | undefined
  
  let filtersChanged = false
  
  // Apply sensor filter - prioritize systemId over sensorId
  if (systemId) {
    if (filterSystemId.value !== systemId) {
      filterSystemId.value = systemId
      filterSensorId.value = null
      filtersChanged = true
    }
  } else if (sensorId) {
    if (filterSensorId.value !== sensorId) {
      filterSensorId.value = sensorId
      filterSystemId.value = null
      filtersChanged = true
    }
  }
  
  // Apply time window filter (convert from minutes to the format used by filters)
  if (timeWindow) {
    const timeWindowMinutes = Number(timeWindow)
    if (!Number.isNaN(timeWindowMinutes) && timeWindowMinutes > 0) {
      if (filterTimeWindow.value !== timeWindowMinutes) {
        filterTimeWindow.value = timeWindowMinutes
        filtersChanged = true
      }
    }
  }
  
  // Force refresh if filters changed
  if (filtersChanged) {
    await refresh()
  }
  
  // Show detection details panel if detectionId is provided
  if (detectionId) {
    const id = Number(detectionId)
    if (!Number.isNaN(id)) {
      selectedDetectionId.value = id
      
      // Function to check and show the panel
      const showPanel = () => {
        // Check in all possible locations
        const detection = paginatedDetections.value.find(d => d.id === id) ||
                         filteredDetections.value.find(d => d.id === id) ||
                         detections.value.find(d => d.id === id)
        
        if (detection) {
          panelVisible.value = true
          return true
        }
        return false
      }
      
      // Try immediately (in case data is already loaded)
      if (showPanel()) {
        return // Panel is shown, we're done
      }
      
      // If not found immediately, wait for data to load
      // Watch for when loading completes
      const checkAfterLoad = () => {
        if (!isLoading.value) {
          // Data has finished loading, try to show panel
          if (!showPanel()) {
            // Still not found, wait a bit more for filters to apply
            setTimeout(() => {
              if (!showPanel()) {
                console.warn(`[Detections] Detection ${id} not found after applying filters`)
              }
            }, 500)
          }
        } else {
          // Still loading, check again
          setTimeout(checkAfterLoad, 200)
        }
      }
      
      // Start checking after a short delay
      setTimeout(checkAfterLoad, 100)
    }
  }
}

// Apply query params on mount
onMounted(() => {
  applyQueryParams()
})

// Watch for route query changes (e.g., when navigating with query params)
// Use immediate: false to avoid double execution on mount
watch(() => route.query, () => {
  applyQueryParams()
}, { deep: true, immediate: false })
</script>


<template>
  <LayoutWrapper>
    <template #content>
      <section class="flex h-full flex-col bg-neutral-950 text-white">
        <header class="border-b border-white/5 px-6 py-5 lg:px-8">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-primary-300/80">Operations</p>
              <h1 class="text-2xl font-semibold text-white">Drones</h1>
              <p class="text-sm text-neutral-400">
                Manage and generate reports for all registered drones
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button
                v-if="selectedDrones.length > 0"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-primary-500/50 bg-primary-500/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                @click="openReportModal"
                :disabled="isLoading"
              >
                <PhFileText :size="16" weight="bold" />
                Generate Report ({{ selectedDrones.length }})
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
                drones
              </p>
            </div>
          </div>
        </header>

        <div class="border-b border-white/5 bg-neutral-900/40 px-6 py-4 lg:px-8">
          <DronesFilters
            v-model:search="filterSearch"
            v-model:status="filterStatus"
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
                <p class="font-medium text-rose-50">Unable to load drones</p>
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
                :drones="filteredDrones"
                :is-loading="isLoading"
                :sort-field="sortField"
                :sort-direction="sortDirection"
                :selected-ids="selectedDroneIds"
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
                @close="closeDetails"
              />
            </transition>
          </div>
        </div>
      </section>

      <!-- Report Generation Modal -->
      <ReportModal
        v-if="showReportModal"
        :selected-drone-ids="selectedDrones.map(d => d.id)"
        :visible="showReportModal"
        @close="closeReportModal"
        @report-generated="handleReportGenerated"
      />
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useDrones } from '@/composables/useDrones'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import DronesFilters from '@/views/drones/components/DronesFilters.vue'
import DronesTable from '@/views/drones/components/DronesTable.vue'
import DroneDetailsPanel from '@/views/drones/components/DroneDetailsPanel.vue'
import ReportModal from '@/views/drones/components/ReportModal.vue'
import { PhFileText } from '@phosphor-icons/vue'
import type { DroneItem } from '@/types/drones'

useAuth()

const {
  drones,
  filteredDrones,
  isLoading,
  error,
  filters,
  sort,
  refresh
} = useDrones({
  refreshInterval: 30000, // 30 seconds
  enabled: true
})

const sortField = sort.field
const sortDirection = sort.direction
const setSort = sort.setSort

const filterSearch = filters.search
const filterStatus = filters.status

const totalCount = computed(() => drones.value.length)
const filteredCount = computed(() => filteredDrones.value.length)

const selectedDroneIds = ref<Set<number>>(new Set())
const selectedDrones = computed(() => {
  return drones.value.filter(drone => selectedDroneIds.value.has(drone.id))
})

const selectedDroneId = ref<number | null>(null)
const panelVisible = ref(false)

const selectedDrone = computed(() => {
  return drones.value.find(drone => drone.id === selectedDroneId.value) ?? null
})

const handleShowDetails = (drone: DroneItem) => {
  selectedDroneId.value = drone.id
  panelVisible.value = true
}

const closeDetails = () => {
  panelVisible.value = false
}

const handleToggleSelection = (droneId: number) => {
  if (selectedDroneIds.value.has(droneId)) {
    selectedDroneIds.value.delete(droneId)
  } else {
    selectedDroneIds.value.add(droneId)
  }
}

const handleToggleSelectAll = (checked: boolean) => {
  if (checked) {
    filteredDrones.value.forEach(drone => {
      selectedDroneIds.value.add(drone.id)
    })
  } else {
    filteredDrones.value.forEach(drone => {
      selectedDroneIds.value.delete(drone.id)
    })
  }
}

const tableContainerClass = computed(() => {
  return panelVisible.value ? 'lg:pr-6 lg:mr-[30rem]' : ''
})

const showReportModal = ref(false)

const openReportModal = () => {
  if (selectedDrones.value.length > 0) {
    showReportModal.value = true
  }
}

const closeReportModal = () => {
  showReportModal.value = false
}

const handleReportGenerated = () => {
  // Optionally clear selection after report generation
  // selectedDroneIds.value.clear()
}
</script>


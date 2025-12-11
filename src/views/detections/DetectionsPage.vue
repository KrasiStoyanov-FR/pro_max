<template>
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
            Auto-refresh every 5s &middot;
            <span class="font-medium text-white">{{ visibleCount }}</span>
            of
            <span class="font-medium text-white">{{ totalCount }}</span>
            detections
          </p>
        </div>
      </div>
    </header>

    <div class="border-b border-white/5 bg-neutral-900/40 px-6 py-4 lg:px-8">
      <DetectionsFilters
        v-model:search="filters.search"
        v-model:type="filters.type"
        v-model:status="filters.status"
        v-model:timeWindow="filters.timeWindow"
        v-model:zone="filters.zone"
        :is-loading="isLoading"
        :zones="availableZones"
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
          :detections="filteredDetections"
          :is-loading="isLoading"
          :sort-field="sortField"
          :sort-direction="sortDirection"
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

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDetections } from '@/composables/useDetections'
import DetectionsFilters from './components/DetectionsFilters.vue'
import DetectionsTable from './components/DetectionsTable.vue'
import DetectionDetailsPanel from './components/DetectionDetailsPanel.vue'
import type { DetectionItem } from '@/types/detections'

const {
  detections,
  filteredDetections,
  isLoading,
  error,
  filters,
  sort,
  refresh
} = useDetections({
  refreshInterval: 5000,
  enabled: true
})

const sortField = sort.field
const sortDirection = sort.direction
const setSort = sort.setSort

const totalCount = computed(() => detections.value.length)
const visibleCount = computed(() => filteredDetections.value.length)
const availableZones = computed(() => {
  const zones = new Set<string>()
  detections.value.forEach(detection => {
    if (detection.zone) {
      zones.add(detection.zone)
    }
  })
  return Array.from(zones).sort()
})

const selectedDetectionId = ref<number | null>(null)
const panelVisible = ref(false)

const selectedDetection = computed(() => {
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
</script>


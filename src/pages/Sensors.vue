<template>
  <LayoutWrapper>
    <template #content>
      <section class="flex h-full flex-col bg-neutral-950 text-white">
        <header class="border-b border-white/5 px-6 py-5 lg:px-8">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-primary-300/80">Operations</p>
              <h1 class="text-2xl font-semibold text-white">Sensors</h1>
              <p class="text-sm text-neutral-400">
                Fleet of receivers and detectors currently connected to the mission network
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
                Auto-refresh every 10s &middot;
                <span class="font-medium text-white">{{ sensors.length }}</span>
                sensors
              </p>
            </div>
          </div>
        </header>

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
                <p class="font-medium text-rose-50">Unable to load sensors</p>
                <p class="text-rose-200/80">{{ error }}</p>
                <button
                  type="button"
                  class="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-500/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-50 transition hover:border-rose-400"
                  @click="refresh"
                >
                  Retry
                </button>
              </div>

              <SensorsTable
                :sensors="sensors"
                :is-loading="isLoading"
                :selected-id="selectedSensorId"
                @show-details="handleShowDetails"
              />
            </div>

            <transition name="slide-in">
              <SensorDetailsPanel
                v-if="panelVisible"
                class="w-full flex-shrink-0 overflow-hidden lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:w-[28rem]"
                :visible="panelVisible"
                :sensor="selectedSensor"
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
import { computed, ref } from 'vue'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import SensorsTable from '@/views/sensors/components/SensorsTable.vue'
import SensorDetailsPanel from '@/views/sensors/components/SensorDetailsPanel.vue'
import { useSensors } from '@/composables/useSensors'
import type { SensorItem } from '@/types/sensors'
import { useAuth } from '@/composables/useAuth'

useAuth()

const { sensors, isLoading, error, refresh } = useSensors({
  refreshInterval: 10000,
  enabled: true
})

const selectedSensorId = ref<string | null>(null)
const panelVisible = ref(false)

const selectedSensor = computed(() => {
  return sensors.value.find(sensor => sensor.id === selectedSensorId.value) ?? null
})

const handleShowDetails = (sensor: SensorItem) => {
  selectedSensorId.value = sensor.id
  panelVisible.value = true
}

const closeDetails = () => {
  panelVisible.value = false
}

const tableContainerClass = computed(() => {
  return panelVisible.value ? 'lg:pr-6 lg:mr-[30rem]' : ''
})
</script>



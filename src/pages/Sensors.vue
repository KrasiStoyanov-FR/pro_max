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
                :logs="selectedSensorLogs"
                :logs-loading="receiverLogsLoading"
                :logs-error="receiverLogsError"
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import SensorsTable from '@/views/sensors/components/SensorsTable.vue'
import SensorDetailsPanel from '@/views/sensors/components/SensorDetailsPanel.vue'
import { useSensors } from '@/composables/useSensors'
import type { SensorItem } from '@/types/sensors'
import { useAuth } from '@/composables/useAuth'
import { useDataStore } from '@/store/data'
import type { ReceiverLog } from '@/types/database'

useAuth()

const { sensors, isLoading, error, refresh } = useSensors({
  refreshInterval: 10000,
  enabled: true
})

const dataStore = useDataStore()
const { receiverLogsList, loading: dataLoading, errors: dataErrors } = storeToRefs(dataStore)
const receiverLogs = computed<ReceiverLog[]>(() => receiverLogsList.value ?? [])
const receiverLogsLoading = computed(() => Boolean(dataLoading.value?.receiverLogs))
const receiverLogsError = computed(() => dataErrors.value?.receiverLogs ?? null)

const LOG_REFRESH_INTERVAL = 15000
let logsTimer: ReturnType<typeof setInterval> | null = null

const refreshLogs = async () => {
  try {
    await dataStore.fetchReceiverLogs(undefined, true)
  } catch (err) {
    console.error('[Sensors] Failed to refresh receiver logs', err)
  }
}

onMounted(() => {
  void refreshLogs()
  logsTimer = setInterval(() => {
    void refreshLogs()
  }, LOG_REFRESH_INTERVAL)
})

onBeforeUnmount(() => {
  if (logsTimer) {
    clearInterval(logsTimer)
    logsTimer = null
  }
})

const selectedSensorId = ref<string | null>(null)
const panelVisible = ref(false)

const selectedSensor = computed(() => {
  return sensors.value.find(sensor => sensor.id === selectedSensorId.value) ?? null
})

const selectedSensorLogs = computed(() => {
  const sensor = selectedSensor.value
  if (!sensor || !sensor.source) return []
  const systemId = (sensor.source as any)?.system_id
  if (!systemId) return []
  const targetId = String(systemId)

  return receiverLogs.value
    .filter(log => log.system_id && String(log.system_id) === targetId)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 20)
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



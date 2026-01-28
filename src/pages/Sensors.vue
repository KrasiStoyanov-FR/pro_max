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
                :deleting-id="deletingId"
                @show-details="handleShowDetails"
                @edit-sensor="handleEditSensor"
                @delete-sensor="handleDeleteSensor"
              />
            </div>

            <transition name="slide-in">
              <SensorDetailsPanel
                v-if="panelVisible"
                class="w-full flex-shrink-0 overflow-hidden lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:w-[28rem]"
                :visible="panelVisible"
                :sensor="selectedSensor"
                :detections="selectedSensorDetections"
                :detections-loading="detectionsLoading"
                :detections-error="detectionsError"
                @close="closeDetails"
                @show-detection="handleShowDetection"
              />
            </transition>
          </div>
        </div>
      </section>

      <!-- Device Edit/Create Modal -->
      <DeviceCreationModal
        :visible="isDeviceModalOpen"
        :device="editingDevice"
        @close="closeDeviceModal"
        @device-created="handleDeviceCreated"
        @device-updated="handleDeviceUpdated"
      />
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import SensorsTable from '@/views/sensors/components/SensorsTable.vue'
import SensorDetailsPanel from '@/views/sensors/components/SensorDetailsPanel.vue'
import DeviceCreationModal from '@/components/devices/DeviceCreationModal.vue'
import { useSensors } from '@/composables/useSensors'
import type { SensorItem } from '@/types/sensors'
import { useAuth } from '@/composables/useAuth'
import { usePermissions } from '@/composables/usePermissions'
import { useDataStore } from '@/store/data'
import type { GpsUnitPosition } from '@/types/database'
import type { DetectionItem } from '@/types/detections'
import { databaseApi } from '@/services/api'

const router = useRouter()
const route = useRoute()
import { useDetections } from '@/composables/useDetections'

useAuth()
const { hasPermission } = usePermissions()

// Static sensors - no periodic refresh needed
// When mobile sensors are added, enable refreshInterval
const { sensors, isLoading, error, refresh } = useSensors({
  refreshInterval: 0, // Disabled for static sensors
  enabled: true
})

const dataStore = useDataStore()
const { loading: dataLoading, errors: dataErrors } = storeToRefs(dataStore)

// Fetch detections for the sensor details panel
const { detections, isLoading: detectionsIsLoading, error: detectionsErr } = useDetections({
  refreshInterval: 10000, // Refresh every 10 seconds
  enabled: true
})

const detectionsLoading = computed(() => detectionsIsLoading.value)
const detectionsError = computed(() => detectionsErr.value ?? null)

const selectedSensorId = ref<string | null>(null)
const panelVisible = ref(false)
const deletingId = ref<string | null>(null)
const isDeviceModalOpen = ref(false)
const editingDevice = ref<GpsUnitPosition | null>(null)

const selectedSensor = computed(() => {
  return sensors.value.find(sensor => sensor.id === selectedSensorId.value) ?? null
})

const selectedSensorDetections = computed<DetectionItem[]>(() => {
  const sensor = selectedSensor.value
  if (!sensor || !sensor.source) return []
  
  // Try to match by system_id first
  const systemId = (sensor.source as any)?.system_id
  if (systemId) {
    const targetSystemId = String(systemId)
    return detections.value.filter(detection => 
      detection.systemId && String(detection.systemId) === targetSystemId
    )
  }
  
  // Fallback: try to match by sensor_id or unit_id
  const sensorId = (sensor.source as any)?.unit_id ?? (sensor.source as any)?.id
  if (sensorId) {
    const targetSensorId = String(sensorId)
    return detections.value.filter(detection => 
      detection.sensorId && String(detection.sensorId) === targetSensorId
    )
  }
  
  return []
})

const preselectSensorFromRoute = () => {
  const systemId = route.query.systemId as string | undefined
  if (!systemId) return

  const target = sensors.value.find(sensor => {
    const source = sensor.source as any
    return source?.system_id && String(source.system_id) === String(systemId)
  })

  if (target) {
    selectedSensorId.value = target.id
    panelVisible.value = true
  }
}

const handleShowDetails = (sensor: SensorItem) => {
  selectedSensorId.value = sensor.id
  panelVisible.value = true
}

const handleEditSensor = (sensor: SensorItem) => {
  // Check permission before allowing edit
  if (!hasPermission('sensors.edit')) {
    window.alert('You do not have permission to edit sensors.')
    return
  }

  // Get the source device data
  const source = sensor.source as any
  if (!source) {
    window.alert('Cannot edit: sensor data not available.')
    return
  }

  // Convert sensor source to GpsUnitPosition format
  editingDevice.value = {
    id: source.id ?? null,
    unit_id: source.unit_id ?? null,
    system_id: source.system_id ?? null,
    name: (source as any)?.unit_name ?? source.name ?? sensor.name,
    status: source.status ?? null,
    time: source.time ?? null,
    latitude: sensor.latitude ?? (source as any)?.gps_lat ?? source.latitude ?? null,
    longitude: sensor.longitude ?? (source as any)?.gps_lon ?? source.longitude ?? null,
    ...source
  } as GpsUnitPosition

  isDeviceModalOpen.value = true
}

const closeDeviceModal = () => {
  isDeviceModalOpen.value = false
  editingDevice.value = null
}

const handleDeviceCreated = async (createdDevice: GpsUnitPosition) => {
  // Refresh sensors list
  await refresh()
  closeDeviceModal()
}

const handleDeviceUpdated = async (updatedDevice: GpsUnitPosition) => {
  // Refresh sensors list
  await refresh()
  closeDeviceModal()
  
  // If the updated device was selected, update the selection
  if (selectedSensorId.value) {
    // The sensor list will refresh, so the selection should still work
    // But we might want to refresh the details panel if it's open
    if (panelVisible.value) {
      // Force a refresh of the selected sensor
      const sensor = sensors.value.find(s => s.id === selectedSensorId.value)
      if (sensor) {
        // The panel will automatically update when sensors refresh
      }
    }
  }
}

const handleDeleteSensor = async (sensor: SensorItem) => {
  // Check permission before allowing deletion
  if (!hasPermission('sensors.delete')) {
    window.alert('You do not have permission to delete sensors.')
    return
  }

  if (deletingId.value) return
  const confirmed = window.confirm(`Delete sensor "${sensor.name}"?`)
  if (!confirmed) return

  deletingId.value = sensor.id
  try {
    const source = sensor.source as any

    // For gps_unit_position, the real primary key is unit_id (not the synthetic sensor.id)
    const pkRaw = source?.unit_id
    if (pkRaw === null || pkRaw === undefined) {
      throw new Error('Cannot delete: this sensor has no unit_id from the database.')
    }
    const pk = pkRaw

    console.log('[Sensors] Deleting sensor using unit_id:', {
      sensorId: sensor.id,
      pk,
      sourceId: source?.id,
      sourceUnitId: source?.unit_id,
      sourceSystemId: source?.system_id,
      source
    })

    // Clear API cache first to ensure fresh data after deletion
    databaseApi.clearCache()

    // Delete from backend; backend auto-detects that unit_id is the PK for gps_unit_position
    const response = await databaseApi.deleteGpsUnitPosition(pk)
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete sensor')
    }

    console.log('[Sensors] Successfully deleted sensor:', pk, 'Deleted count:', response.data?.deleted)

    // Remove locally after successful deletion
    dataStore.removeGpsUnitPosition(pk)

    // Force refresh to get latest data (with cache cleared)
    await refresh()
  } catch (err: any) {
    console.error('[Sensors] Failed to delete sensor', err)
    window.alert(err?.message || 'Failed to delete sensor')
    // Refresh on error to restore state
    await refresh()
  } finally {
    deletingId.value = null
  }
}

const closeDetails = () => {
  panelVisible.value = false
}

const handleShowDetection = (detection: DetectionItem, timeWindowMinutes?: number) => {
  // Navigate to detections page with the detection ID, sensor filter, and time window
  const source = selectedSensor.value?.source as any
  const systemId = source?.system_id
  const sensorId = source?.unit_id ?? source?.id
  
  const query: Record<string, string> = {
    detectionId: String(detection.id)
  }
  if (systemId) {
    query.systemId = String(systemId)
  } else if (sensorId) {
    query.sensorId = String(sensorId)
  }
  
  // Add time window if provided
  if (timeWindowMinutes !== undefined && timeWindowMinutes > 0) {
    query.timeWindow = String(timeWindowMinutes)
  }
  
  router.push({
    path: '/detections',
    query
  })
}

const tableContainerClass = computed(() => {
  return panelVisible.value ? 'lg:pr-6 lg:mr-[30rem]' : ''
})

onMounted(() => {
  preselectSensorFromRoute()
})

watch(
  () => route.query.systemId,
  () => {
    preselectSensorFromRoute()
  }
)
</script>



<template>
  <Transition name="slide-up">
    <div
      v-if="selectedDetection"
      class="w-full bg-neutral-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl pointer-events-auto rounded-t-2xl"
      style="max-height: 40vh; min-height: 200px; z-index: 50;"
    >
      <div class="flex flex-col h-full max-h-[40vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-white/10">
          <div class="flex items-center space-x-3">
            <PhWifiHigh :size="20" class="text-yellow-400" />
            <div>
              <h3 class="text-lg font-semibold text-white">RF Detection Details</h3>
              <p class="text-xs text-primary-200">Detection #{{ selectedDetection.id }}</p>
            </div>
          </div>
          <button
            @click="closePanel"
            class="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close detection details"
          >
            <PhX :size="20" class="text-white" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Signal Information Cards -->
          <div v-if="selectedDetection.frequency !== null || selectedDetection.signalStrength !== null" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Frequency Card -->
            <div v-if="selectedDetection.frequency !== null" class="bg-white/5 rounded-lg p-4 border border-white/10">
              <div class="flex items-center space-x-2 mb-2">
                <PhWifiHigh :size="18" class="text-yellow-400" />
                <span class="text-xs text-primary-200 uppercase tracking-wide">Frequency</span>
              </div>
              <p class="text-2xl font-bold text-yellow-400">{{ formatFrequency(selectedDetection.frequency) }}</p>
              <p class="text-xs text-neutral-400 mt-1">Radio frequency band</p>
            </div>

            <!-- Signal Strength Card -->
            <div v-if="selectedDetection.signalStrength !== null" class="bg-white/5 rounded-lg p-4 border border-white/10">
              <div class="flex items-center space-x-2 mb-2">
                <PhWifiHigh :size="18" :class="getSignalStrengthColor(selectedDetection.signalStrength)" />
                <span class="text-xs text-primary-200 uppercase tracking-wide">Signal Strength</span>
              </div>
              <p class="text-2xl font-bold" :class="getSignalStrengthColor(selectedDetection.signalStrength)">
                {{ formatSignalStrength(selectedDetection.signalStrength) }}
              </p>
              <p class="text-xs text-neutral-400 mt-1">{{ getSignalStrengthLabel(selectedDetection.signalStrength) }}</p>
            </div>
          </div>

          <!-- Detection Metadata -->
          <div class="space-y-3">
            <div class="flex items-start space-x-3">
              <PhClock :size="16" class="text-primary-50 mt-0.5" />
              <div class="flex-1">
                <p class="text-xs text-primary-200 uppercase tracking-wide mb-1">Detection Time</p>
                <p class="text-sm text-white">{{ formatDetectionTimestamp(selectedDetection.timestamp) }}</p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <PhWarning :size="16" class="text-primary-50 mt-0.5" />
              <div class="flex-1">
                <p class="text-xs text-primary-200 uppercase tracking-wide mb-1">Detection Status</p>
                <p class="text-sm" :class="selectedDetection.status ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'">
                  {{ selectedDetection.status ? 'Active Detection' : 'Inactive Detection' }}
                </p>
              </div>
            </div>

            <div v-if="selectedDetection.droneId" class="flex items-start space-x-3">
              <PhPaperPlaneTilt :size="16" class="text-primary-50 mt-0.5" />
              <div class="flex-1">
                <p class="text-xs text-primary-200 uppercase tracking-wide mb-1">Drone ID</p>
                <p class="text-sm text-white">Drone {{ selectedDetection.droneId }}</p>
                <p v-if="relatedDrone" class="text-xs text-neutral-400 mt-0.5">{{ relatedDrone.title }}</p>
              </div>
            </div>

            <div v-if="selectedDetection.systemId" class="flex items-start space-x-3">
              <PhGear :size="16" class="text-primary-50 mt-0.5" />
              <div class="flex-1">
                <p class="text-xs text-primary-200 uppercase tracking-wide mb-1">Detector (System ID)</p>
                <p class="text-sm text-white">System {{ selectedDetection.systemId }}</p>
                <p v-if="relatedDetector" class="text-xs text-neutral-400 mt-0.5">{{ relatedDetector.title }}</p>
              </div>
            </div>
          </div>

          <!-- Signal Quality Indicator -->
          <div v-if="selectedDetection.signalStrength !== null" class="bg-white/5 rounded-lg p-4 border border-white/10">
            <p class="text-xs text-primary-200 uppercase tracking-wide mb-3">Signal Quality</p>
            <div class="flex items-center space-x-2">
              <div class="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  class="h-full transition-all duration-300"
                  :class="getSignalStrengthBarColor(selectedDetection.signalStrength)"
                  :style="{ width: `${getSignalStrengthPercentage(selectedDetection.signalStrength)}%` }"
                ></div>
              </div>
              <span class="text-xs text-neutral-400 min-w-[3rem] text-right">
                {{ getSignalStrengthPercentage(selectedDetection.signalStrength) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useMapStore } from '@/store/map'
import type { DetectionCheckpoint } from '@/types/map'
import { PhWifiHigh, PhX, PhClock, PhWarning, PhGear, PhPaperPlaneTilt } from '@phosphor-icons/vue'

interface Props {
  selectedDetection: DetectionCheckpoint | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const mapStore = useMapStore()

// Find related drone and detector pins for additional context
const relatedDrone = computed(() => {
  if (!props.selectedDetection?.droneId) return null
  const pins = mapStore.pins
  return pins.find(pin => 
    pin.type === 'drone' && 
    String(pin.data?.drone_id ?? '') === String(props.selectedDetection!.droneId)
  ) || null
})

const relatedDetector = computed(() => {
  if (!props.selectedDetection?.systemId) return null
  const pins = mapStore.pins
  return pins.find(pin => {
    const systemId = pin.data?.system_id
    const unitId = pin.data?.unit_id
    const targetSystemId = String(props.selectedDetection!.systemId)
    return pin.type === 'sensor' && (
      (systemId !== null && systemId !== undefined && String(systemId) === targetSystemId) ||
      (unitId !== null && unitId !== undefined && String(unitId) === targetSystemId)
    )
  }) || null
})

// Debug: Watch for selectedDetection changes
watch(() => props.selectedDetection, (detection) => {
  console.log('[DetectionDetailsPanel] selectedDetection changed:', {
    id: detection?.id,
    timestamp: detection?.timestamp,
    frequency: detection?.frequency,
    signalStrength: detection?.signalStrength,
    status: detection?.status,
    systemId: detection?.systemId,
    droneId: detection?.droneId,
    hasData: !!detection
  })
}, { immediate: true, deep: true })

const closePanel = () => {
  mapStore.setFocusedDetectionId(null)
  emit('close')
}

const formatFrequency = (frequency: number | null): string => {
  if (frequency === null || !Number.isFinite(frequency)) return 'N/A'
  if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(2)} GHz`
  }
  return `${frequency.toFixed(1)} MHz`
}

const formatSignalStrength = (signalStrength: number | null): string => {
  if (signalStrength === null || !Number.isFinite(signalStrength)) return 'N/A'
  return `${signalStrength.toFixed(1)} dBm`
}

const formatDetectionTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Invalid'
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

const getSignalStrengthColor = (signalStrength: number | null): string => {
  if (signalStrength === null || !Number.isFinite(signalStrength)) return 'text-neutral-400'
  if (signalStrength > -50) return 'text-green-400'
  if (signalStrength > -60) return 'text-green-300'
  if (signalStrength > -70) return 'text-yellow-400'
  if (signalStrength > -80) return 'text-orange-400'
  return 'text-red-400'
}

const getSignalStrengthLabel = (signalStrength: number | null): string => {
  if (signalStrength === null || !Number.isFinite(signalStrength)) return 'Unknown'
  if (signalStrength > -50) return 'Excellent signal'
  if (signalStrength > -60) return 'Good signal'
  if (signalStrength > -70) return 'Fair signal'
  if (signalStrength > -80) return 'Weak signal'
  return 'Very weak signal'
}

const getSignalStrengthBarColor = (signalStrength: number | null): string => {
  if (signalStrength === null || !Number.isFinite(signalStrength)) return 'bg-neutral-500'
  if (signalStrength > -50) return 'bg-green-500'
  if (signalStrength > -60) return 'bg-green-400'
  if (signalStrength > -70) return 'bg-yellow-500'
  if (signalStrength > -80) return 'bg-orange-500'
  return 'bg-red-500'
}

const getSignalStrengthPercentage = (signalStrength: number | null): number => {
  if (signalStrength === null || !Number.isFinite(signalStrength)) return 0
  // Normalize signal strength from -100 dBm (0%) to -30 dBm (100%)
  const min = -100
  const max = -30
  const normalized = ((signalStrength - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, Math.round(normalized)))
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>


<template>
  <div
    class="max-h-80 md:min-h-80 flex self-end rounded-2xl bg-neutral-900/70 backdrop-blur-3xl transition-all duration-300 ease-out pointer-events-auto overflow-hidden"
    :class="[
      // Size and visibility
      isOpen ? 'w-64 lg:w-80 opacity-100 visible translate-x-0 scale-100 pointer-events-auto' : 'w-0 opacity-0 -translate-x-full invisible scale-95 pointer-events-none',
      (!isOpen && hasClusterPanel) ? 'ml-0' : (isOpen && hasClusterPanel) ? 'ml-6' : '',
    ]" :style="{ transitionDelay: isOpen ? '50ms' : '0ms' }">

    <!-- Content wrapper with proper visibility control -->
    <div class="flex flex-col flex-1 min-w-0 transition-opacity duration-200 ease-out"
      :class="[isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none']"
      :style="{ transitionDelay: isOpen ? '150ms' : '0ms' }">
      <!-- Panel header -->
      <div class="p-4 border-b border-neutral-400">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">{{ selectedPin ? selectedPin.title : 'Select a Target' }}</h3>
          <button @click="$emit('close')"
            class="p-1 text-neutral-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded-md">
            <PhX :size="20" />
          </button>
        </div>
      </div>

      <!-- Panel content -->
      <div v-if="selectedPin" class="overflow-y-auto p-4">
        <!-- Target Type Badge -->
        <div class="mb-6">
          <div class="bg-neutral-900 border rounded-lg p-3 flex items-center space-x-3" :class="{
            'border-green-500': selectedPin.status === 'active',
            'border-yellow-500': selectedPin.status === 'warning',
            'border-red-500': selectedPin.status === 'critical',
            'border-neutral-500': selectedPin.status === 'inactive'
          }">
            <PhPaperPlaneTilt :size="24" :class="{
              'text-green-400': selectedPin.status === 'active',
              'text-yellow-400': selectedPin.status === 'warning',
              'text-red-400': selectedPin.status === 'critical',
              'text-neutral-400': selectedPin.status === 'inactive'
            }" />
            <div class="flex-1">
              <span class="text-white text-sm font-medium">{{ selectedPin.type.toUpperCase() }}</span>
              <p class="text-xs text-primary-200 mt-1">{{ selectedPin.description }}</p>
            </div>
            <span class="text-xs px-2 py-1 rounded uppercase font-semibold" :class="{
              'bg-green-500/20 text-green-400': selectedPin.status === 'active',
              'bg-yellow-500/20 text-yellow-400': selectedPin.status === 'warning',
              'bg-red-500/20 text-red-400': selectedPin.status === 'critical',
              'bg-neutral-500/20 text-neutral-400': selectedPin.status === 'inactive'
            }">
              {{ selectedPin.status }}
            </span>
          </div>
        </div>

        <!-- Target Details -->
        <div class="space-y-4">
          <div v-if="selectedPin.data?.serialNumber" class="flex items-start space-x-3">
            <PhIdentificationCard :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Serial Number</p>
              <p class="text-sm text-white">{{ selectedPin.data.serialNumber }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.altitude" class="flex items-start space-x-3">
            <PhCube :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Altitude</p>
              <p class="text-sm text-white">{{ selectedPin.data.altitude }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.uasId" class="flex items-start space-x-3">
            <PhCube :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">UAS ID</p>
              <p class="text-sm text-white">{{ selectedPin.data.uasId }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.speed" class="flex items-start space-x-3">
            <PhGauge :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Speed</p>
              <p class="text-sm text-white">{{ selectedPin.data.speed }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.signal" class="flex items-start space-x-3">
            <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Connection Signal</p>
              <p class="text-sm text-white">{{ selectedPin.data.signal }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.missionId" class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Mission ID</p>
              <p class="text-sm text-white">{{ selectedPin.data.missionId }}</p>
            </div>
          </div>

          <!-- Additional Data Fields -->
          <div v-if="selectedPin.data?.operator" class="flex items-start space-x-3">
            <PhIdentificationCard :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Operator</p>
              <p class="text-sm text-white">{{ selectedPin.data.operator }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.unit" class="flex items-start space-x-3">
            <PhCube :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Unit</p>
              <p class="text-sm text-white">{{ selectedPin.data.unit }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.mission" class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Mission</p>
              <p class="text-sm text-white">{{ selectedPin.data.mission }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.threatLevel" class="flex items-start space-x-3">
            <PhWarning :size="16" class="text-primary-50-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Threat Level</p>
              <p class="text-sm text-red-400 font-semibold">{{ selectedPin.data.threatLevel }}</p>
            </div>
          </div>

          <!-- Drone-specific fields -->
          <div v-if="selectedPin.data?.drone_id" class="flex items-start space-x-3">
            <PhCube :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Drone ID</p>
              <p class="text-sm text-white">{{ selectedPin.data.drone_id }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.model" class="flex items-start space-x-3">
            <PhCube :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Drone Model</p>
              <p class="text-sm text-white">{{ selectedPin.data.model }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.receiver_type" class="flex items-start space-x-3">
            <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Receiver Type</p>
              <p class="text-sm text-white">{{ selectedPin.data.receiver_type }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.frequency" class="flex items-start space-x-3">
            <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Frequency</p>
              <p class="text-sm text-white">{{ selectedPin.data.frequency }} MHz</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.signal_strength" class="flex items-start space-x-3">
            <PhWifiHigh :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Signal Strength</p>
              <p class="text-sm text-white">{{ selectedPin.data.signal_strength }} dBm</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.detection_status !== undefined" class="flex items-start space-x-3">
            <PhWarning :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Detection Status</p>
              <p class="text-sm" :class="selectedPin.data.detection_status ? 'text-green-400' : 'text-red-400'">
                {{ selectedPin.data.detection_status ? 'Active' : 'Inactive' }}
              </p>
            </div>
          </div>

          <div v-if="selectedPin.data?.battery" class="flex items-start space-x-3">
            <PhGauge :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Battery Level</p>
              <p class="text-sm text-white">{{ selectedPin.data.battery }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.flightTime" class="flex items-start space-x-3">
            <PhGauge :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Flight Time</p>
              <p class="text-sm text-white">{{ selectedPin.data.flightTime }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.payload" class="flex items-start space-x-3">
            <PhCube :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Payload</p>
              <p class="text-sm text-white">{{ selectedPin.data.payload }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.pilot" class="flex items-start space-x-3">
            <PhIdentificationCard :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Pilot</p>
              <p class="text-sm text-white">{{ selectedPin.data.pilot }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.destination" class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Destination</p>
              <p class="text-sm text-white">{{ selectedPin.data.destination }}</p>
            </div>
          </div>

          <div v-if="selectedPin.data?.zone" class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Operating Zone</p>
              <p class="text-sm text-white">{{ selectedPin.data.zone }}</p>
            </div>
          </div>

          <!-- Coordinates -->
          <div class="flex items-start space-x-3">
            <PhMapPin :size="16" class="text-primary-50 mt-0.5" />
            <div class="flex-1">
              <p class="text-xs text-primary-200 uppercase tracking-wide">Coordinates</p>
              <p class="text-sm text-white font-mono">{{ selectedPin.lat.toFixed(4) }}, {{ selectedPin.lng.toFixed(4) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <PhMapPin :size="48" class="text-primary-200 mx-auto mb-4" />
          <p class="text-white">Click on a marker to view details</p>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { PhX, PhPaperPlaneTilt, PhCube, PhGauge, PhIdentificationCard, PhWifiHigh, PhMapTrifold, PhMapPin, PhWarning } from '@phosphor-icons/vue'
import type { MapPin } from '@/types/map'

// Props
interface Props {
  isOpen: boolean
  selectedPin: MapPin | null
  hasClusterPanel?: boolean
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  close: []
  'pin-deselected': []
}>()
</script>

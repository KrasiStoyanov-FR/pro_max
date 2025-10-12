<template>
  <div
    class="flex justify-end absolute top-0 right-0 bottom-0 left-0 z-10">
    <div v-if="isOpen" class="h-full flex flex-1 flex-col bg-neutral-900 transition-all duration-300 ease-in-out" :class="[isOpen ? 'max-w-64 lg:max-w-80' : 'max-w-0']">
      <!-- Panel header -->
      <div class="p-4 border-b">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Select a Drone</h3>
          <button @click="$emit('close')"
            class="p-1 text-neutral-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
            <PhX :size="20" />
          </button>
        </div>
      </div>

      <!-- Panel content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Drone Selection Dropdown -->
        <div class="mb-6">
          <div class="bg-neutral-900 border rounded-lg p-3 flex items-center space-x-3">
            <!-- Drone Icon -->
            <PhPaperPlaneTilt :size="24" class="text-white" />
            <!-- Drone Name -->
            <span class="text-white text-sm flex-1">DJI Avata 2</span>
            <!-- Chevron -->
            <PhCaretDown :size="16" class="text-neutral-400" />
          </div>
        </div>

        <!-- Drone Image -->
        <div class="mb-6">
          <div class="bg-neutral-900 rounded-lg p-4 flex items-center justify-center">
            <!-- Placeholder for DJI Avata 2 image -->
            <div class="w-32 h-24 bg-neutral-700 rounded-lg flex items-center justify-center">
              <span class="text-neutral-400 text-xs">DJI Avata 2</span>
            </div>
          </div>
        </div>

        <!-- Drone Details -->
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <PhIdentificationCard :size="16" class="text-white mt-0.5" />
            <div>
              <p class="text-xs text-neutral-400 uppercase tracking-wide">Serial Number</p>
              <p class="text-sm text-white">230204 23004 1</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <PhCube :size="16" class="text-white mt-0.5" />
            <div>
              <p class="text-xs text-neutral-400 uppercase tracking-wide">Altitude</p>
              <p class="text-sm text-white">80 meters</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <PhCube :size="16" class="text-white mt-0.5" />
            <div>
              <p class="text-xs text-neutral-400 uppercase tracking-wide">UAS ID</p>
              <p class="text-sm text-white">230204 23004 1</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <PhGauge :size="16" class="text-white mt-0.5" />
            <div>
              <p class="text-xs text-neutral-400 uppercase tracking-wide">Speed</p>
              <p class="text-sm text-white">24km/h</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <PhWifiHigh :size="16" class="text-white mt-0.5" />
            <div>
              <p class="text-xs text-neutral-400 uppercase tracking-wide">Connection Signal</p>
              <p class="text-sm text-white">45mb/s</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <PhMapTrifold :size="16" class="text-white mt-0.5" />
            <div>
              <p class="text-xs text-neutral-400 uppercase tracking-wide">Mission ID</p>
              <p class="text-sm text-white">N/A</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhX, PhPaperPlaneTilt, PhCaretDown, PhCube, PhGauge, PhIdentificationCard, PhLightning, PhWifiHigh, PhMapTrifold } from '@phosphor-icons/vue'
import type { MapPin } from '@/types/map'

// Props
interface Props {
  isOpen: boolean
  selectedPin: MapPin | null
}

defineProps<Props>()

// Emits
defineEmits<{
  close: []
  'pin-deselected': []
}>()
</script>

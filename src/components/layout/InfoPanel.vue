<template>
  <div 
    :class="[
      'bg-gray-800 border-l border-gray-700 transition-all duration-300 ease-in-out',
      isOpen ? 'w-80' : 'w-0'
    ]"
  >
    <div v-if="isOpen" class="h-full flex flex-col">
      <!-- Panel header -->
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Select a Drone</h3>
          <button
            @click="$emit('close')"
            class="p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Panel content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Drone Selection Dropdown -->
        <div class="mb-6">
          <div class="bg-gray-900 border border-gray-600 rounded-lg p-3 flex items-center space-x-3">
            <!-- Drone Icon -->
            <div class="w-6 h-6 text-white">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </div>
            <!-- Drone Name -->
            <span class="text-white text-sm flex-1">DJI Avata 2</span>
            <!-- Chevron -->
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>

        <!-- Drone Image -->
        <div class="mb-6">
          <div class="bg-gray-900 rounded-lg p-4 flex items-center justify-center">
            <!-- Placeholder for DJI Avata 2 image -->
            <div class="w-32 h-24 bg-gray-700 rounded-lg flex items-center justify-center">
              <span class="text-gray-400 text-xs">DJI Avata 2</span>
            </div>
          </div>
        </div>

        <!-- Drone Details -->
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <div class="w-4 h-4 text-white mt-0.5">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide">Serial Number</p>
              <p class="text-sm text-white">230204 23004 1</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-4 h-4 text-white mt-0.5">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide">Altitude</p>
              <p class="text-sm text-white">80 meters</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-4 h-4 text-white mt-0.5">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide">UAS ID</p>
              <p class="text-sm text-white">230204 23004 1</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-4 h-4 text-white mt-0.5">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide">Speed</p>
              <p class="text-sm text-white">24km/h</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-4 h-4 text-white mt-0.5">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide">Connection Signal</p>
              <p class="text-sm text-white">45mb/s</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-4 h-4 text-white mt-0.5">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide">Mission ID</p>
              <p class="text-sm text-white">N/A</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

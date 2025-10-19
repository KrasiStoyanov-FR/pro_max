<template>
  <div class="absolute top-4 right-4 z-20 bg-neutral-900 rounded-2xl shadow-md p-4 w-64 lg:top-6 lg:right-6">
    <div class="space-y-3">
      <!-- Database Status -->
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 rounded-full" :class="databaseStatus === 'connected' ? 'bg-green-500' : 'bg-red-500 animate-pulse'"></div>
        <span class="text-white text-sm">{{ databaseStatus === 'connected' ? 'Database Connected' : 'Database Disconnected' }}</span>
      </div>
      
      <!-- Active Drones -->
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
        <span class="text-white text-sm">{{ activeDrones }} Active Drones</span>
      </div>
      
      <!-- RF Detections -->
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <span class="text-white text-sm">{{ rfDetections }} RF Detections</span>
      </div>
      
      <!-- Operators -->
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
        <span class="text-white text-sm">{{ operators }} Operators</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '@/store/map'
import { databaseApi } from '@/services/api'

// Status summary card component for the floating status display
// This replaces the old sidebar functionality

const mapStore = useMapStore()

// Reactive data
const databaseStatus = ref<'connected' | 'disconnected'>('disconnected')
const activeDrones = ref(0)
const rfDetections = ref(0)
const operators = ref(0)

// Update statistics from real database data
const updateStatistics = async () => {
  try {
    // Check database connection
    const healthResponse = await databaseApi.getHealth()
    databaseStatus.value = healthResponse.data?.status === 'success' ? 'connected' : 'disconnected'
    
    if (databaseStatus.value === 'connected') {
      // Get real statistics
      const [dronesResponse, rfResponse, operatorsResponse] = await Promise.all([
        databaseApi.getDrones(),
        databaseApi.getRFDetections(1000),
        databaseApi.getOperatorPositions(1000)
      ])
      
      activeDrones.value = dronesResponse.success ? (dronesResponse.data?.length || 0) : 0
      rfDetections.value = rfResponse.success ? (rfResponse.data?.length || 0) : 0
      operators.value = operatorsResponse.success ? (operatorsResponse.data?.length || 0) : 0
    } else {
      // No fallback - show zero counts when database is disconnected
      activeDrones.value = 0
      rfDetections.value = 0
      operators.value = 0
    }
  } catch (error) {
    console.error('[StatusSummary] Error updating statistics:', error)
    databaseStatus.value = 'disconnected'
    
    // No fallback - show zero counts on error
    activeDrones.value = 0
    rfDetections.value = 0
    operators.value = 0
  }
}

// Update statistics when map store changes
const updateFromMapStore = () => {
  const pins = mapStore.pins
  activeDrones.value = pins.filter(pin => pin.type === 'drone').length
  rfDetections.value = pins.filter(pin => pin.type === 'target').length
  operators.value = pins.filter(pin => pin.type === 'friendly').length
}

// Lifecycle
onMounted(() => {
  updateStatistics()
  // Update every 30 seconds
  const interval = setInterval(updateStatistics, 30000)
  
  // Cleanup interval on unmount
  onUnmounted(() => {
    clearInterval(interval)
  })
})

// Watch for map store changes
watch(() => mapStore.pins, updateFromMapStore, { deep: true })
</script>

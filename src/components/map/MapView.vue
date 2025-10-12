<template>
  <div class="h-full w-full relative">
    <!-- Map container -->
    <div 
      ref="mapContainer"
      class="h-full w-full"
    ></div>

    <!-- Loading overlay -->
    <div 
      v-if="isLoading"
      class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"
    >
      <div class="flex flex-col items-center space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="text-sm text-gray-600">Loading map...</p>
      </div>
    </div>

    <!-- Error overlay -->
    <div 
      v-if="mapError"
      class="absolute inset-0 bg-red-50 flex items-center justify-center z-10"
    >
      <div class="text-center p-6">
        <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <h3 class="text-lg font-medium text-red-900 mb-2">Map Error</h3>
        <p class="text-sm text-red-700 mb-4">{{ mapError }}</p>
        <button 
          @click="retryMap"
          class="btn-primary text-sm"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Map controls overlay -->
    <div class="absolute top-4 right-4 z-20 space-y-2">
      <!-- Center to user location -->
      <button
        @click="centerToUserLocation"
        class="map-control"
        title="Center to my location"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      </button>

      <!-- Toggle layers -->
      <button
        @click="toggleLayers"
        class="map-control"
        title="Toggle layers"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
        </svg>
      </button>

      <!-- Refresh pins -->
      <button
        @click="refreshPins"
        class="map-control"
        title="Refresh data"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
      </button>
    </div>

    <!-- Map info overlay -->
    <div class="absolute bottom-4 left-4 z-20">
      <div class="bg-white bg-opacity-90 rounded-lg p-3 shadow-sm">
        <div class="text-xs text-gray-600 space-y-1">
          <div>Pins: {{ pinsCount }}</div>
          <div>Zoom: {{ currentZoom }}</div>
          <div v-if="selectedPin">Selected: {{ selectedPin.title }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMapPins } from '@/composables/useMapPins'
import type { MapViewport } from '@/types/map'

// Props
interface Props {
  pins?: Array<{ id: string; lat: number; lng: number; title: string; data?: any }>
  center?: [number, number]
  zoom?: number
  maxZoom?: number
  minZoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [39.8283, -98.5795], // Center of USA
  zoom: 4,
  maxZoom: 18,
  minZoom: 1
})

// Emits
defineEmits<{
  'pin-selected': [pin: any]
  'pin-deselected': []
}>()

// Composables
const {
  mapContainer,
  isMapReady,
  mapError,
  isLoading,
  pins,
  selectedPin,
  viewport,
  initializeMap,
  loadPins,
  selectPin,
  clearSelection,
  flyToLocation,
  refreshPins: refreshPinsData,
  cleanup
} = useMapPins()

// Computed
const pinsCount = computed(() => pins.value.length)
const currentZoom = computed(() => viewport.value.zoom)

// Methods
const retryMap = async () => {
  if (mapContainer.value) {
    await initializeMap(mapContainer.value, {
      center: props.center,
      zoom: props.zoom
    })
  }
}

const centerToUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        flyToLocation(latitude, longitude, 15)
      },
      (error) => {
        console.error('Geolocation error:', error)
        // Fallback to default center
        flyToLocation(props.center[0], props.center[1], props.zoom)
      }
    )
  } else {
    // Fallback to default center
    flyToLocation(props.center[0], props.center[1], props.zoom)
  }
}

const toggleLayers = () => {
  // TODO: Implement layer toggling
  console.log('Toggle layers - to be implemented')
}

const refreshPins = async () => {
  await refreshPinsData()
}

// Watch for prop changes
watch(() => props.center, (newCenter) => {
  if (isMapReady.value && newCenter) {
    flyToLocation(newCenter[0], newCenter[1], props.zoom)
  }
})

watch(() => props.zoom, (newZoom) => {
  if (isMapReady.value && newZoom) {
    flyToLocation(props.center[0], props.center[1], newZoom)
  }
})

// Lifecycle
onMounted(async () => {
  if (mapContainer.value) {
    await initializeMap(mapContainer.value, {
      center: props.center,
      zoom: props.zoom,
      // maxZoom: props.maxZoom,
      // minZoom: props.minZoom
    })
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

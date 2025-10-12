<template>
  <div class="h-full flex-1 relative">
    <!-- Map container -->
    <div 
      ref="mapContainer"
      class="h-full w-full relative z-10"
    ></div>

    <!-- Loading overlay -->
    <div 
      v-if="isLoading"
      class="absolute inset-0 bg-neutral-800 bg-opacity-75 flex items-center justify-center z-10"
    >
      <div class="flex flex-col items-center space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="text-sm text-neutral-600">Loading map...</p>
      </div>
    </div>

    <!-- Error overlay -->
    <div 
      v-if="mapError"
      class="absolute inset-0 bg-red-50 flex items-center justify-center z-10"
    >
      <div class="text-center p-6">
        <PhWarning :size="48" class="text-red-400 mx-auto mb-4" />
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
        <PhMapPin :size="20" class="text-neutral-600" weight="bold" />
      </button>

      <!-- Toggle layers -->
      <button
        @click="toggleLayers"
        class="map-control"
        title="Toggle layers"
      >
        <PhSquaresFour :size="20" class="text-neutral-600" />
      </button>

      <!-- Refresh pins -->
      <button
        @click="refreshPins"
        class="map-control"
        title="Refresh data"
      >
        <PhArrowClockwise :size="20" class="text-neutral-600" />
      </button>
    </div>

    <!-- Map info overlay -->
    <div class="absolute bottom-4 left-4 z-20">
      <div class="bg-neutral-800 bg-opacity-90 rounded-lg p-3 shadow-sm">
        <div class="text-xs text-neutral-600 space-y-1">
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
import { PhWarning, PhMapPin, PhSquaresFour, PhArrowClockwise } from '@phosphor-icons/vue'
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

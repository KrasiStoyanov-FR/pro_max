<template>
  <div class="h-full flex-1 relative">
    <!-- Map container -->
    <div ref="mapContainer" class="h-full w-full relative z-10"></div>

    <!-- Loading overlay (above map container so it's visible while map loads) -->
    <div v-if="isLoading" class="absolute inset-0 bg-neutral-800 bg-opacity-75 flex items-center justify-center z-20">
      <div class="flex flex-col items-center space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="text-sm text-neutral-600">Loading map...</p>
      </div>
    </div>

    <!-- Error overlay -->
    <div v-if="mapError" class="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
      <div class="text-center p-6">
        <PhWarning :size="48" class="text-red-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-red-900 mb-2">Map Error</h3>
        <p class="text-sm text-red-700 mb-4">{{ mapError }}</p>
        <button @click="retryMap" class="btn-primary text-sm">
          Retry
        </button>
      </div>
    </div>

    <div class="flex w-full absolute top-0 right-0 left-0 z-40">
      <TopNav />
    </div>

    <!-- TODO: The map doesn't visually resize when the sidebar is collapsed. When that happens, the space the sidebar took is now cutout from the map on its right side, since the sidebar is on the left. Look into this issue and see if there's additional settings concerning responsiveness. -->

    <!-- Map info overlay -->
    <!-- TODO: Consider moving this somewhere where it doesn't overlap with other windows. Plus, consider if it's worth including it in the view. Maybe think of a more compact design? -->
    <!-- <div class="absolute bottom-4 left-4 z-20">
      <div class="bg-neutral-900/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-neutral-700/50">
        <div class="text-sm text-white space-y-2">
          <div class="flex items-center space-x-2">
            <PhMapPin :size="16" class="text-primary-400" weight="bold" />
            <span class="font-medium">Pins: {{ pinsCount }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <PhSquaresFour :size="16" class="text-primary-400" weight="bold" />
            <span class="font-medium">Zoom: {{ currentZoom }}</span>
          </div>
          <div v-if="selectedPin" class="flex items-center space-x-2 pt-1 border-t border-neutral-700/50">
            <PhMapPin :size="16" class="text-green-400" weight="bold" />
            <span class="text-green-400 font-medium truncate max-w-48">{{ selectedPin.title }}</span>
          </div>
        </div>
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { PhWarning } from '@phosphor-icons/vue'
import { useMapPins } from '@/composables/useMapPins'
import { mapService } from '@/services/mapService'
import MapFilters from './MapFilters.vue'
import TopNav from '@/components/layout/TopNav.vue'

// Props
interface Props {
  pins?: Array<{ id: string; lat: number; lng: number; title: string; data?: any }>
  center?: [number, number]
  zoom?: number
  maxZoom?: number
  minZoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [42.6977, 23.3219], // Sofia, Bulgaria
  zoom: 10,
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
      ...(props.maxZoom && { maxZoom: props.maxZoom }),
      ...(props.minZoom && { minZoom: props.minZoom })
    })
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

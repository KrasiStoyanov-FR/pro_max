<template>
  <div class="relative h-48 w-full overflow-hidden rounded-xl bg-neutral-900/80">
    <div
      v-if="!effectiveCoordinates"
      class="absolute inset-0 flex items-center justify-center text-sm text-neutral-400"
    >
      Location unavailable
    </div>
    <div v-else ref="mapRef" class="h-full w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, onUpdated } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  coordinates?: { lat: number; lng: number } | null
  zoom?: number
}>()

const mapRef = ref<HTMLDivElement | null>(null)
const mapInstance = ref<L.Map | null>(null)
const marker = ref<L.Marker | null>(null)
// Store last valid coordinates to prevent map destruction during temporary data refreshes
const lastValidCoordinates = ref<{ lat: number; lng: number } | null>(null)
// Track if user has manually interacted with the map (panned/zoomed)
const userHasInteracted = ref(false)

const hasCoordinates = computed(() => {
  return Boolean(
    props.coordinates &&
      Number.isFinite(props.coordinates.lat) &&
      Number.isFinite(props.coordinates.lng)
  )
})

// Use last valid coordinates if current ones are missing (during refetch)
const effectiveCoordinates = computed(() => {
  if (hasCoordinates.value) {
    // Update last valid coordinates when we have valid ones
    lastValidCoordinates.value = {
      lat: props.coordinates!.lat,
      lng: props.coordinates!.lng
    }
    return props.coordinates
  }
  // Return last valid coordinates if current ones are missing (during refetch)
  return lastValidCoordinates.value
})

const destroyMap = () => {
  if (marker.value) {
    marker.value.remove()
    marker.value = null
  }
  if (mapInstance.value) {
    mapInstance.value.remove()
    mapInstance.value = null
  }
  // Reset interaction tracking
  userHasInteracted.value = false
}

const setupMap = async () => {
  const coords = effectiveCoordinates.value
  if (!mapRef.value || !coords || mapInstance.value) return

  // Wait for the container to be fully visible
  await nextTick()
  
  // Small delay to ensure the container is rendered and visible
  setTimeout(() => {
    if (!mapRef.value || mapInstance.value) return

    mapInstance.value = L.map(mapRef.value, {
      attributionControl: false,
      zoomControl: true, // Enable zoom controls
      scrollWheelZoom: true, // Enable mouse wheel zoom
      dragging: true, // Enable panning/dragging
      touchZoom: true, // Enable touch zoom on mobile
      doubleClickZoom: true // Enable double-click zoom
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(mapInstance.value)

    marker.value = L.marker([coords.lat, coords.lng]).addTo(mapInstance.value)
    mapInstance.value.setView([coords.lat, coords.lng], props.zoom ?? 14)
    
    // Track user interactions - don't auto-reset view if user has panned/zoomed
    mapInstance.value.on('dragstart', () => {
      userHasInteracted.value = true
    })
    mapInstance.value.on('zoomstart', () => {
      userHasInteracted.value = true
    })
    
    // Invalidate size to ensure proper rendering
    mapInstance.value.invalidateSize()
  }, 100)
}

const updateMarker = () => {
  const coords = effectiveCoordinates.value
  if (!mapInstance.value || !marker.value || !coords) return
  
  // Only update if coordinates actually changed (not just a temporary null during refetch)
  if (hasCoordinates.value) {
    // Update marker position
    marker.value.setLatLng([coords.lat, coords.lng])
    
    // Only reset view if user hasn't manually interacted with the map
    // This allows users to pan/zoom and explore without the map jumping back
    if (!userHasInteracted.value) {
      mapInstance.value.setView([coords.lat, coords.lng], props.zoom ?? 14)
    }
    
    // Invalidate size when updating
    mapInstance.value.invalidateSize()
  }
}

onMounted(async () => {
  if (effectiveCoordinates.value) {
    await setupMap()
  }
})

onBeforeUnmount(() => {
  destroyMap()
})

// Invalidate size when component updates (e.g., when panel becomes visible)
onUpdated(() => {
  if (mapInstance.value) {
    // Use a small delay to ensure the container is fully visible
    setTimeout(() => {
      mapInstance.value?.invalidateSize()
    }, 50)
  }
})

watch(
  () => props.coordinates,
  async () => {
    const coords = effectiveCoordinates.value
    
    // Only destroy map if we truly have no coordinates (not just during a refetch)
    // Since sensors are static, we preserve the map even if coordinates are temporarily null
    if (!coords && !lastValidCoordinates.value) {
      destroyMap()
      return
    }

    if (!mapInstance.value && coords) {
      await setupMap()
    } else if (mapInstance.value) {
      updateMarker()
    }
  },
  { deep: true }
)
</script>



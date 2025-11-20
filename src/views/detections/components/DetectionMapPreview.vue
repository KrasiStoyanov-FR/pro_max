<template>
  <div class="relative h-48 w-full overflow-hidden rounded-xl bg-neutral-900/80">
    <div
      v-if="!hasCoordinates"
      class="absolute inset-0 flex items-center justify-center text-sm text-neutral-400"
    >
      Location unavailable
    </div>
    <div v-else ref="mapRef" class="h-full w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  coordinates?: { lat: number; lng: number } | null
  zoom?: number
}>()

const mapRef = ref<HTMLDivElement | null>(null)
const mapInstance = ref<L.Map | null>(null)
const marker = ref<L.Marker | null>(null)

const hasCoordinates = computed(() => {
  return Boolean(props.coordinates && Number.isFinite(props.coordinates.lat) && Number.isFinite(props.coordinates.lng))
})

const setupMap = () => {
  if (!mapRef.value || !hasCoordinates.value || mapInstance.value) return

  mapInstance.value = L.map(mapRef.value, {
    attributionControl: false,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(mapInstance.value)

  marker.value = L.marker([props.coordinates!.lat, props.coordinates!.lng]).addTo(mapInstance.value)
  mapInstance.value.setView([props.coordinates!.lat, props.coordinates!.lng], props.zoom ?? 14)
}

const updateMarker = () => {
  if (!mapInstance.value || !marker.value || !hasCoordinates.value) return
  marker.value.setLatLng([props.coordinates!.lat, props.coordinates!.lng])
  mapInstance.value.setView([props.coordinates!.lat, props.coordinates!.lng], props.zoom ?? 14)
}

onMounted(() => {
  setupMap()
})

onBeforeUnmount(() => {
  mapInstance.value?.remove()
  mapInstance.value = null
  marker.value = null
})

watch(
  () => props.coordinates,
  () => {
    if (!hasCoordinates.value) {
      mapInstance.value?.remove()
      mapInstance.value = null
      marker.value = null
      return
    }

    if (!mapInstance.value) {
      setupMap()
    } else {
      updateMarker()
    }
  }
)
</script>



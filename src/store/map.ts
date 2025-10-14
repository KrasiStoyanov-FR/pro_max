import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MapPin, MapViewport } from '@/types/map'

export const useMapStore = defineStore('map', () => {
  // State
  const pins = ref<MapPin[]>([])
  const selectedPin = ref<MapPin | null>(null)
  const viewport = ref<MapViewport>({
    center: [42.6977, 23.3219], // Sofia, Bulgaria (where most drones are located)
    zoom: 10
  })
  const isLoading = ref(false)
  const mapInstance = ref<any>(null) // Will hold Leaflet map instance

  // Getters
  const selectedPinData = computed(() => selectedPin.value)
  const pinsCount = computed(() => pins.value.length)
  const hasSelectedPin = computed(() => selectedPin.value !== null)

  // Actions
  const setMapInstance = (map: any) => {
    mapInstance.value = map
  }

  const setViewport = (newViewport: Partial<MapViewport>) => {
    viewport.value = { ...viewport.value, ...newViewport }
  }

  const setPins = (newPins: MapPin[]) => {
    pins.value = newPins
  }

  const addPin = (pin: MapPin) => {
    const existingIndex = pins.value.findIndex(p => p.id === pin.id)
    if (existingIndex >= 0) {
      pins.value[existingIndex] = pin
    } else {
      pins.value.push(pin)
    }
  }

  const removePin = (pinId: string) => {
    pins.value = pins.value.filter(p => p.id !== pinId)
    if (selectedPin.value?.id === pinId) {
      selectedPin.value = null
    }
  }

  const selectPin = (pin: MapPin | null) => {
    selectedPin.value = pin
  }

  const clearSelection = () => {
    selectedPin.value = null
  }

  const flyToPin = (pin: MapPin) => {
    if (mapInstance.value) {
      // Use a higher zoom level to ensure we zoom IN to the drone
      // Check current zoom and use a higher level if we're already close
      const currentZoom = mapInstance.value.getZoom()
      const targetZoom = Math.min(Math.max(currentZoom + 2, 16), 18) // Zoom in by 2 levels, between 16-18
      
      mapInstance.value.flyTo([pin.lat, pin.lng], targetZoom)
    }
    selectPin(pin)
  }

  const flyToLocation = (lat: number, lng: number, zoom: number = 10) => {
    if (mapInstance.value) {
      mapInstance.value.flyTo([lat, lng], zoom)
    }
    setViewport({ center: [lat, lng], zoom })
  }

  const getPinsInBounds = (bounds: any) => {
    return pins.value.filter(pin => {
      return bounds.contains([pin.lat, pin.lng])
    })
  }

  const searchPins = (query: string) => {
    if (!query.trim()) return pins.value
    
    const lowercaseQuery = query.toLowerCase()
    return pins.value.filter(pin => 
      pin.title.toLowerCase().includes(lowercaseQuery) ||
      pin.description?.toLowerCase().includes(lowercaseQuery) ||
      pin.type?.toLowerCase().includes(lowercaseQuery)
    )
  }

  const filterPinsByType = (type: string) => {
    if (!type) return pins.value
    return pins.value.filter(pin => pin.type === type)
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const resetMap = () => {
    pins.value = []
    selectedPin.value = null
    viewport.value = {
      center: [42.6977, 23.3219], // Sofia, Bulgaria (where most drones are located)
      zoom: 10
    }
    mapInstance.value = null
  }

  return {
    // State
    pins,
    selectedPin,
    viewport,
    isLoading,
    mapInstance,
    
    // Getters
    selectedPinData,
    pinsCount,
    hasSelectedPin,
    
    // Actions
    setMapInstance,
    setViewport,
    setPins,
    addPin,
    removePin,
    selectPin,
    clearSelection,
    flyToPin,
    flyToLocation,
    getPinsInBounds,
    searchPins,
    filterPinsByType,
    setLoading,
    resetMap
  }
})


import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MapPin, MapViewport } from '@/types/map'

export const useMapStore = defineStore('map', () => {
  // State
  const pins = ref<MapPin[]>([])
  const selectedPin = ref<MapPin | null>(null)
  const viewport = ref<MapViewport>({
    center: [39.8283, -98.5795], // Center of USA
    zoom: 4
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
      mapInstance.value.flyTo([pin.lat, pin.lng], 15)
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
      center: [39.8283, -98.5795],
      zoom: 4
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


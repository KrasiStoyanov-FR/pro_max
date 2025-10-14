import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/store/map'
import { mapService } from '@/services/mapService'
import { mockPins } from '@/services/mockData'
import type { MapPin, MapViewport } from '@/types/map'

export function useMapPins() {
  const mapStore = useMapStore()
  const mapContainer = ref<HTMLElement | null>(null)
  const isMapReady = ref(false)
  const mapError = ref<string | null>(null)

  // Computed properties
  const pins = computed(() => mapStore.pins)
  const selectedPin = computed(() => mapStore.selectedPin)
  const viewport = computed(() => mapStore.viewport)
  const isLoading = computed(() => mapStore.isLoading)

  // Initialize map
  const initializeMap = async (container: HTMLElement, options?: Partial<MapViewport>) => {
    try {
      mapError.value = null
      mapStore.setLoading(true)

      // Try to get user's current location
      let center = options?.center || viewport.value.center
      let zoom = options?.zoom || viewport.value.zoom

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 300000 // 5 minutes
            })
          })
          
          center = [position.coords.latitude, position.coords.longitude]
          zoom = 10 // Closer zoom when using current location
          console.log('Using current location:', center)
        } catch (geoError) {
          console.warn('Geolocation failed, using default center:', geoError)
          // Fall back to default center
        }
      }

      const mapOptions = {
        center,
        zoom,
        maxZoom: 18,
        minZoom: 1,
        attribution: '' // Remove attribution
      }

      const map = await mapService.init(container, mapOptions)
      mapStore.setMapInstance(map)

      // Set up pin click handler
      mapService.onPinClick((pin: MapPin) => {
        mapStore.flyToPin(pin) // This will also call selectPin internally
      })

      // Load initial pins
      await loadPins()

      isMapReady.value = true
      mapStore.setLoading(false)
    } catch (error) {
      console.error('Map initialization error:', error)
      mapError.value = error instanceof Error ? error.message : 'Failed to initialize map'
      mapStore.setLoading(false)
    }
  }

  // Load pins from API or mock data
  const loadPins = async () => {
    try {
      mapStore.setLoading(true)
      
      // TODO: Replace with real API call
      // For now, use mock data
      const pins = mockPins
      mapStore.setPins(pins)
      
      // Add pins to map
      if (isMapReady.value) {
        mapService.addPins(pins)
      }
      
      mapStore.setLoading(false)
    } catch (error) {
      console.error('Error loading pins:', error)
      mapStore.setLoading(false)
    }
  }

  // Add a new pin
  const addPin = (pin: MapPin) => {
    mapStore.addPin(pin)
    if (isMapReady.value) {
      mapService.addPins([pin])
    }
  }

  // Remove a pin
  const removePin = (pinId: string) => {
    mapStore.removePin(pinId)
    // Note: mapService doesn't have individual pin removal, 
    // so we'd need to refresh all pins
    if (isMapReady.value) {
      mapService.addPins(mapStore.pins)
    }
  }

  // Select a pin
  const selectPin = (pin: MapPin | null) => {
    mapStore.selectPin(pin)
    // Note: flyTo is handled by flyToPin method to avoid duplicate calls
  }

  // Clear selection
  const clearSelection = () => {
    mapStore.clearSelection()
  }

  // Fly to location
  const flyToLocation = (lat: number, lng: number, zoom: number = 10) => {
    mapStore.flyToLocation(lat, lng, zoom)
    if (isMapReady.value) {
      mapService.flyTo(lat, lng, zoom)
    }
  }

  // Search pins
  const searchPins = (query: string) => {
    return mapStore.searchPins(query)
  }

  // Filter pins by type
  const filterPinsByType = (type: string) => {
    return mapStore.filterPinsByType(type)
  }

  // Get pins in current map bounds
  const getPinsInBounds = () => {
    if (!isMapReady.value) return []
    const bounds = mapService.getBounds()
    return bounds ? mapStore.getPinsInBounds(bounds) : []
  }

  // Refresh pins
  const refreshPins = async () => {
    await loadPins()
  }

  // Cleanup
  const cleanup = () => {
    if (isMapReady.value) {
      mapService.destroy()
      isMapReady.value = false
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    if (mapContainer.value) {
      initializeMap(mapContainer.value)
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // Refs
    mapContainer,
    isMapReady,
    mapError,
    
    // Computed
    pins,
    selectedPin,
    viewport,
    isLoading,
    
    // Methods
    initializeMap,
    loadPins,
    addPin,
    removePin,
    selectPin,
    clearSelection,
    flyToLocation,
    searchPins,
    filterPinsByType,
    getPinsInBounds,
    refreshPins,
    cleanup
  }
}



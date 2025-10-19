import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/store/map'
import { mapService } from '@/services/mapService'
import { databaseApi } from '@/services/api'
import type { MapPin, MapViewport } from '@/types/map'
import type { DronePosition, RFDetection, OperatorPosition } from '@/types/database'

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

      isMapReady.value = true
      
      // Load initial pins after map is ready
      await loadPins()

      mapStore.setLoading(false)
    } catch (error) {
      console.error('Map initialization error:', error)
      mapError.value = error instanceof Error ? error.message : 'Failed to initialize map'
      mapStore.setLoading(false)
    }
  }

  // Load pins from real database
  const loadPins = async () => {
    try {
      mapStore.setLoading(true)
      
      
      // Fetch real data from database
      const [dronePositionsResponse, rfDetectionsResponse, operatorPositionsResponse] = await Promise.all([
        databaseApi.getDronePositions(100),
        databaseApi.getRFDetections(50),
        databaseApi.getOperatorPositions(50)
      ])
      
      const pins: MapPin[] = []
      
      // Convert drone positions to map pins
      if (dronePositionsResponse.success && dronePositionsResponse.data) {
        const dronePins = dronePositionsResponse.data.map((position: DronePosition) => ({
          id: `drone-pos-${position.id}`,
          lat: parseFloat(position.latitude.toString()),
          lng: parseFloat(position.longitude.toString()),
          title: `Drone ${position.drone_id}`,
          description: `Altitude: ${position.altitude}m, Speed: ${position.speed} km/h`,
          type: 'drone' as const,
          status: 'active' as const,
          priority: 'medium' as const,
          data: {
            drone_id: position.drone_id,
            altitude: position.altitude,
            speed: position.speed,
            receiver_type: position.receiver_type,
            timestamp: position.time,
            source: 'database'
          },
          timestamp: position.time
        }))
        pins.push(...dronePins)
      }
      
      // Convert RF detections to map pins
      if (rfDetectionsResponse.success && rfDetectionsResponse.data) {
        const rfPins = rfDetectionsResponse.data.map((detection: RFDetection) => ({
          id: `rf-detection-${detection.id}`,
          lat: 42.6977 + (Math.random() - 0.5) * 0.01, // Approximate location around Sofia
          lng: 23.3219 + (Math.random() - 0.5) * 0.01,
          title: `RF Detection - Drone ${detection.drone_id}`,
          description: `Frequency: ${detection.frequency} MHz, Signal: ${detection.signal_strength} dBm`,
          type: 'target' as const,
          status: detection.detection_status ? 'active' : 'inactive' as const,
          priority: 'high' as const,
          data: {
            drone_id: detection.drone_id,
            frequency: detection.frequency,
            signal_strength: detection.signal_strength,
            detection_status: detection.detection_status,
            timestamp: detection.time,
            source: 'database'
          },
          timestamp: detection.time
        }))
        pins.push(...rfPins)
      }
      
      // Convert operator positions to map pins
      if (operatorPositionsResponse.success && operatorPositionsResponse.data) {
        const operatorPins = operatorPositionsResponse.data.map((position: OperatorPosition) => ({
          id: `operator-pos-${position.id}`,
          lat: parseFloat(position.latitude.toString()),
          lng: parseFloat(position.longitude.toString()),
          title: `Operator - Drone ${position.drone_id}`,
          description: `Operator position for drone ${position.drone_id}`,
          type: 'friendly' as const,
          status: 'active' as const,
          priority: 'low' as const,
          data: {
            drone_id: position.drone_id,
            timestamp: position.time,
            source: 'database'
          },
          timestamp: position.time
        }))
        pins.push(...operatorPins)
      }
      
      // Set pins from database
      if (pins.length > 0) {
        mapStore.setPins(pins)
        
        // Add pins to map
        if (isMapReady.value) {
          mapService.addPins(pins)
        }
      } else {
        console.warn('[MapPins] No data available from database')
        mapStore.setPins([])
      }
      
      mapStore.setLoading(false)
    } catch (error) {
      console.error('[MapPins] Error loading pins from database:', error)
      mapStore.setPins([])
      mapStore.setLoading(false)
      throw new Error(`Failed to load map data: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    
    // Set up 1-minute refresh interval for fresh data
    const refreshInterval = setInterval(async () => {
      if (isMapReady.value) {
        try {
          // Clear cache to get fresh data
          databaseApi.clearCache()
          await loadPins()
        } catch (error) {
          console.error('[MapPins] Error refreshing data:', error)
        }
      }
    }, 60000) // 1 minute
    
    // Cleanup interval on unmount
    onUnmounted(() => {
      clearInterval(refreshInterval)
    })
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



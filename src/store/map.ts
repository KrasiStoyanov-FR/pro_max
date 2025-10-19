import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import L from 'leaflet'
import type { MapPin, MapViewport } from '@/types/map'
import type { PinCluster } from '@/services/mapService'

export const useMapStore = defineStore('map', () => {
  // State
  const pins = ref<MapPin[]>([])
  const selectedPin = ref<MapPin | null>(null)
  const selectedCluster = ref<PinCluster | null>(null)
  const viewport = ref<MapViewport>({
    center: [42.6977, 23.3219], // Sofia, Bulgaria (where most drones are located)
    zoom: 10
  })
  const isLoading = ref(false)
  const mapInstance = ref<any>(null) // Will hold Leaflet map instance

  // Viewport tracking for panels
  const availableViewport = ref({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    center: [42.6977, 23.3219] as [number, number]
  })

  // Getters
  const selectedPinData = computed(() => selectedPin.value)
  const selectedClusterData = computed(() => selectedCluster.value)
  const pinsCount = computed(() => pins.value.length)
  const hasSelectedPin = computed(() => selectedPin.value !== null)
  const hasSelectedCluster = computed(() => selectedCluster.value !== null)
  const availableViewportData = computed(() => availableViewport.value)

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

  const selectPin = (pin: MapPin | null, keepCluster: boolean = false) => {
    console.log('Store: selectPin called with:', pin?.id, pin?.title, 'keepCluster:', keepCluster)
    console.trace('Store selectPin call stack:') // This will show us what's calling it
    selectedPin.value = pin
    // Only clear cluster selection if not keeping it (e.g., when selecting pin from cluster)
    if (pin && !keepCluster) {
      selectedCluster.value = null
    }
    
    // Trigger highlighting on the map
    if (mapInstance.value) {
      console.log('Store: Selecting pin, triggering highlight:', pin?.id)
      // We'll need to import mapService or call it from the composable
    }
  }

  const selectCluster = (cluster: PinCluster | null) => {
    selectedCluster.value = cluster
    // Clear pin selection when selecting a cluster
    if (cluster) {
      selectedPin.value = null
    }
  }

  const clearSelection = () => {
    selectedPin.value = null
    selectedCluster.value = null
  }

  const updateAvailableViewport = (panelWidths: { cluster: number, info: number }) => {
    if (!mapInstance.value) return
    
    const mapContainer = mapInstance.value.getContainer()
    const containerRect = mapContainer.getBoundingClientRect()
    
    // Calculate available space (subtract panel widths from left side)
    const totalPanelWidth = panelWidths.cluster + panelWidths.info
    const availableLeft = totalPanelWidth
    const availableRight = containerRect.width
    
    // Calculate the center of the available viewport
    const availableCenterX = availableLeft + (availableRight - availableLeft) / 2
    const availableCenterY = containerRect.height / 2
    
    // Convert screen coordinates to lat/lng
    const centerPoint = mapInstance.value.containerPointToLatLng([availableCenterX, availableCenterY])
    
    availableViewport.value = {
      left: availableLeft,
      right: availableRight,
      top: 0,
      bottom: containerRect.height,
      center: [centerPoint.lat, centerPoint.lng]
    }
  }

  const flyToPin = (pin: MapPin) => {
    if (mapInstance.value) {
      // Use a higher zoom level to ensure we zoom IN to the drone
      // Check current zoom and use a higher level if we're already close
      const currentZoom = mapInstance.value.getZoom()
      const targetZoom = Math.min(Math.max(currentZoom + 2, 16), 18) // Zoom in by 2 levels, between 16-18
      
      // Check if panels are visible or will be visible after selection
      const hasClusterPanel = selectedCluster.value !== null
      const hasInfoPanel = selectedPin.value !== null
      const willHaveInfoPanel = !hasInfoPanel // If no info panel currently, we're about to show one
      
      // Calculate panel widths for padding
      const clusterWidth = hasClusterPanel ? 350 : 0
      const infoWidth = hasInfoPanel ? 350 : (willHaveInfoPanel ? 350 : 0)
      const totalPanelWidth = clusterWidth + infoWidth
      
      if (totalPanelWidth > 0) {
        // Panels are visible or will be visible, adjust centering accordingly
        const pinLatLng = [pin.lat, pin.lng]
        const bounds = L.latLngBounds([pinLatLng, pinLatLng])
        
        // Use fitBounds with padding to center the pin in the visible area
        mapInstance.value.fitBounds(bounds, {
          paddingTopLeft: [totalPanelWidth, 0],
          paddingBottomRight: [0, 0],
          maxZoom: targetZoom,
          animate: true
        })
      } else {
        // No panels visible or will be visible, center normally
        mapInstance.value.flyTo([pin.lat, pin.lng], targetZoom)
      }
    }
    // Keep cluster selection if there's an active cluster
    const keepCluster = selectedCluster.value !== null
    selectPin(pin, keepCluster)
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
    selectedCluster,
    viewport,
    isLoading,
    mapInstance,
    
    // Getters
    selectedPinData,
    selectedClusterData,
    pinsCount,
    hasSelectedPin,
    hasSelectedCluster,
    availableViewportData,
    
    // Actions
    setMapInstance,
    setViewport,
    setPins,
    addPin,
    removePin,
    selectPin,
    selectCluster,
    clearSelection,
    updateAvailableViewport,
    flyToPin,
    flyToLocation,
    getPinsInBounds,
    searchPins,
    filterPinsByType,
    setLoading,
    resetMap
  }
})


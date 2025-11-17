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
  const focusedDronePinId = ref<string | null>(null)
  const focusedDroneTargetId = ref<string | null>(null)
  const focusedDetectorPinId = ref<string | null>(null)
  const isFocusMode = ref(false)
  const focusModeType = ref<'none' | 'drone' | 'sensor'>('none')
  const focusedTrajectoryTimestamp = ref<string | null>(null)
  const focusedDetectionId = ref<number | null>(null)

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
  const focusModeActive = computed(() => isFocusMode.value && (!!focusedDronePinId.value || !!focusedDetectorPinId.value))

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
    selectedPin.value = pin
    // Only clear cluster selection if not keeping it (e.g., when selecting pin from cluster)
    if (pin && !keepCluster) {
      selectedCluster.value = null
    }

    if (pin?.type === 'drone') {
      const droneTarget = pin.data?.drone_id !== undefined && pin.data?.drone_id !== null
        ? String(pin.data.drone_id)
        : null
      const droneSystemId = pin.data?.system_id !== undefined && pin.data?.system_id !== null
        ? String(pin.data.system_id)
        : null
      const linkedDetectorPin = droneSystemId
        ? pins.value.find(p => p.type === 'sensor' && String(p.data?.system_id ?? '') === droneSystemId)
        : null
      enterFocusMode(pin.id, {
        droneTargetId: droneTarget,
        detectorPinId: linkedDetectorPin?.id ?? null,
        mode: 'drone'
      })

      if (Array.isArray(pin.data?.trajectory) && pin.data.trajectory.length > 0) {
        const lastPoint = pin.data.trajectory[pin.data.trajectory.length - 1]
        setFocusedTrajectoryTimestamp(lastPoint.timestamp)
      } else {
        setFocusedTrajectoryTimestamp(null)
      }
      setFocusedDetectionId(null)
    } else if (pin?.type === 'sensor') {
      enterFocusMode(pin.id, {
        detectorPinId: pin.id,
        mode: 'sensor'
      })
      setFocusedTrajectoryTimestamp(null)
      setFocusedDetectionId(null)
    } else if (pin?.type === 'target' && pin?.data) {
      const detectionId =
        typeof pin.data.id === 'number'
          ? pin.data.id
          : Number(String(pin.id).replace('rf-detection-', ''))

      if (!Number.isNaN(detectionId)) {
        setFocusedDetectionId(detectionId)
      }

      if (pin.data.drone_id !== undefined && pin.data.drone_id !== null) {
        const droneTarget = String(pin.data.drone_id)
        const existingDronePin = pins.value.find(p => p.type === 'drone' && String(p.data?.drone_id) === droneTarget)
        const focusPinId = existingDronePin?.id ?? focusedDronePinId.value ?? `drone-${droneTarget}`
        const detectorForDrone = existingDronePin?.data?.system_id !== undefined && existingDronePin?.data?.system_id !== null
          ? pins.value.find(p => p.type === 'sensor' && String(p.data?.system_id ?? '') === String(existingDronePin.data?.system_id))
          : null
        enterFocusMode(focusPinId, {
          droneTargetId: droneTarget,
          detectorPinId: detectorForDrone?.id ?? null,
          mode: 'drone'
        })
      } else if (!isFocusMode.value) {
        enterFocusMode(pin.id, { mode: 'drone' })
      }

      setFocusedTrajectoryTimestamp(pin.data?.timestamp ?? null)
    } else {
      exitFocusMode()
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
    exitFocusMode()
    // Note: mapService.clearSelectedCluster() should be called from component
    // to ensure cluster markers are shown again when appropriate
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
    if (pin.type === 'target') {
      focusDetectionPin(pin)
      return
    }

    if (mapInstance.value) {
      const currentZoom = mapInstance.value.getZoom()
      const targetZoom = Math.min(Math.max(currentZoom + 2, 16), 18) // Zoom in by 2 levels, between 16-18

      const hasClusterPanel = selectedCluster.value !== null
      const hasInfoPanel = selectedPin.value !== null
      const willHaveInfoPanel = !hasInfoPanel // If no info panel currently, we're about to show one

      const clusterWidth = hasClusterPanel ? 350 : 0
      const infoWidth = hasInfoPanel ? 350 : (willHaveInfoPanel ? 350 : 0)
      const totalPanelWidth = clusterWidth + infoWidth

      if (totalPanelWidth > 0) {
        const pinLatLng = [pin.lat, pin.lng]
        const bounds = L.latLngBounds([pinLatLng, pinLatLng])

        mapInstance.value.fitBounds(bounds, {
          paddingTopLeft: [totalPanelWidth, 0],
          paddingBottomRight: [0, 0],
          maxZoom: targetZoom,
          animate: true
        })
      } else {
        mapInstance.value.flyTo([pin.lat, pin.lng], targetZoom)
      }
      console.log('[Map] flyToPin', { pinId: pin.id, currentZoom, targetZoom })
    }
    // Keep cluster selection if there's an active cluster
    const keepCluster = selectedCluster.value !== null
    selectPin(pin, keepCluster)
  }

  const focusDetectionPin = (pin: MapPin) => {
    if (mapInstance.value) {
      const currentZoom = mapInstance.value.getZoom()
      mapInstance.value.panTo([pin.lat, pin.lng], { animate: false })
      console.log('[Map] focusDetectionPin pan', {
        pinId: pin.id,
        zoom: currentZoom
      })
      const preferredZoom = currentZoom // For now we expect no change, but this can evolve
      if (currentZoom !== preferredZoom) {
        console.warn('[Map] focusDetectionPin zoom mismatch', {
          currentZoom,
          preferredZoom
        })
      }
      // Ensure zoom stays fixed even if other flows try to adjust it
      requestAnimationFrame(() => {
        mapInstance.value?.setView([pin.lat, pin.lng], preferredZoom, { animate: false })
      })
    }
    
    // If this is a detection marker (target type), extract and set the detection ID
    if (pin.type === 'target') {
      const detectionId = typeof pin.data?.id === 'number'
        ? pin.data.id
        : Number(String(pin.id).replace('rf-detection-', ''))
      
      if (!Number.isNaN(detectionId)) {
        setFocusedDetectionId(detectionId)
        // Note: Map highlighting will be handled by the composable to avoid circular dependencies
      }
    }
    
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
    focusedDronePinId.value = null
    focusedDroneTargetId.value = null
    focusedDetectorPinId.value = null
    isFocusMode.value = false
    focusModeType.value = 'none'
    viewport.value = {
      center: [42.6977, 23.3219], // Sofia, Bulgaria (where most drones are located)
      zoom: 10
    }
    mapInstance.value = null
  }

  const enterFocusMode = (
    pinId: string,
    options: { droneTargetId?: string | null; detectorPinId?: string | null; mode?: 'drone' | 'sensor' } = {}
  ) => {
    const mode = options.mode ?? 'drone'
    focusModeType.value = mode
    if (mode === 'sensor') {
      focusedDetectorPinId.value = options.detectorPinId ?? pinId
      focusedDronePinId.value = null
      focusedDroneTargetId.value = null
    } else {
      focusedDronePinId.value = pinId
      focusedDroneTargetId.value = options.droneTargetId ?? null
      focusedDetectorPinId.value = options.detectorPinId ?? null
    }
    isFocusMode.value = true
  }

  const exitFocusMode = () => {
    focusedDronePinId.value = null
    focusedDroneTargetId.value = null
    focusedDetectorPinId.value = null
    isFocusMode.value = false
    focusModeType.value = 'none'
    focusedTrajectoryTimestamp.value = null
    focusedDetectionId.value = null
  }

  const setFocusedTrajectoryTimestamp = (timestamp: string | null) => {
    focusedTrajectoryTimestamp.value = timestamp
  }

  const setFocusedDetectionId = (id: number | null) => {
    focusedDetectionId.value = id
  }

  return {
    // State
    pins,
    selectedPin,
    selectedCluster,
    viewport,
    isLoading,
    mapInstance,
    focusedDronePinId,
    focusedDroneTargetId,
    focusedDetectorPinId,
    isFocusMode,
    focusModeType,
    focusedTrajectoryTimestamp,
    focusedDetectionId,
    
    // Getters
    selectedPinData,
    selectedClusterData,
    pinsCount,
    hasSelectedPin,
    hasSelectedCluster,
    availableViewportData,
    focusModeActive,
    
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
    resetMap,
    enterFocusMode,
    exitFocusMode,
    setFocusedTrajectoryTimestamp,
    setFocusedDetectionId,
    focusDetectionPin
  }
})


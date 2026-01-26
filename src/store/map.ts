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
  const linkedSensorDroneIds = ref<string[]>([])
  const isFocusMode = ref(false)
  const focusModeType = ref<'none' | 'drone' | 'sensor'>('none')
  const focusedTrajectoryTimestamp = ref<string | null>(null)
  const focusedDetectionId = ref<number | null>(null)
  
  // Map filters - which marker types to show
  const visibleMarkerTypes = ref<Set<MapPin['type']>>(new Set(['drone', 'sensor', 'target', 'friendly', 'radar', 'threat', 'unknown']))
  
  // Time window filter - how far back to show data (in milliseconds)
  // null means use env/default values, otherwise use the user-selected value
  const timeWindowMs = ref<number | null>(null)
  
  // Date range filter for historical viewing (when custom date range is selected)
  // null means use time window, otherwise use date range
  const dateRange = ref<{ start: string; end: string } | null>(null)
  
  // Sensor filter mode - how to filter sensors
  // 'all' = show all sensors
  // 'with_detections' = only sensors with recent RF detections (within time window)
  // 'without_detections' = only sensors without any RF detections
  const sensorFilterMode = ref<'all' | 'with_detections' | 'without_detections'>('all')

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
      const detectorRangeMeters = typeof pin.data?.detection_range_km === 'number'
        ? pin.data.detection_range_km * 1000
        : 1500
      const detectorSystemId = pin.data?.system_id !== undefined && pin.data?.system_id !== null
        ? String(pin.data.system_id)
        : null

      const dronesInRange = pins.value.filter(candidate => {
        if (candidate.type !== 'drone') return false
        const candidateSystemId = candidate.data?.system_id !== undefined && candidate.data?.system_id !== null
          ? String(candidate.data.system_id)
          : null
        const systemMatches = detectorSystemId && candidateSystemId && detectorSystemId === candidateSystemId
        return systemMatches || calculateDistanceMeters(pin, candidate) <= detectorRangeMeters
      })
      const droneTargetIds = dronesInRange
        .map(drone => drone.data?.drone_id)
        .filter((id): id is number | string => id !== null && id !== undefined)
        .map(id => String(id))

      enterFocusMode(pin.id, {
        detectorPinId: pin.id,
        mode: 'sensor',
        linkedDroneIds: droneTargetIds
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
      const currentZoom = mapInstance.value.getZoom() ?? viewport.value.zoom ?? 13
      const targetZoom = currentZoom

      const hasClusterPanel = selectedCluster.value !== null
      const hasInfoPanel = selectedPin.value !== null
      const willHaveInfoPanel = !hasInfoPanel // If no info panel currently, we're about to show one

      const clusterWidth = hasClusterPanel ? 350 : 0
      const infoWidth = hasInfoPanel ? 350 : (willHaveInfoPanel ? 350 : 0)
      const totalPanelWidth = clusterWidth + infoWidth

      const map = mapInstance.value
      let targetLat = pin.lat
      let targetLng = pin.lng

      if (totalPanelWidth > 0) {
        const pinPoint = map.latLngToContainerPoint([pin.lat, pin.lng])
        const offsetPoint = pinPoint.subtract(L.point(totalPanelWidth / 2, 0))
        const adjustedLatLng = map.containerPointToLatLng(offsetPoint)
        targetLat = adjustedLatLng.lat
        targetLng = adjustedLatLng.lng
      }

      map.flyTo([targetLat, targetLng], targetZoom, { animate: true })
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
    linkedSensorDroneIds.value = []
    viewport.value = {
      center: [42.6977, 23.3219], // Sofia, Bulgaria (where most drones are located)
      zoom: 10
    }
    mapInstance.value = null
  }

  const enterFocusMode = (
    pinId: string,
    options: { droneTargetId?: string | null; detectorPinId?: string | null; mode?: 'drone' | 'sensor'; linkedDroneIds?: string[] } = {}
  ) => {
    const mode = options.mode ?? 'drone'
    focusModeType.value = mode
    if (mode === 'sensor') {
      focusedDetectorPinId.value = options.detectorPinId ?? pinId
      focusedDronePinId.value = null
      focusedDroneTargetId.value = null
      linkedSensorDroneIds.value = options.linkedDroneIds ?? []
    } else {
      focusedDronePinId.value = pinId
      focusedDroneTargetId.value = options.droneTargetId ?? null
      focusedDetectorPinId.value = options.detectorPinId ?? null
      linkedSensorDroneIds.value = []
    }
    isFocusMode.value = true
  }

  const exitFocusMode = () => {
    focusedDronePinId.value = null
    focusedDroneTargetId.value = null
    focusedDetectorPinId.value = null
    isFocusMode.value = false
    focusModeType.value = 'none'
    linkedSensorDroneIds.value = []
    focusedTrajectoryTimestamp.value = null
    focusedDetectionId.value = null
  }

  const setFocusedTrajectoryTimestamp = (timestamp: string | null) => {
    focusedTrajectoryTimestamp.value = timestamp
  }

  const setFocusedDetectionId = (id: number | null) => {
    focusedDetectionId.value = id
  }

  const toggleMarkerType = (type: MapPin['type']) => {
    if (visibleMarkerTypes.value.has(type)) {
      visibleMarkerTypes.value.delete(type)
    } else {
      visibleMarkerTypes.value.add(type)
    }
    // Create a new Set to trigger reactivity
    visibleMarkerTypes.value = new Set(visibleMarkerTypes.value)
  }

  const setMarkerTypeVisible = (type: MapPin['type'], visible: boolean) => {
    if (visible) {
      visibleMarkerTypes.value.add(type)
    } else {
      visibleMarkerTypes.value.delete(type)
    }
    // Create a new Set to trigger reactivity
    visibleMarkerTypes.value = new Set(visibleMarkerTypes.value)
  }

  const isMarkerTypeVisible = (type: MapPin['type']): boolean => {
    return visibleMarkerTypes.value.has(type)
  }

  const getFilteredPins = (): MapPin[] => {
    // First filter by visible marker types
    let filtered = pins.value.filter(pin => visibleMarkerTypes.value.has(pin.type))
    
    // Apply sensor filter mode if sensors are visible
    if (visibleMarkerTypes.value.has('sensor') && sensorFilterMode.value !== 'all') {
      // Get detection window for "recent" detections
      const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
      const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
      
      let detectionWindowMs: number
      const userWindow = timeWindowMs.value
      if (userWindow !== null && userWindow > 0) {
        detectionWindowMs = userWindow
      } else if (isTestMode) {
        detectionWindowMs = ONE_YEAR_MS
      } else {
        const envValue = import.meta.env.VITE_DETECTION_WINDOW_MS
        detectionWindowMs = envValue ? parseInt(envValue, 10) : 60 * 60 * 1000 // Default: 1 hour
      }
      
      const cutoffTime = Date.now() - detectionWindowMs
      
      filtered = filtered.filter(pin => {
        if (pin.type !== 'sensor') {
          return true // Keep non-sensor pins
        }
        
        // Check if sensor has detections
        const detections = Array.isArray(pin.data?.detections) ? pin.data.detections : []
        const now = Date.now()
        const hasRecentDetections = detections.some((detection: any) => {
          if (!detection.timestamp) return false
          // Handle both boolean true and number 1 as active status
          const isActive = detection.status === true || detection.status === 1
          if (!isActive) return false
          const detectionTime = new Date(detection.timestamp).getTime()
          return detectionTime >= cutoffTime
        })
        
        // Log sensor filtering decision
        if (sensorFilterMode.value !== 'all' && detections.length > 0) {
          console.log(`[MapStore] Sensor filter check for ${pin.id}:`, {
            sensorId: pin.id,
            systemId: pin.data?.system_id,
            filterMode: sensorFilterMode.value,
            totalDetections: detections.length,
            windowMs: detectionWindowMs,
            windowHours: (detectionWindowMs / (60 * 60 * 1000)).toFixed(2),
            cutoffTime: new Date(cutoffTime).toISOString(),
            detections: detections.map((d: any) => ({
              id: d.id,
              timestamp: d.timestamp,
              timestampISO: d.timestamp ? new Date(d.timestamp).toISOString() : null,
              timestampMs: d.timestamp ? new Date(d.timestamp).getTime() : null,
              ageMs: d.timestamp ? (now - new Date(d.timestamp).getTime()) : null,
              ageHours: d.timestamp ? ((now - new Date(d.timestamp).getTime()) / (60 * 60 * 1000)).toFixed(2) : null,
              status: d.status,
              isRecent: d.timestamp ? new Date(d.timestamp).getTime() >= cutoffTime : false,
                passesFilter: d.timestamp && (d.status === true || d.status === 1) ? new Date(d.timestamp).getTime() >= cutoffTime && (d.status === true || d.status === 1) : false
            })),
            hasRecentDetections,
            willShow: sensorFilterMode.value === 'with_detections' ? hasRecentDetections : !hasRecentDetections
          })
        }
        
        // Apply filter mode
        if (sensorFilterMode.value === 'with_detections') {
          return hasRecentDetections
        } else if (sensorFilterMode.value === 'without_detections') {
          return !hasRecentDetections
        }
        
        return true // 'all' mode - show all sensors
      })
    }
    
    return filtered
  }

  const setTimeWindow = (windowMs: number | null) => {
    timeWindowMs.value = windowMs
    // Clear date range when setting time window (they're mutually exclusive)
    if (windowMs !== null) {
      dateRange.value = null
    }
  }

  const getTimeWindow = (): number | null => {
    return timeWindowMs.value
  }

  const setDateRange = (range: { start: string; end: string } | null) => {
    dateRange.value = range
    // Clear time window when setting date range (they're mutually exclusive)
    if (range !== null) {
      timeWindowMs.value = null
    }
  }

  const getDateRange = (): { start: string; end: string } | null => {
    return dateRange.value
  }

  const setSensorFilterMode = (mode: 'all' | 'with_detections' | 'without_detections') => {
    sensorFilterMode.value = mode
  }

  const getSensorFilterMode = (): 'all' | 'with_detections' | 'without_detections' => {
    return sensorFilterMode.value
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
    visibleMarkerTypes,
    timeWindowMs,
    dateRange,
    sensorFilterMode,
    
    // Getters
    selectedPinData,
    selectedClusterData,
    pinsCount,
    hasSelectedPin,
    hasSelectedCluster,
    availableViewportData,
    focusModeActive,
    linkedSensorDroneIds,
    
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
    focusDetectionPin,
    toggleMarkerType,
    setMarkerTypeVisible,
    isMarkerTypeVisible,
    getFilteredPins,
    setTimeWindow,
    getTimeWindow,
    setDateRange,
    getDateRange,
    setSensorFilterMode,
    getSensorFilterMode
  }
})

function calculateDistanceMeters(a: MapPin, b: MapPin): number {
  const toRadians = (deg: number) => deg * (Math.PI / 180)
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return 6371000 * c
}


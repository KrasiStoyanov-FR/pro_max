import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '@/store/map'
import { mapService } from '@/services/mapService'
import { databaseApi } from '@/services/api'
import { useRealtime, realtimeService } from '@/services/realtimeService'
import { useDataStore } from '@/store/data'
import { IS_LIVE_VIEW_PERF_MODE, PERF_TEST_DRONE_ID } from '@/config/perf'
import type { MapPin, MapViewport, DroneTrajectory, DroneTrajectoryPoint, DetectionCheckpoint } from '@/types/map'
import type { DronePosition, RFDetection, OperatorPosition, GpsUnitPosition, Drone } from '@/types/database'

// Time window configuration
// In performance mode we want very long windows so the map can show all data,
// and we also respect the legacy VITE_TEST_MODE flag if it is set.
const isTestMode = IS_LIVE_VIEW_PERF_MODE || import.meta.env.VITE_TEST_MODE === 'true'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

// Helper to format milliseconds to human-readable string
const formatTimeWindow = (ms: number): string => {
  if (ms >= 365 * 24 * 60 * 60 * 1000) return '1 year'
  if (ms >= 30 * 24 * 60 * 60 * 1000) return `${Math.round(ms / (30 * 24 * 60 * 60 * 1000))} months`
  if (ms >= 7 * 24 * 60 * 60 * 1000) return `${Math.round(ms / (7 * 24 * 60 * 60 * 1000))} weeks`
  if (ms >= 24 * 60 * 60 * 1000) return `${Math.round(ms / (24 * 60 * 60 * 1000))} days`
  if (ms >= 60 * 60 * 1000) return `${Math.round(ms / (60 * 60 * 1000))} hours`
  if (ms >= 60 * 1000) return `${Math.round(ms / (60 * 1000))} minutes`
  return `${Math.round(ms / 1000)} seconds`
}

// Helper to convert timestamp to milliseconds
const toTimeValue = (value: string | undefined | null) => value ? new Date(value).getTime() : 0

// Helper to check if a timestamp is within the date range (if set)
const isWithinDateRange = (timestamp: string | null | undefined, mapStore: ReturnType<typeof useMapStore>): boolean => {
  const dateRange = mapStore.getDateRange()
  if (!dateRange || !timestamp) return true // If no date range set, don't filter
  
  const timestampMs = new Date(timestamp).getTime()
  const startMs = new Date(dateRange.start).getTime()
  const endMs = new Date(dateRange.end).getTime()
  
  return timestampMs >= startMs && timestampMs <= endMs
}

// Cache for time window values to avoid excessive logging
const timeWindowCache = new Map<string, { value: number; source: string }>()

// Get time window with priority: user selection > test mode > env variable > default
const getTimeWindow = (mapStore: ReturnType<typeof useMapStore>, defaultMs: number, windowType: 'position' | 'detection' | 'maxAge' = 'position'): { value: number; source: string } => {
  // Check cache first
  const cacheKey = `${windowType}_${mapStore.getTimeWindow() ?? 'null'}_${isTestMode}`
  const cached = timeWindowCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Priority 1: User-selected time window from UI
  const userWindow = mapStore.getTimeWindow()
  if (userWindow !== null && userWindow > 0) {
    const result = { value: userWindow, source: 'user' }
    timeWindowCache.set(cacheKey, result)
    return result
  }
  
  // Priority 2: Test mode (1 year)
  if (isTestMode) {
    const result = { value: ONE_YEAR_MS, source: 'test' }
    timeWindowCache.set(cacheKey, result)
    return result
  }
  
  // Priority 3: Environment variable
  const envKey = windowType === 'position' 
    ? 'VITE_ACTIVE_POSITION_WINDOW_MS'
    : windowType === 'detection'
    ? 'VITE_DETECTION_WINDOW_MS'
    : 'VITE_MAX_POSITION_AGE_MS'
  const envValue = import.meta.env[envKey]
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (parsed > 0) {
      const result = { value: parsed, source: 'env' }
      timeWindowCache.set(cacheKey, result)
      return result
    }
  }
  
  // Priority 4: Default
  const result = { value: defaultMs, source: 'default' }
  timeWindowCache.set(cacheKey, result)
  return result
}

const getActivePositionWindow = (mapStore: ReturnType<typeof useMapStore>): number => {
  const result = getTimeWindow(mapStore, 15 * 60 * 1000, 'position') // Default: 15 minutes
  return result.value
}

const getDetectionWindow = (mapStore: ReturnType<typeof useMapStore>): number => {
  const result = getTimeWindow(mapStore, 60 * 60 * 1000, 'detection') // Default: 1 hour
  return result.value
}

const getMaxPositionAge = (mapStore: ReturnType<typeof useMapStore>): number => {
  const result = getTimeWindow(mapStore, 60 * 60 * 1000, 'maxAge') // Default: 1 hour
  return result.value
}

// Helper functions for coordinate and trajectory processing
const isValidCoordinate = (lat: number, lng: number) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  const nearZeroThreshold = 0.0001
  if (Math.abs(lat) < nearZeroThreshold && Math.abs(lng) < nearZeroThreshold) return false
  return true
}

const parseCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const haversineDistanceKm = (pointA: DroneTrajectoryPoint, pointB: DroneTrajectoryPoint) => {
  const toRadians = (deg: number) => deg * (Math.PI / 180)
  const R = 6371 // Earth radius in km
  const dLat = toRadians(pointB.lat - pointA.lat)
  const dLng = toRadians(pointB.lng - pointA.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(pointA.lat)) * Math.cos(toRadians(pointB.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const filterTrajectoryPoints = (points: DroneTrajectoryPoint[]): DroneTrajectoryPoint[] => {
  if (points.length < 2) {
    return points
  }

  const MAX_POINTS_PER_TRAJECTORY = 75
  const MAX_DISTANCE_KM = 400
  const MAX_SPEED_KMH = 900
  const MAX_TIME_GAP_HOURS = 72

  const cleaned: DroneTrajectoryPoint[] = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    const lastPoint = cleaned[cleaned.length - 1]

    const distanceKm = haversineDistanceKm(lastPoint, point)
    const timeDeltaMs = toTimeValue(point.timestamp) - toTimeValue(lastPoint.timestamp)
    const hours = timeDeltaMs > 0 ? timeDeltaMs / (1000 * 60 * 60) : 0
    const speedKmh = hours > 0 ? distanceKm / hours : distanceKm > 0 ? Infinity : 0

    const isDuplicate =
      Math.abs(lastPoint.lat - point.lat) <= 1e-6 &&
      Math.abs(lastPoint.lng - point.lng) <= 1e-6

    const isUnrealistic =
      distanceKm > MAX_DISTANCE_KM ||
      (hours > 0 && speedKmh > MAX_SPEED_KMH) ||
      hours > MAX_TIME_GAP_HOURS

    if (isDuplicate || isUnrealistic) {
      continue
    }

    cleaned.push(point)
  }

  if (cleaned.length < 2) {
    return cleaned
  }

  return cleaned.slice(-MAX_POINTS_PER_TRAJECTORY)
}

export function useMapPins() {
  const mapStore = useMapStore()
  const mapContainer = ref<HTMLElement | null>(null)
  const isMapReady = ref(false)
  const mapError = ref<string | null>(null)

  // Computed properties
  const pins = computed(() => mapStore.pins)
  const filteredPins = computed(() => mapStore.getFilteredPins())
  const selectedPin = computed(() => mapStore.selectedPin)
  const viewport = computed(() => mapStore.viewport)
  const isLoading = computed(() => mapStore.isLoading)
  const focusModeActive = computed(() => mapStore.focusModeActive)
  const focusedDronePinId = computed(() => mapStore.focusedDronePinId)
  const focusedDroneTargetId = computed(() => mapStore.focusedDroneTargetId)
  const focusedDetectorPinId = computed(() => mapStore.focusedDetectorPinId)
  const focusModeType = computed(() => mapStore.focusModeType)
  const linkedSensorDroneIds = computed(() => mapStore.linkedSensorDroneIds)
  const focusedDetectionId = computed(() => mapStore.focusedDetectionId)

  const highlightDetections = (id: number | null) => {
    const service = mapService as unknown as { highlightDetection?: (id: number | null) => void }
    service.highlightDetection?.(id)
  }

  // Initialize map

  const focusTrajectoryPoint = (point: DroneTrajectoryPoint) => {
    console.log('[MapPins] focusTrajectoryPoint called:', { timestamp: point.timestamp, lat: point.lat, lng: point.lng })
    if (!isMapReady.value) {
      console.warn('[MapPins] Map not ready')
      return
    }
    const dronePinId = focusedDronePinId.value
    if (!dronePinId) {
      console.warn('[MapPins] No focused drone pin ID')
      return
    }

    // Keep current zoom level; only pan to the detection point
    const currentZoom = mapService.getZoom()
    const zoomLevel = typeof currentZoom === 'number' ? currentZoom : (viewport.value.zoom ?? 13)
    mapService.flyTo(point.lat, point.lng, zoomLevel, { adjustForOverlays: true })
    mapService.highlightTrajectoryCheckpoint(dronePinId, point.timestamp)
    mapStore.setFocusedTrajectoryTimestamp(point.timestamp)
    
    // Try to find a matching detection for this trajectory point
    // Look for a detection with a timestamp close to this trajectory point's timestamp
    const selectedPin = mapStore.selectedPin
    const pointTime = toTimeValue(point.timestamp)
    console.log('[MapPins] Searching for detection matching timestamp:', point.timestamp, 'pointTime:', pointTime)
    
    // Search in selected pin's detections first
    let closestDetection: DetectionCheckpoint | null = null
    let closestTimeDiff = Infinity
    
    if (selectedPin && Array.isArray(selectedPin.data?.detections)) {
      const detections = selectedPin.data.detections as DetectionCheckpoint[]
      console.log('[MapPins] Searching in selected pin detections:', detections.length, 'detections')
      
      detections.forEach((detection) => {
        const detectionTime = toTimeValue(detection.timestamp)
        const timeDiff = Math.abs(detectionTime - pointTime)
        // Match if within 30 seconds (more lenient for better matching)
        if (timeDiff < 30000 && timeDiff < closestTimeDiff) {
          closestTimeDiff = timeDiff
          closestDetection = detection
        }
      })
    }
    
    // If not found in selected pin, search all drone pins
    if (!closestDetection) {
      console.log('[MapPins] Not found in selected pin, searching all drone pins')
      const allPins = mapStore.pins
      let totalDetections = 0
      for (const pin of allPins) {
        if (pin.type === 'drone' && Array.isArray(pin.data?.detections)) {
          const detections = pin.data.detections as DetectionCheckpoint[]
          totalDetections += detections.length
          detections.forEach((detection) => {
            const detectionTime = toTimeValue(detection.timestamp)
            const timeDiff = Math.abs(detectionTime - pointTime)
            // Match if within 30 seconds (more lenient for better matching)
            if (timeDiff < 30000 && timeDiff < closestTimeDiff) {
              closestTimeDiff = timeDiff
              closestDetection = detection
            }
          })
        }
      }
      console.log('[MapPins] Searched', totalDetections, 'total detections across all drone pins')
    }
    
    if (closestDetection) {
      console.log('[MapPins] Found matching detection for checkpoint:', {
        detectionId: closestDetection.id,
        timestamp: closestDetection.timestamp,
        timeDiff: closestTimeDiff,
        ms: 'ms',
        selectedPin: mapStore.selectedPin?.id,
        selectedPinType: mapStore.selectedPin?.type
      })
      
      // Set the focused detection ID - this will trigger InfoPanel to show it
      mapStore.setFocusedDetectionId(closestDetection.id)
      console.log('[MapPins] Set focusedDetectionId to:', closestDetection.id)
      
      // Try to find and select the detection pin if it exists
      const detectionPin = mapStore.pins.find(pin => {
        if (pin.type !== 'target') return false
        
        // Check if this pin's detection ID matches
        const pinDetectionId = typeof pin.data?.id === 'number'
          ? pin.data.id
          : (Array.isArray(pin.data?._ids) && pin.data._ids.length > 0
              ? (typeof pin.data._ids[0] === 'number' ? pin.data._ids[0] : Number(pin.data._ids[0]))
              : Number(String(pin.id).replace('rf-detection-', '')))
        
        return !Number.isNaN(pinDetectionId) && pinDetectionId === closestDetection.id
      })
      
      if (detectionPin) {
        console.log('[MapPins] Found detection pin on map:', detectionPin.id, '- selecting it')
        mapStore.selectPin(detectionPin)
      } else {
        console.log('[MapPins] No detection pin found on map for detection', closestDetection.id, '- InfoPanel should find it in drone detections array')
        // Keep the drone selected - InfoPanel will find the detection in its detections array
        // Don't change the selected pin, just ensure it's still the drone
        if (!mapStore.selectedPin || mapStore.selectedPin.type !== 'drone') {
          const dronePin = mapStore.pins.find(p => p.id === dronePinId)
          if (dronePin) {
            console.log('[MapPins] Ensuring drone is selected:', dronePin.id)
            mapStore.selectPin(dronePin)
          }
        }
      }
      
      highlightDetections(closestDetection.id)
      // Also highlight the checkpoint marker with timestamp for precise matching
      const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
      service.highlightDetectionCheckpoint?.(dronePinId, closestDetection.id, closestDetection.timestamp)
    } else {
      console.log('[MapPins] No matching detection found for checkpoint at', point.timestamp)
      mapStore.setFocusedDetectionId(null)
      highlightDetections(null)
      const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
      service.highlightDetectionCheckpoint?.(dronePinId, null)
    }
  }

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

      // Clustering is disabled - users have full control with pan/zoom
      // Only overlap handling (spiderfy) remains for markers on top of each other
      const serviceWithClusterToggle = mapService as unknown as { setClusteringEnabled?: (enabled: boolean) => void }
      serviceWithClusterToggle.setClusteringEnabled?.(false)

      mapService.onTrajectoryPointClick((point) => {
        focusTrajectoryPoint(point)
      })

      // Set up pin click handler
      mapService.onPinClick((pin: MapPin) => {
        console.log('[MapPins] Pin clicked:', { type: pin.type, id: pin.id, dataId: pin.data?.id })
        if (pin.type === 'target') {
          // Extract detection ID - check multiple sources
          let detectionId: number | null = null
          
          // First try: direct data.id
          if (typeof pin.data?.id === 'number') {
            detectionId = pin.data.id
          }
          // Second try: from _ids array (merged detections)
          else if (Array.isArray(pin.data?._ids) && pin.data._ids.length > 0) {
            const firstId = pin.data._ids[0]
            detectionId = typeof firstId === 'number' ? firstId : Number(firstId)
          }
          // Third try: extract from pin.id string
          else {
            const extracted = Number(String(pin.id).replace('rf-detection-', ''))
            if (!Number.isNaN(extracted)) {
              detectionId = extracted
            }
          }
          
          console.log('[MapPins] Extracted detection ID:', detectionId)
          
          // Select the pin first so InfoPanel shows it
          mapStore.selectPin(pin)
          
          // Then focus it (which sets focusedDetectionId)
          if (detectionId !== null) {
            mapStore.setFocusedDetectionId(detectionId)
            highlightDetections(detectionId)
            mapService.panToDetection(detectionId)
          } else {
            // Fallback: use focusDetectionPin which will try to extract ID
            mapStore.focusDetectionPin(pin)
          }
        } else {
        mapStore.flyToPin(pin) // This will also call selectPin internally
        }
      })

      // Cluster click handler removed - clustering is disabled
      // Users control zoom/pan manually

      isMapReady.value = true
      
      // Process any SSE events that arrived before map was ready
      if (pendingSSEEvents.length > 0) {
        console.log(`[MapPins] 🔄 Processing ${pendingSSEEvents.length} queued SSE events now that map is ready`)
        const events = [...pendingSSEEvents]
        pendingSSEEvents.length = 0 // Clear queue
        
        // Process each queued event
        for (const event of events) {
          if (event.type === 'position') {
            handleDronePositionUpdate(event.data, event.action as 'insert' | 'update' | 'delete')
          } else if (event.type === 'detection') {
            handleRFDetectionUpdate(event.data, event.action as 'insert' | 'update' | 'delete')
          } else if (event.type === 'gps') {
            handleGpsUnitPositionUpdate(event.data, event.action as 'insert' | 'update' | 'delete')
          }
        }
      }
      
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

    const getTrajectoryKey = (
      droneId: number | null | undefined,
      systemId: string | number | null | undefined,
      fallback: string | number | null | undefined
    ): string => {
      if (droneId !== null && droneId !== undefined) return `drone:${droneId}`
      if (systemId !== null && systemId !== undefined) return `system:${systemId}`
      const uniqueFallback = fallback ?? `generated-${Math.random().toString(36).slice(2)}`
      return `position:${uniqueFallback}`
    }
      
      // Fetch real data from database
      // Use cached sensors if available to avoid unnecessary API calls
      const [
        dronesResponse,
        dronePositionsResponse,
        rfDetectionsResponse,
        operatorPositionsResponse,
        gpsUnitPositionsResponse
      ] = await Promise.all([
        databaseApi.getDrones(),
        databaseApi.getDronePositions(),
        databaseApi.getRFDetections(),
        databaseApi.getOperatorPositions(),
        // Only fetch sensors if not cached
        sensorsLoaded.value 
          ? Promise.resolve({ success: true, data: Array.from(sensorsCache.value.values()) })
          : databaseApi.getGpsUnitPositions().then(response => {
              if (response.success && response.data) {
                // Update cache
                response.data.forEach((unit: GpsUnitPosition) => {
                  const key = unit.id ?? unit.unit_id ?? unit.system_id ?? `unit-${Math.random()}`
                  sensorsCache.value.set(String(key), unit)
                })
                sensorsLoaded.value = true
              }
              return response
            })
      ])

      const droneMetadata = new Map<string, Drone>()
      if (dronesResponse.success && Array.isArray(dronesResponse.data)) {
        dronesResponse.data.forEach((drone) => {
          const key = String(drone.id)
          droneMetadata.set(key, drone)
          
          // Log test drone metadata in perf mode
          if (IS_LIVE_VIEW_PERF_MODE && (drone.id === PERF_TEST_DRONE_ID || String(drone.id) === String(PERF_TEST_DRONE_ID))) {
            console.log('[MapPins] 🚀 TEST DRONE metadata loaded:', drone)
          }
        })
        
        if (IS_LIVE_VIEW_PERF_MODE) {
          const testDrone = droneMetadata.get(String(PERF_TEST_DRONE_ID))
          if (!testDrone) {
            console.warn(`[MapPins] ⚠️ TEST DRONE metadata (id=${PERF_TEST_DRONE_ID}) not found in drones response`)
            console.log('[MapPins] Available drone IDs:', Array.from(droneMetadata.keys()).slice(0, 10))
          }
        }
      } else {
        console.warn('[MapPins] Unable to load drones metadata', {
          success: dronesResponse.success,
          error: dronesResponse.error
        })
      }
      
      const pins: MapPin[] = []
      const droneTrajectoryMap = new Map<string, { points: DroneTrajectoryPoint[], positions: DronePosition[], latestPosition: DronePosition | null }>()
      const droneTrajectoryPoints = new Map<string, DroneTrajectoryPoint[]>()
      const droneDetectionsMap = new Map<string, DetectionCheckpoint[]>()

      const extractCoordinate = (source: Record<string, any>, keys: string[]): number | null => {
        for (const key of keys) {
          if (key in source) {
            const value = parseCoordinate(source[key])
            if (value !== null) {
              return value
            }
          }
        }
        return null
      }
      
      // Convert drone positions to map pins
      if (dronePositionsResponse.success && dronePositionsResponse.data) {
        // Log test drone positions in perf mode
        if (IS_LIVE_VIEW_PERF_MODE) {
          const testDronePositions = dronePositionsResponse.data.filter((p: DronePosition) => 
            p.drone_id === PERF_TEST_DRONE_ID || String(p.drone_id) === String(PERF_TEST_DRONE_ID)
          )
          if (testDronePositions.length > 0) {
            console.log(`[MapPins] 🚀 Found ${testDronePositions.length} TEST DRONE positions in API response:`, {
              firstPosition: testDronePositions[0],
              lastPosition: testDronePositions[testDronePositions.length - 1],
              totalPositions: dronePositionsResponse.data.length
            })
          } else {
            console.log(`[MapPins] ⚠️ No TEST DRONE positions found in API response (drone_id=${PERF_TEST_DRONE_ID})`)
            console.log('[MapPins] Sample drone_ids from response:', 
              dronePositionsResponse.data.slice(0, 10).map((p: DronePosition) => p.drone_id)
            )
          }
        }
        
        const processedPositionKeys = new Set<string>()
        dronePositionsResponse.data.forEach((position: DronePosition) => {
          const droneKey = getTrajectoryKey(position.drone_id, position.system_id, position.id)
          const lat = parseFloat(position.latitude.toString())
          const lng = parseFloat(position.longitude.toString())
          const timestamp = position.time

           if (!isValidCoordinate(lat, lng)) {
             return
           }

          const systemKey =
            position.system_id !== undefined && position.system_id !== null
              ? String(position.system_id)
              : 'unknown'
          const compositeKey = `${droneKey}::${systemKey}`
          const dedupeKey = `${compositeKey}::${timestamp ?? 'unknown'}`

          // Skip duplicate entries from the same detector/drone combination
          if (processedPositionKeys.has(dedupeKey)) {
            return
          }
          processedPositionKeys.add(dedupeKey)

          const point: DroneTrajectoryPoint = { lat, lng, timestamp }
          const entry = droneTrajectoryMap.get(droneKey) || { points: [], positions: [], latestPosition: null }

          entry.points.push(point)
          entry.positions.push(position)

          if (!entry.latestPosition) {
            entry.latestPosition = position
          } else {
            const currentLatestTime = toTimeValue(entry.latestPosition.time)
            const nextTime = toTimeValue(timestamp)
            if (nextTime >= currentLatestTime) {
              entry.latestPosition = position
            }
          }

          droneTrajectoryMap.set(droneKey, entry)
        })

        Array.from(droneTrajectoryMap.entries()).forEach(([droneId, entry]) => {
          if (!entry.positions.length) return

          // Sort trajectory by timestamp ascending before using
          entry.points.sort((a, b) => toTimeValue(a.timestamp) - toTimeValue(b.timestamp))
          entry.positions.sort((a, b) => toTimeValue(a.time) - toTimeValue(b.time))

          const filteredPoints = filterTrajectoryPoints(entry.points)

          let markerPosition: DronePosition | null = null

          if (filteredPoints.length > 0) {
            const lastPoint = filteredPoints[filteredPoints.length - 1]
            markerPosition = [...entry.positions].reverse().find(pos => {
              return Math.abs(toTimeValue(pos.time) - toTimeValue(lastPoint.timestamp)) < 1000
            }) || null
          }

          if (!markerPosition) {
            markerPosition = entry.positions[entry.positions.length - 1] || null
          }

          if (!markerPosition) return

          const latestLat = parseFloat(markerPosition.latitude.toString())
          const latestLng = parseFloat(markerPosition.longitude.toString())

          if (!isValidCoordinate(latestLat, latestLng)) {
            return
          }

          if (filteredPoints.length >= 2) {
            droneTrajectoryPoints.set(droneId, filteredPoints)
          }

          const systemAssociation = markerPosition.system_id ?? entry.latestPosition?.system_id ?? null
          const detectionKeys = [
            String(droneId),
            ...(systemAssociation !== null && systemAssociation !== undefined ? [`system:${systemAssociation}`] : [])
          ]
          const candidateDetections =
            detectionKeys.reduce<DetectionCheckpoint[] | undefined>((acc, key) => {
              const list = droneDetectionsMap.get(key)
              if (!list || list.length === 0) return acc
              return acc && acc.length > 0 ? acc.concat(list) : list.slice()
            }, undefined) || []

          // Cross-check by system_id and timestamp proximity to the markerPosition
          const markerTimeMs = toTimeValue(markerPosition.time)
          const MAX_TIME_DIFF_MS = 24 * 60 * 60 * 1000 // 24 hours window to capture historical detections

          // 1) Prefer detections from the same system_id within time window, sorted by closeness in time
          const sameSystemDetections = candidateDetections
            .filter(d => (d.systemId ?? null) === (systemAssociation ?? null))
            .map(d => ({ d, diff: Math.abs(toTimeValue(d.timestamp) - markerTimeMs) }))
            .filter(x => x.diff <= MAX_TIME_DIFF_MS)
            .sort((a, b) => a.diff - b.diff)
            .map(x => x.d)

          // 2) Fallback: nearest-in-time detections regardless of system (still within window)
          const nearestTimeDetections = sameSystemDetections.length > 0 ? [] : candidateDetections
            .map(d => ({ d, diff: Math.abs(toTimeValue(d.timestamp) - markerTimeMs) }))
            .filter(x => x.diff <= MAX_TIME_DIFF_MS)
            .sort((a, b) => a.diff - b.diff)
            .map(x => x.d)

          const detections = (sameSystemDetections.length > 0 ? sameSystemDetections : nearestTimeDetections).slice(0, 50) // cap list

          if (!isValidCoordinate(latestLat, latestLng)) {
            const fallbackPosition = [...entry.positions].reverse().find(pos => {
              const fallbackLat = parseFloat(pos.latitude.toString())
              const fallbackLng = parseFloat(pos.longitude.toString())
              return isValidCoordinate(fallbackLat, fallbackLng)
            })

            if (!fallbackPosition) {
              return
            }

            const fallbackLat = parseFloat(fallbackPosition.latitude.toString())
            const fallbackLng = parseFloat(fallbackPosition.longitude.toString())

            if (!isValidCoordinate(fallbackLat, fallbackLng)) {
              return
            }

            markerPosition = fallbackPosition
          }

          const pinLat = parseFloat(markerPosition.latitude.toString())
          const pinLng = parseFloat(markerPosition.longitude.toString())

          if (!isValidCoordinate(pinLat, pinLng)) {
            return
          }

        const metadata = droneMetadata.get(droneId)
          const resolvedSystemId = (markerPosition.system_id ?? entry.latestPosition?.system_id ?? metadata?.system_id) ?? null
          const displayName = metadata?.uas_id
            ? `Drone ${metadata.uas_id}`
            : `Drone ${droneId}`
          
          // Log test drone detection in performance mode
          if (IS_LIVE_VIEW_PERF_MODE && (metadata?.uas_id?.includes('TEST') || String(droneId) === String(PERF_TEST_DRONE_ID))) {
            console.log(`[MapPins] 🚀 TEST DRONE DETECTED:`, {
              droneId,
              displayName,
              systemId: resolvedSystemId,
              position: { lat: pinLat, lng: pinLng },
              trajectoryPoints: filteredPoints.length,
              timestamp: markerPosition.time
            })
          }
          const descriptor: string[] = []
          if (markerPosition.altitude !== undefined && markerPosition.altitude !== null) {
            descriptor.push(`Altitude: ${Number(markerPosition.altitude).toFixed(1)}m`)
          }
          if (markerPosition.speed !== undefined && markerPosition.speed !== null) {
            descriptor.push(`Speed: ${Number(markerPosition.speed).toFixed(1)} km/h`)
          }
          if (metadata?.serial_number) {
            descriptor.push(`Serial: ${metadata.serial_number}`)
          }
          if (metadata?.mac_address) {
            descriptor.push(`MAC: ${metadata.mac_address}`)
          }

          // Determine if drone is active based on:
          // 1. Last position timestamp (within configured window), OR
          // 2. RF detections within the configured window (if position is within max age)
          const ACTIVE_POSITION_WINDOW_MS = getActivePositionWindow(mapStore)
          const DETECTION_WINDOW_MS = getDetectionWindow(mapStore)
          const MAX_POSITION_AGE_MS = getMaxPositionAge(mapStore)
          
          const positionTime = toTimeValue(markerPosition.time)
          const now = Date.now()
          const positionAge = positionTime > 0 ? now - positionTime : Infinity
          
          // Check if position is recent (within configured window)
          const hasRecentPosition = positionTime > 0 && positionAge <= ACTIVE_POSITION_WINDOW_MS
          
          // Check if drone has RF detections within the configured window
          const hasRecentDetections = detections.some(detection => {
            const detectionTime = toTimeValue(detection.timestamp)
            const detectionAge = detectionTime > 0 ? now - detectionTime : Infinity
            return detectionTime > 0 && detectionAge <= DETECTION_WINDOW_MS
          })
          
          // Show drone if:
          // - Has recent position (within window), OR
          // - Has recent detections (within window) AND position is not too old (within max age)
          const shouldShow = hasRecentPosition || (hasRecentDetections && positionAge <= MAX_POSITION_AGE_MS)
          
          // Only add active drones to the map - skip inactive ones
          if (!shouldShow) {
            // Log why test drone is being filtered out
            if (IS_LIVE_VIEW_PERF_MODE && (String(droneId) === String(PERF_TEST_DRONE_ID) || metadata?.uas_id?.includes('TEST'))) {
              console.warn(`[MapPins] 🚀 TEST DRONE filtered out (not active):`, {
                droneId,
                displayName,
                hasRecentPosition,
                hasRecentDetections,
                positionAge,
                positionTime,
                now: Date.now(),
                ACTIVE_POSITION_WINDOW_MS,
                DETECTION_WINDOW_MS,
                MAX_POSITION_AGE_MS
              })
            }
            return
          }
          
          // Log when test drone IS being added
          if (IS_LIVE_VIEW_PERF_MODE && (String(droneId) === String(PERF_TEST_DRONE_ID) || metadata?.uas_id?.includes('TEST'))) {
            console.log(`[MapPins] ✅ TEST DRONE will be added to map:`, {
              droneId,
              displayName,
              position: { lat: pinLat, lng: pinLng },
              trajectoryPoints: filteredPoints.length,
              hasRecentPosition,
              hasRecentDetections
            })
          }

          pins.push({
            id: `drone-${droneId}`,
            lat: pinLat,
            lng: pinLng,
            title: displayName,
            description: descriptor.join(' • '),
            type: 'drone',
            status: 'active',
            priority: 'medium',
            data: {
              drone_id: markerPosition.drone_id,
              altitude: markerPosition.altitude,
              speed: markerPosition.speed,
              receiver_type: markerPosition.receiver_type,
              system_id: resolvedSystemId ? String(resolvedSystemId) : null,
              timestamp: markerPosition.time,
              trajectory: filteredPoints,
              detections,
              serialNumber: metadata?.serial_number ?? null,
              uasId: metadata?.uas_id ?? null,
              firstSeen: metadata?.first_seen ?? null,
              lastSeen: metadata?.last_seen ?? null,
              macAddress: metadata?.mac_address ?? null,
              isActive: metadata?.is_active ?? null
            },
            timestamp: markerPosition.time
          })
        })
      }
      
      // Aggregate RF detections per drone
      // RF detections are attached to sensor pins, not separate pins
      // Initialize detections map before processing - will be populated by RF detections
      const detectionsBySystemId = new Map<string, DetectionCheckpoint[]>()

      console.log('[MapPins] RF Detections API response:', {
        success: rfDetectionsResponse.success,
        dataLength: rfDetectionsResponse.data?.length ?? 0,
        error: rfDetectionsResponse.error
      })
      
      if (rfDetectionsResponse.success && rfDetectionsResponse.data) {
        // Check if date range filtering is active
        const dateRange = mapStore.getDateRange()
        let cutoffTime: number
        let now: number
        let DETECTION_WINDOW_MS: number | null = null
        
        if (dateRange) {
          // Historical mode: use date range
          cutoffTime = new Date(dateRange.start).getTime()
          now = new Date(dateRange.end).getTime()
        } else {
          // Real-time mode: use detection window
          DETECTION_WINDOW_MS = getDetectionWindow(mapStore)
          cutoffTime = Date.now() - DETECTION_WINDOW_MS
          now = Date.now()
        }
        
        console.log('[MapPins] RF Detections filter:', {
          dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : null,
          windowMs: DETECTION_WINDOW_MS,
          windowHours: DETECTION_WINDOW_MS ? (DETECTION_WINDOW_MS / (60 * 60 * 1000)).toFixed(2) : null,
          cutoffTime: new Date(cutoffTime).toISOString(),
          cutoffTimeMs: cutoffTime,
          now: now,
          nowISO: new Date(now).toISOString(),
          totalDetections: rfDetectionsResponse.data.length
        })
        
        // Log sample detections with their timestamps
        const sampleDetections = rfDetectionsResponse.data.slice(0, 5)
        console.log('[MapPins] Sample RF Detections (first 5):', sampleDetections.map((d: RFDetection) => {
          const detectionTime = d.time ? new Date(d.time).getTime() : null
          const age = detectionTime ? now - detectionTime : null
          const isRecent = detectionTime ? detectionTime >= cutoffTime : false
          return {
            id: d.id,
            system_id: d.system_id,
            time: d.time,
            timeISO: d.time ? new Date(d.time).toISOString() : null,
            timeMs: detectionTime,
            ageMs: age,
            ageHours: age ? (age / (60 * 60 * 1000)).toFixed(2) : null,
            detection_status: d.detection_status,
            isRecent: isRecent,
            passesFilter: isRecent && d.detection_status === true
          }
        }))

        const seenDetectionKeys = new Set<string>()

        const registerDetection = (detection: RFDetection): boolean => {
          const timeValue = detection.time ? new Date(detection.time).getTime() : NaN
          const normalizedTime = Number.isFinite(timeValue) ? timeValue : detection.time
          let key: string | null = null

          if (detection.system_id) {
            key = `system:${detection.system_id}-${normalizedTime}`
          } else if (detection.drone_id !== null && detection.drone_id !== undefined) {
            key = `drone:${detection.drone_id}-${normalizedTime}`
          }

          if (!key) {
            return true
          }

          if (seenDetectionKeys.has(key)) {
            return false
          }

          seenDetectionKeys.add(key)
          return true
        }

        // RF detections have NO coordinates - they're shown at the sensor location
        // This function gets the sensor coordinates for a detection based on system_id
        const getSensorCoordinatesForDetection = (systemId: string | null | undefined): { lat: number; lng: number; name?: string | null } | null => {
          if (!systemId) return null
          return systemIdToSensorCoordinates.get(String(systemId)) ?? null
        }

        // Build system_id -> GPS unit (sensor) coordinates map
        // RF detections have NO coordinates - they're shown at the sensor location that detected them
        const systemIdToSensorCoordinates = new Map<string, { lat: number; lng: number; name?: string | null }>()
        if (gpsUnitPositionsResponse.success && gpsUnitPositionsResponse.data) {
          gpsUnitPositionsResponse.data.forEach((unit: GpsUnitPosition) => {
            const lat = parseCoordinate((unit as any)?.gps_lat) ??
                       parseCoordinate(unit.latitude) ?? 
                       parseCoordinate((unit as any)?.lat) ?? 
                       parseCoordinate((unit as any)?.latitude_deg)
            const lng = parseCoordinate((unit as any)?.gps_lon) ??
                       parseCoordinate(unit.longitude) ?? 
                       parseCoordinate((unit as any)?.lng) ?? 
                       parseCoordinate((unit as any)?.longitude_deg)

            if (lat !== null && lng !== null && isValidCoordinate(lat, lng)) {
              // Store by system_id - this is where RF detections will be shown
              if (unit.system_id) {
                systemIdToSensorCoordinates.set(String(unit.system_id), { 
                  lat, 
                  lng, 
                  name: (unit as any)?.unit_name ?? unit.name ?? null 
                })
              }
              // Also store by unit_id as fallback
              if (unit.unit_id !== null && unit.unit_id !== undefined) {
                systemIdToSensorCoordinates.set(String(unit.unit_id), { 
                  lat, 
                  lng, 
                  name: (unit as any)?.unit_name ?? unit.name ?? null 
                })
              }
            }
          })
        }

        // Group RF detections by system_id (sensor) - they will be attached to sensor pins
        // RF detections have NO coordinates - they indicate a sensor has detected something
        // (detectionsBySystemId is already declared above)
        
        // Initialize counters before processing
        let filteredCount = 0
        let registeredCount = 0
        let skippedCount = 0
        
        rfDetectionsResponse.data.forEach((detection: RFDetection) => {
          const detectionTimeMs = detection.time ? new Date(detection.time).getTime() : NaN
          
          // Filter detections based on date range or time window
          if (dateRange) {
            // Historical mode: check if within date range
            if (Number.isFinite(detectionTimeMs) && (detectionTimeMs < cutoffTime || detectionTimeMs > now)) {
              filteredCount++
              return
            }
          } else {
            // Real-time mode: filter out detections OLDER than the cutoff
            if (Number.isFinite(detectionTimeMs) && detectionTimeMs < cutoffTime) {
              filteredCount++
              return
            }
          }
          if (!registerDetection(detection)) {
            skippedCount++
            return
          }
          registeredCount++

          const checkpoint: DetectionCheckpoint = {
            id: detection.id,
            timestamp: detection.time,
            frequency: detection.frequency,
            signalStrength: detection.signal_strength,
            status: detection.detection_status,
            systemId: detection.system_id ?? null,
            droneId: detection.drone_id ?? null
          }

          // Also add to drone detections map for legacy support
          const detectionKey = getTrajectoryKey(detection.drone_id, detection.system_id, detection.id)
          const addDetectionToMap = (key: string | null) => {
            if (!key) return
            const list = droneDetectionsMap.get(key) || []
            list.push(checkpoint)
            droneDetectionsMap.set(key, list)
          }
          addDetectionToMap(detectionKey)
          if (detection.system_id !== null && detection.system_id !== undefined) {
            addDetectionToMap(`system:${detection.system_id}`)
          }

          // Group by system_id to attach to sensor pins
          if (detection.system_id) {
            const systemId = String(detection.system_id)
            const existing = detectionsBySystemId.get(systemId) || []
            existing.push(checkpoint)
            detectionsBySystemId.set(systemId, existing)
          }
        })
        
        // Log summary with detailed detection info
        const detectionsBySensorDetails = Array.from(detectionsBySystemId.entries()).map(([systemId, detections]) => {
          const recentDetections = detections.filter(d => {
            if (!d.timestamp) return false
            const detectionTime = new Date(d.timestamp).getTime()
            return detectionTime >= cutoffTime && d.status === true
          })
          return {
            systemId,
            totalDetections: detections.length,
            recentDetections: recentDetections.length,
            sampleDetections: detections.slice(0, 3).map(d => ({
              id: d.id,
              timestamp: d.timestamp,
              timestampISO: d.timestamp ? new Date(d.timestamp).toISOString() : null,
              timestampMs: d.timestamp ? new Date(d.timestamp).getTime() : null,
              ageMs: d.timestamp ? (now - new Date(d.timestamp).getTime()) : null,
              ageHours: d.timestamp ? ((now - new Date(d.timestamp).getTime()) / (60 * 60 * 1000)).toFixed(2) : null,
              status: d.status,
              isRecent: d.timestamp ? new Date(d.timestamp).getTime() >= cutoffTime : false
            }))
          }
        })
        
        console.log(`[MapPins] RF Detections processing summary:`, {
          totalFromAPI: rfDetectionsResponse.data.length,
          filteredByTime: filteredCount,
          skippedDuplicates: skippedCount,
          registered: registeredCount,
          detectionsBySensor: detectionsBySystemId.size,
          availableSensors: Array.from(systemIdToSensorCoordinates.keys()).length,
          sampleSensors: Array.from(systemIdToSensorCoordinates.keys()).slice(0, 5),
          detectionsBySensorDetails: detectionsBySensorDetails.slice(0, 10) // First 10 sensors
        })
      }
      
      // Prebuild detector lookup by system_id so operators can reference it
      const systemIdToDetector: Map<string, { name?: string | null; unit_id?: number | null }> = new Map()
      if (gpsUnitPositionsResponse.success && gpsUnitPositionsResponse.data) {
        gpsUnitPositionsResponse.data.forEach((unit: GpsUnitPosition) => {
          if (typeof (unit as any)?.system_id === 'string') {
            systemIdToDetector.set((unit as any).system_id as string, {
              name: (unit as any).name ?? null,
              unit_id: (unit as any).unit_id ?? null
            })
          } else if (typeof (unit as any)?.unit_id !== 'undefined') {
            systemIdToDetector.set(String((unit as any).unit_id), {
              name: (unit as any).name ?? null,
              unit_id: (unit as any).unit_id ?? null
            })
          }
        })
      }

      // Convert operator positions to map pins (with near-duplicate de-duplication)
      if (operatorPositionsResponse.success && operatorPositionsResponse.data) {
        // First, map raw operator positions to tentative pins
        const rawOperatorPins = operatorPositionsResponse.data.reduce<MapPin[]>((acc, position: OperatorPosition) => {
          const lat = parseFloat(position.latitude.toString())
          const lng = parseFloat(position.longitude.toString())

          if (!isValidCoordinate(lat, lng)) {
            return acc
          }

          const detectorKey = position.system_id !== null && position.system_id !== undefined
            ? String(position.system_id)
            : (position.drone_id !== null && position.drone_id !== undefined ? String(position.drone_id) : null)
          const detectorMeta = detectorKey
            ? (systemIdToDetector.get(detectorKey) ?? null)
            : null

          const label = (() => {
            const base = position.drone_id !== null && position.drone_id !== undefined
              ? `Operator - Drone ${position.drone_id}`
              : 'Operator'
            if (detectorMeta?.name) return `${base} • ${detectorMeta.name}`
            if (position.system_id !== null && position.system_id !== undefined) return `${base} • system:${position.system_id}`
            return `${base} (unassigned)`
          })()

          acc.push({
            id: `operator-pos-${position.id}`,
            lat,
            lng,
            title: label,
            description: (() => {
              const parts: string[] = []
              if (position.drone_id !== null && position.drone_id !== undefined) parts.push(`Drone ${position.drone_id}`)
              if (position.system_id !== null && position.system_id !== undefined) parts.push(`System ${position.system_id}`)
              if (detectorMeta?.name) parts.push(`Detector: ${detectorMeta.name}`)
              return parts.length ? `Operator linked to ${parts.join(' • ')}` : 'Operator'
            })(),
            type: 'friendly',
            status: 'active',
            priority: 'low',
            data: {
              drone_id: position.drone_id,
              system_id: position.system_id ?? null,
              timestamp: position.time
            },
            timestamp: position.time
          })

          return acc
        }, [])

        // De-duplicate operators with same/nearly same location and same key modifiers
        const MERGE_DISTANCE_KM = 0.02 // ~20 meters
        const mergedOperatorPins: MapPin[] = []

        // Helper: try to find an existing cluster this pin belongs to
        const findClusterIndex = (pin: MapPin): number => {
          for (let i = 0; i < mergedOperatorPins.length; i++) {
            const cluster = mergedOperatorPins[i]
            const sameDrone =
              (cluster.data?.drone_id ?? null) === (pin.data?.drone_id ?? null)
            const sameSystem =
              (cluster.data?.system_id ?? null) === (pin.data?.system_id ?? null)

            if (sameDrone && sameSystem) {
              const distanceKm = haversineDistanceKm(
                { lat: cluster.lat, lng: cluster.lng, timestamp: cluster.timestamp! },
                { lat: pin.lat, lng: pin.lng, timestamp: pin.timestamp! }
              )
              if (distanceKm <= MERGE_DISTANCE_KM) {
                return i
              }
            }
          }
          return -1
        }

        rawOperatorPins.forEach((pin) => {
          const idx = findClusterIndex(pin)
          if (idx === -1) {
            // Create new cluster baseline with aggregation meta
            mergedOperatorPins.push({
              ...pin,
              // Track aggregation count and sample ids inside data
              data: {
                ...pin.data,
                _aggregate_count: 1,
                _ids: [pin.id]
              }
            })
          } else {
            const cluster = mergedOperatorPins[idx]
            const count = (cluster.data?._aggregate_count as number) ?? 1
            const ids = (cluster.data?._ids as string[]) ?? [cluster.id]

            // Update centroid minimally by simple averaging for stability
            const newCount = count + 1
            const newLat = (cluster.lat * count + pin.lat) / newCount
            const newLng = (cluster.lng * count + pin.lng) / newCount

            mergedOperatorPins[idx] = {
              ...cluster,
              lat: newLat,
              lng: newLng,
              title: count >= 1
                ? `Operators (${newCount})`
                : cluster.title,
              description: cluster.data?.drone_id
                ? `Operators near drone ${cluster.data.drone_id}`
                : 'Operators (aggregated)',
              data: {
                ...cluster.data,
                _aggregate_count: newCount,
                _ids: [...ids, pin.id]
              }
            }
          }
        })

        pins.push(...mergedOperatorPins)
      }

      if (gpsUnitPositionsResponse.success && gpsUnitPositionsResponse.data) {
        const seenSensorKeys = new Set<string>()
        const gpsPins = gpsUnitPositionsResponse.data.reduce<MapPin[]>((acc, unit: GpsUnitPosition) => {
          const lat = extractCoordinate(unit, ['latitude', 'lat', 'latitude_deg', 'gps_lat', 'geo_lat', 'y'])
          const lng = extractCoordinate(unit, ['longitude', 'lng', 'lon', 'longitude_deg', 'gps_lng', 'gps_lon', 'geo_lon', 'x'])
          
          if (lat === null || lng === null || !isValidCoordinate(lat, lng)) {
            return acc
          }

          // Build canonical system id for associations
          const canonicalSystemId = unit.system_id ?? (typeof unit.unit_id !== 'undefined' ? String(unit.unit_id) : null)

          // Build a unique key that allows multiple entries per unit_id/system_id by including coordinates (and time if present)
          const baseKey =
            (typeof unit.unit_id !== 'undefined' && unit.unit_id !== null ? String(unit.unit_id) : null) ??
            (unit.system_id ?? null) ??
            ((unit as any)?.unit_name ?? null) ??
            (unit.name ?? 'unknown')

          const keyParts = [String(baseKey), String(lat), String(lng)]
          if (unit.time) {
            keyParts.push(String(unit.time))
          }
          const unitKey = keyParts.join(':')

          if (seenSensorKeys.has(unitKey)) {
            return acc
          }
          seenSensorKeys.add(unitKey)

          const statusRaw = typeof unit.status === 'string' ? unit.status.toLowerCase() : null
          const status = statusRaw === 'inactive' || statusRaw === 'offline' ? 'inactive' : 'active'
          
          // Use unit_name or name if available, otherwise construct label
          const displayName = (unit as any)?.unit_name || unit.name || `RF Receiver ${baseKey}`
          const description = unit.status 
            ? `Detection Source • Status: ${unit.status}` 
            : 'RF Detection Receiver • Active monitoring'

          // Remember detector by system or unit id for association
          if (canonicalSystemId) {
            systemIdToDetector.set(String(canonicalSystemId), { name: unit.name ?? null, unit_id: unit.unit_id ?? null })
          }

          // Attach RF detections to this sensor if it has any
          const sensorDetections: DetectionCheckpoint[] = canonicalSystemId 
            ? (detectionsBySystemId.get(String(canonicalSystemId)) || [])
            : []
          
          // Update status to 'warning' if sensor has active detections
          // Check for recent active detections (within time window)
          // Note: status can be boolean true or number 1 (both mean active)
          const hasActiveDetections = sensorDetections.some(d => {
            // Handle both boolean true and number 1 as active status
            // Type assertion needed because status might be 1 (number) from DB
            const statusValue = d.status as boolean | number
            const isActive = statusValue === true || statusValue === 1
            if (!isActive) return false
            if (!d.timestamp) return false
            const detectionTime = new Date(d.timestamp).getTime()
            const DETECTION_WINDOW_MS = getDetectionWindow(mapStore)
            const cutoffTime = Date.now() - DETECTION_WINDOW_MS
            return detectionTime >= cutoffTime
          })
          const finalStatus = hasActiveDetections ? 'warning' : status
          const finalPriority = hasActiveDetections ? 'high' : 'medium'
          
          // Log sensor detection details for debugging
          if (sensorDetections.length > 0) {
            const dateRange = mapStore.getDateRange()
            const DETECTION_WINDOW_MS = dateRange ? null : getDetectionWindow(mapStore)
            const cutoffTime = dateRange ? new Date(dateRange.start).getTime() : (DETECTION_WINDOW_MS ? Date.now() - DETECTION_WINDOW_MS : null)
            const now = dateRange ? new Date(dateRange.end).getTime() : Date.now()
            
            console.log(`[MapPins] Sensor ${unit.system_id} detections:`, {
              systemId: unit.system_id,
              totalDetections: sensorDetections.length,
              dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : null,
              detections: sensorDetections.map(d => ({
                id: d.id,
                timestamp: d.timestamp,
                timestampISO: d.timestamp ? new Date(d.timestamp).toISOString() : null,
                timestampMs: d.timestamp ? new Date(d.timestamp).getTime() : null,
                ageMs: d.timestamp ? (now - new Date(d.timestamp).getTime()) : null,
                ageHours: d.timestamp ? ((now - new Date(d.timestamp).getTime()) / (60 * 60 * 1000)).toFixed(2) : null,
                status: d.status,
                statusType: typeof d.status,
                cutoffTime: cutoffTime ? new Date(cutoffTime).toISOString() : null,
                isRecent: d.timestamp && cutoffTime ? new Date(d.timestamp).getTime() >= cutoffTime : false,
                passesFilter: (() => {
                  const statusValue = d.status as boolean | number
                  const isActive = statusValue === true || statusValue === 1
                  if (dateRange) {
                    return d.timestamp && isActive ? isWithinDateRange(d.timestamp, mapStore) && isActive : false
                  } else {
                    return d.timestamp && isActive && cutoffTime ? new Date(d.timestamp).getTime() >= cutoffTime && isActive : false
                  }
                })()
              })),
              hasActiveDetections,
              windowMs: DETECTION_WINDOW_MS,
              windowHours: DETECTION_WINDOW_MS ? (DETECTION_WINDOW_MS / (60 * 60 * 1000)).toFixed(2) : null
            })
          }

          const pinData = {
            unit_id: unit.unit_id ?? null,
            system_id: canonicalSystemId ?? null,
            status: unit.status,
            timestamp: unit.time ?? null,
            detection_range_km: 1.5, // 1.5km detection range
            // Attach RF detections to sensor pin
            detections: sensorDetections.length > 0 ? sensorDetections : undefined,
            hasRFDetections: sensorDetections.length > 0
          }
          
          // Log what we're attaching to the sensor pin
          if (sensorDetections.length > 0) {
            console.log(`[MapPins] Attaching detections to sensor pin:`, {
              pinId: `gps-unit-${unitKey}`,
              systemId: canonicalSystemId,
              detectionsCount: sensorDetections.length,
              detections: sensorDetections.map(d => ({
                id: d.id,
                timestamp: d.timestamp,
                status: d.status,
                statusType: typeof d.status,
                systemId: d.systemId
              })),
              pinDataDetections: pinData.detections?.map((d: DetectionCheckpoint) => ({
                id: d.id,
                timestamp: d.timestamp,
                status: d.status,
                statusType: typeof d.status
              }))
            })
          }
          
          acc.push({
            id: `gps-unit-${unitKey}`,
            lat,
            lng,
            title: displayName,
            description: sensorDetections.length > 0
              ? `${sensorDetections.length} RF Detection${sensorDetections.length === 1 ? '' : 's'} • ${description}`
              : description,
            type: 'sensor',
            status: finalStatus,
            priority: finalPriority,
            data: pinData,
            timestamp: unit.time ?? new Date().toISOString()
          })

          return acc
        }, [])

        pins.push(...gpsPins)
      } else {
        console.warn('[MapPins] GPS unit positions unavailable or empty', {
          success: gpsUnitPositionsResponse.success,
          error: gpsUnitPositionsResponse.error
        })
      }

      // RF detections are now attached to sensor pins, not separate pins
      // No detection pin deduplication needed
      


      // Set pins from database
      if (pins.length > 0) {
        // Deduplicate pins by id to avoid duplicates across refreshes
        const dedupedPins = Array.from(
          pins.reduce((acc, pin) => {
            acc.set(pin.id, pin)
            return acc
          }, new Map<string, MapPin>())
        ).map(([, pin]) => pin)

          mapStore.setPins(dedupedPins)
          
          // Log test drone in final pins array for incremental refresh
          if (IS_LIVE_VIEW_PERF_MODE) {
            const testDronePin = dedupedPins.find(p => 
              p.id === `drone-${PERF_TEST_DRONE_ID}` || 
              (p.type === 'drone' && p.data?.drone_id === PERF_TEST_DRONE_ID) ||
              (typeof p.title === 'string' && p.title.includes('TEST'))
            )
            if (testDronePin) {
              console.log(`[MapPins] ✅ Incremental refresh: TEST DRONE pin ready for map:`, {
                id: testDronePin.id,
                title: testDronePin.title,
                position: { lat: testDronePin.lat, lng: testDronePin.lng },
                trajectoryPoints: Array.isArray(testDronePin.data?.trajectory) ? testDronePin.data.trajectory.length : 0,
                totalPins: dedupedPins.length
              })
            } else {
              console.warn(`[MapPins] ⚠️ Incremental refresh: TEST DRONE pin NOT found! Looking for drone_id=${PERF_TEST_DRONE_ID}`)
              console.log('[MapPins] Available drone pins:', dedupedPins.filter(p => p.type === 'drone').slice(0, 5).map(p => ({
                id: p.id,
                droneId: p.data?.drone_id,
                title: p.title
              })))
            }
          }
          
          // Add pins and trajectories to map (filtered by visible types)
          if (isMapReady.value) {
            const filtered = dedupedPins.filter(pin => mapStore.isMarkerTypeVisible(pin.type))
            mapService.addPins(filtered, mapStore.visibleMarkerTypes)
          
          // Only show trajectories for visible drone pins
          // Extract trajectories directly from visible drone pins
          const visibleTrajectories: DroneTrajectory[] = filtered
            .filter(pin => pin.type === 'drone' && Array.isArray(pin.data?.trajectory) && pin.data.trajectory.length > 1)
            .map(pin => {
              // Extract droneId from pin.id (format: "drone-{droneId}")
              const droneId = pin.id.replace('drone-', '')
              return {
                droneId: droneId,
                points: pin.data.trajectory as DroneTrajectoryPoint[]
              }
            })
          
          mapService.updateDroneTrajectories(visibleTrajectories)
          syncFocusModeVisuals()
        }
      } else {
        console.warn('[MapPins] No data available from database')
        mapStore.setPins([])
        if (isMapReady.value) {
          mapService.updateDroneTrajectories([])
          mapService.clearTrajectoryCheckpoints()
        }
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
    if (isMapReady.value && mapStore.isMarkerTypeVisible(pin.type)) {
      mapService.addPins([pin], mapStore.visibleMarkerTypes)
    }
  }

  // Remove a pin
  const removePin = (pinId: string) => {
    mapStore.removePin(pinId)
    // Note: mapService doesn't have individual pin removal, 
    // so we'd need to refresh all pins
    if (isMapReady.value) {
      mapService.addPins(mapStore.pins, mapStore.visibleMarkerTypes)
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
  const refreshPins = async (clearCacheFirst = false) => {
    if (clearCacheFirst) {
      databaseApi.clearCache()
    }
    await loadPins()
  }

  const syncFocusModeVisuals = () => {
    if (!isMapReady.value) return

      if (focusModeActive.value) {
        if (focusModeType.value === 'sensor' && focusedDetectorPinId.value) {
          const detectorPin = mapStore.pins.find(pin => pin.id === focusedDetectorPinId.value)
          const detectorSystemId = detectorPin?.data?.system_id ?? null
          const detectorRangeMeters = detectorPin?.data?.detection_range_km
            ? Number(detectorPin.data.detection_range_km) * 1000
            : 1500

          mapService.applyFocusMode({
            focusPinId: focusedDetectorPinId.value,
            systemId: detectorSystemId,
            detectorPinId: focusedDetectorPinId.value,
            mode: 'sensor',
            detectorRangeMeters,
            linkedDroneIds: linkedSensorDroneIds.value
          })

          mapService.clearTrajectoryCheckpoints()
          mapStore.setFocusedTrajectoryTimestamp(null)
          highlightDetections(null)
        } else if (focusedDronePinId.value) {
          const focusedPin = mapStore.pins.find(pin => pin.id === focusedDronePinId.value)
          const trajectoryPoints = (focusedPin?.data?.trajectory ?? []) as DroneTrajectoryPoint[]
          const droneSystemId = focusedPin?.data?.system_id ?? null

          mapService.applyFocusMode({
            focusPinId: focusedDronePinId.value,
            droneTargetId: focusedDroneTargetId.value,
            systemId: droneSystemId,
            detectorPinId: focusedDetectorPinId.value,
            mode: 'drone'
          })

          if (trajectoryPoints.length > 0) {
            // Trajectory checkpoints are from drone_positions, not RF detections
            // They're independent - show them when drones are visible
            if (mapStore.isMarkerTypeVisible('drone')) {
              mapService.showTrajectoryCheckpoints(focusedDronePinId.value, trajectoryPoints)
              mapService.highlightTrajectoryCheckpoint(focusedDronePinId.value, trajectoryPoints[trajectoryPoints.length - 1].timestamp)
              mapStore.setFocusedTrajectoryTimestamp(trajectoryPoints[trajectoryPoints.length - 1].timestamp)
            } else {
              // Drones filter is disabled - clear checkpoints
              mapService.clearTrajectoryCheckpoints(focusedDronePinId.value)
              mapStore.setFocusedTrajectoryTimestamp(null)
            }
          } else {
            mapService.clearTrajectoryCheckpoints(focusedDronePinId.value)
            mapStore.setFocusedTrajectoryTimestamp(null)
          }
          highlightDetections(focusedDetectionId.value ?? null)
        } else {
          mapService.applyFocusMode({ focusPinId: null })
          mapService.clearTrajectoryCheckpoints()
          mapStore.setFocusedTrajectoryTimestamp(null)
          highlightDetections(null)
        }
      } else {
        mapService.applyFocusMode({ focusPinId: null })
        mapService.clearTrajectoryCheckpoints()
        mapStore.setFocusedTrajectoryTimestamp(null)
        highlightDetections(null)
      }
  }

  watch([focusModeActive, focusModeType, focusedDronePinId, focusedDroneTargetId, focusedDetectorPinId, linkedSensorDroneIds], () => {
    syncFocusModeVisuals()
  })

  watch(
    () => pins.value,
    () => {
      syncFocusModeVisuals()
    }
  )

  // Watch for filter changes and update map
  // Convert Set to Array for reactivity
  watch(
    () => [Array.from(mapStore.visibleMarkerTypes), mapStore.sensorFilterMode],
    ([newTypes, sensorMode], [oldTypes, oldSensorMode]) => {
      if (isMapReady.value) {
        const filtered = mapStore.getFilteredPins()
        
        // Log filter changes for debugging
        const targetVisible = mapStore.isMarkerTypeVisible('target')
        const targetPins = filtered.filter(pin => pin.type === 'target')
        const sensorPins = filtered.filter(pin => pin.type === 'sensor')
        console.log(`[MapPins] Filter changed:`, {
          visibleTypes: Array.from(newTypes),
          sensorFilterMode: sensorMode,
          targetVisible: targetVisible,
          targetPinsCount: targetPins.length,
          sensorPinsCount: sensorPins.length,
          totalFilteredPins: filtered.length,
          totalPinsInStore: mapStore.pins.length
        })
        
        mapService.addPins(filtered, mapStore.visibleMarkerTypes)
        
        // Update trajectories to only show for visible drones
        const visibleDronePins = filtered.filter(pin => pin.type === 'drone')
        const visibleDroneIds = new Set<string>()
        
        visibleDronePins.forEach(pin => {
          const droneIdFromPin = pin.id.replace('drone-', '')
          visibleDroneIds.add(droneIdFromPin)
          visibleDroneIds.add(pin.id)
        })
        
        // Get all trajectories from the store's pins (not just filtered) that have trajectory data
        // But only include those that match visible drones
        const allTrajectories: DroneTrajectory[] = mapStore.pins
          .filter(pin => pin.type === 'drone' && Array.isArray(pin.data?.trajectory) && pin.data.trajectory.length > 1)
          .map(pin => {
            const droneId = pin.id.replace('drone-', '')
            return {
              droneId: droneId, // Use the extracted ID
              points: pin.data.trajectory as DroneTrajectoryPoint[]
            }
          })
          .filter(trajectory => {
            // Only include trajectories for visible drones
            return visibleDroneIds.has(trajectory.droneId) || 
                   visibleDroneIds.has(`drone-${trajectory.droneId}`)
          })
        
        const visibleTrajectories = allTrajectories
        
        mapService.updateDroneTrajectories(visibleTrajectories)
        
        // Update trajectory checkpoints if in Focus Mode - respect drones filter
        // Trajectory checkpoints are from drone_positions, not RF detections
        if (focusModeActive.value && focusedDronePinId.value) {
          const focusedPin = mapStore.pins.find(pin => pin.id === focusedDronePinId.value)
          const trajectoryPoints = (focusedPin?.data?.trajectory ?? []) as DroneTrajectoryPoint[]
          if (trajectoryPoints.length > 0) {
            if (mapStore.isMarkerTypeVisible('drone')) {
              mapService.showTrajectoryCheckpoints(focusedDronePinId.value, trajectoryPoints)
            } else {
              // Drones filter is disabled - clear checkpoints
              mapService.clearTrajectoryCheckpoints(focusedDronePinId.value)
            }
          }
        }
      }
    }
  )

  // Watch for time window and date range changes and reload pins with new filter
  watch(
    () => [mapStore.timeWindowMs, mapStore.dateRange],
    () => {
      if (isMapReady.value) {
        // Reload pins with new time window or date range - this will re-filter based on the new settings
        void loadPins()
      }
    }
  )

  watch(focusedDetectionId, (newId) => {
    if (!isMapReady.value) return
    highlightDetections(newId ?? null)
    // Also highlight the checkpoint if there's a focused drone
    if (focusedDronePinId.value && newId) {
      // Find the detection to get its timestamp
      const selectedPin = mapStore.selectedPin
      if (selectedPin && Array.isArray(selectedPin.data?.detections)) {
        const detections = selectedPin.data.detections as DetectionCheckpoint[]
        const detection = detections.find(d => d.id === newId)
        if (detection) {
          const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
          service.highlightDetectionCheckpoint?.(focusedDronePinId.value, newId, detection.timestamp)
        }
      }
    } else if (focusedDronePinId.value) {
      const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
      service.highlightDetectionCheckpoint?.(focusedDronePinId.value, null)
    }
  })

  // Cleanup
  const cleanup = () => {
    if (isMapReady.value) {
    mapService.destroy()
    mapStore.setMapInstance(null)
    isMapReady.value = false
    }
  }

  // Real-time updates integration
  const dataStore = useDataStore()
  const sensorsCache = ref<Map<string, GpsUnitPosition>>(new Map())
  const sensorsLoaded = ref(false)

  // Load sensors once and cache them (they're static)
  const loadSensorsOnce = async () => {
    if (sensorsLoaded.value) return
    
    try {
      const response = await databaseApi.getGpsUnitPositions()
      if (response.success && response.data) {
        response.data.forEach((unit: GpsUnitPosition) => {
          const key = unit.id ?? unit.unit_id ?? unit.system_id ?? `unit-${Math.random()}`
          sensorsCache.value.set(String(key), unit)
        })
        sensorsLoaded.value = true
        console.log('[MapPins] Loaded and cached sensors:', sensorsCache.value.size)
      }
    } catch (error) {
      console.error('[MapPins] Failed to load sensors:', error)
    }
  }

  // Debounce mechanism for incremental updates
  let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null
  // In performance mode, use NO debounce for test drone to show real-time updates
  // In production, batch updates to reduce map redraws
  const REFRESH_DEBOUNCE_MS = IS_LIVE_VIEW_PERF_MODE ? 100 : 2000 // 100ms in perf mode (minimal), 2s in production

  // Incremental update handlers
  const handleRFDetectionUpdate = (detection: RFDetection, action: 'insert' | 'update' | 'delete') => {
    // Queue events if map isn't ready yet - they'll be processed when map initializes
    if (!isMapReady.value) {
      console.log(`[MapPins] 📥 Queuing RF Detection ${action} (map not ready yet):`, detection.id)
      pendingSSEEvents.push({ type: 'detection', data: detection, action })
      // Still update the store so data is available when map is ready
      if (action === 'delete') {
        dataStore.removeRFDetection(detection.id)
      } else {
        dataStore.upsertRFDetection(detection)
      }
      return
    }

    // Log test drone detections prominently in perf mode
    const isTestDrone = detection.drone_id === PERF_TEST_DRONE_ID || String(detection.drone_id) === String(PERF_TEST_DRONE_ID)
    if (IS_LIVE_VIEW_PERF_MODE && isTestDrone && action === 'insert') {
      console.log(`[MapPins] 🚀 TEST DRONE RF Detection received via SSE:`, {
        detectionId: detection.id,
        droneId: detection.drone_id,
        systemId: detection.system_id,
        timestamp: detection.time,
        signalStrength: detection.signal_strength
      })
    }
    
    console.log(`[MapPins] RF Detection ${action}:`, detection.id)
    
    // Update data store incrementally
    if (action === 'delete') {
      dataStore.removeRFDetection(detection.id)
    } else {
      dataStore.upsertRFDetection(detection)
    }

    // Debounce refresh to batch multiple updates
    scheduleIncrementalRefresh()
  }

  // Queue for SSE events received before map is ready
  const pendingSSEEvents: Array<{ type: 'position' | 'detection' | 'gps', data: any, action: string }> = []
  
  const handleDronePositionUpdate = (position: DronePosition, action: 'insert' | 'update' | 'delete') => {
    // Queue events if map isn't ready yet - they'll be processed when map initializes
    if (!isMapReady.value) {
      console.log(`[MapPins] 📥 Queuing Drone Position ${action} (map not ready yet):`, position.id)
      pendingSSEEvents.push({ type: 'position', data: position, action })
      // Still update the store so data is available when map is ready
      if (action === 'delete') {
        dataStore.removeDronePosition(position.id)
      } else {
        dataStore.upsertDronePosition(position)
      }
      return
    }

    // Log test drone positions prominently in perf mode
    const isTestDrone = position.drone_id === PERF_TEST_DRONE_ID || String(position.drone_id) === String(PERF_TEST_DRONE_ID)
    if (IS_LIVE_VIEW_PERF_MODE && isTestDrone) {
      console.log(`[MapPins] 🚀 TEST DRONE Position ${action} received via SSE:`, {
        positionId: position.id,
        droneId: position.drone_id,
        expectedDroneId: PERF_TEST_DRONE_ID,
        systemId: position.system_id,
        lat: position.latitude,
        lng: position.longitude,
        timestamp: position.time,
        altitude: position.altitude,
        speed: position.speed
      })
    }

    console.log(`[MapPins] 📍 Drone Position ${action}:`, position.id, `(drone_id: ${position.drone_id})`)
    
    // Update data store incrementally
    if (action === 'delete') {
      dataStore.removeDronePosition(position.id)
    } else {
      dataStore.upsertDronePosition(position)
      
      // Log store state after update for test drone
      if (IS_LIVE_VIEW_PERF_MODE && isTestDrone) {
        const storePositions = dataStore.dronePositionsList.value.filter(p => 
          p.drone_id === PERF_TEST_DRONE_ID || String(p.drone_id) === String(PERF_TEST_DRONE_ID)
        )
        console.log(`[MapPins] 💾 Store now has ${storePositions.length} TEST DRONE positions`)
      }
    }

    // In performance mode, refresh IMMEDIATELY for test drone to show real-time trajectory
    // No debounce - we want instant updates as data arrives
    if (IS_LIVE_VIEW_PERF_MODE && isTestDrone && action === 'insert') {
      // Cancel any pending refresh
      if (refreshDebounceTimer) {
        clearTimeout(refreshDebounceTimer)
        refreshDebounceTimer = null
      }
      console.log(`[MapPins] 🔄 Triggering IMMEDIATE map refresh for test drone position...`)
      // Immediate refresh - no delay, we want real-time updates
      // Use nextTick to ensure store update has propagated
      Promise.resolve().then(() => {
        console.log(`[MapPins] 🔄 Executing incremental refresh now...`)
        void refreshPinsIncremental()
      })
    } else {
      // Debounce refresh to batch multiple updates
      scheduleIncrementalRefresh()
    }
  }

  const handleGpsUnitPositionUpdate = (unit: GpsUnitPosition, action: 'insert' | 'update' | 'delete') => {
    // Queue events if map isn't ready yet - they'll be processed when map initializes
    if (!isMapReady.value) {
      console.log(`[MapPins] 📥 Queuing GPS Unit Position ${action} (map not ready yet):`, unit.id ?? unit.unit_id)
      pendingSSEEvents.push({ type: 'gps', data: unit, action })
      // Still update the store so data is available when map is ready
      if (action === 'delete') {
        const key = String(unit.id ?? unit.unit_id ?? unit.system_id ?? '')
        sensorsCache.value.delete(key)
        dataStore.removeGpsUnitPositionById(key)
      } else {
        const key = String(unit.id ?? unit.unit_id ?? unit.system_id ?? '')
        sensorsCache.value.set(key, unit)
        dataStore.upsertGpsUnitPosition(unit)
      }
      return
    }

    console.log(`[MapPins] GPS Unit Position ${action}:`, unit.id ?? unit.unit_id)
    
    // Update cache if it's a sensor
    if (action === 'delete') {
      const key = String(unit.id ?? unit.unit_id ?? unit.system_id ?? '')
      sensorsCache.value.delete(key)
      dataStore.removeGpsUnitPositionById(unit.id ?? unit.unit_id ?? unit.system_id ?? '')
    } else {
      const key = String(unit.id ?? unit.unit_id ?? unit.system_id ?? '')
      sensorsCache.value.set(key, unit)
      dataStore.upsertGpsUnitPosition(unit)
    }

    // Debounce refresh to batch multiple updates
    scheduleIncrementalRefresh()
  }

  // Schedule a debounced incremental refresh
  const scheduleIncrementalRefresh = () => {
    if (refreshDebounceTimer) {
      clearTimeout(refreshDebounceTimer)
    }

    // In performance mode, immediately refresh for test drone to show real-time updates
    // Otherwise, debounce to batch updates
    if (IS_LIVE_VIEW_PERF_MODE) {
      // For test drone, refresh immediately; for others, use short debounce
      refreshDebounceTimer = setTimeout(() => {
        void refreshPinsIncremental()
        refreshDebounceTimer = null
      }, REFRESH_DEBOUNCE_MS)
    } else {
      refreshDebounceTimer = setTimeout(() => {
        void refreshPinsIncremental()
        refreshDebounceTimer = null
      }, REFRESH_DEBOUNCE_MS)
    }
  }

  // Incremental refresh - only updates changed pins without full reload
  const refreshPinsIncremental = async () => {
    if (!isMapReady.value) return

    try {
      // Use data from store (already updated by realtime handlers)
      // Only fetch minimal data needed to rebuild affected pins
      const storeData = {
        dronePositions: dataStore.dronePositionsList.value,
        rfDetections: dataStore.rfDetectionsList.value,
        drones: dataStore.dronesList.value,
        gpsUnits: Array.from(sensorsCache.value.values())
      }
      
      // Log test drone data in store for debugging
      if (IS_LIVE_VIEW_PERF_MODE) {
        const testDronePositions = storeData.dronePositions.filter(p => 
          p.drone_id === PERF_TEST_DRONE_ID || String(p.drone_id) === String(PERF_TEST_DRONE_ID)
        )
        const testDroneMetadata = storeData.drones.find(d => 
          d.id === PERF_TEST_DRONE_ID || String(d.id) === String(PERF_TEST_DRONE_ID)
        )
        if (testDronePositions.length > 0 || testDroneMetadata) {
          console.log(`[MapPins] 🔄 Incremental refresh: Store has ${testDronePositions.length} TEST DRONE positions, metadata:`, testDroneMetadata ? 'found' : 'NOT FOUND')
        }
      }

      // Rebuild pins from current store data (much faster than full API call)
      // This approach minimizes blinking by using already-updated store data
      const pins: MapPin[] = []
      
      // Process drone positions from store
      const droneTrajectoryMap = new Map<string, { points: DroneTrajectoryPoint[], positions: DronePosition[], latestPosition: DronePosition | null }>()
      
      storeData.dronePositions.forEach((position: DronePosition) => {
        const droneKey = position.drone_id !== null && position.drone_id !== undefined 
          ? `drone:${position.drone_id}` 
          : `system:${position.system_id ?? 'unknown'}`
        
        const lat = parseFloat(position.latitude.toString())
        const lng = parseFloat(position.longitude.toString())
        const timestamp = position.time

        if (!isValidCoordinate(lat, lng)) return

        const point: DroneTrajectoryPoint = { lat, lng, timestamp }
        const entry = droneTrajectoryMap.get(droneKey) || { points: [], positions: [], latestPosition: null }
        entry.points.push(point)
        entry.positions.push(position)

        if (!entry.latestPosition || toTimeValue(timestamp) > toTimeValue(entry.latestPosition.time)) {
          entry.latestPosition = position
        }

        droneTrajectoryMap.set(droneKey, entry)
      })

      // Build drone pins from trajectories
      Array.from(droneTrajectoryMap.entries()).forEach(([droneKey, entry]) => {
        if (!entry.latestPosition) return

        const latestLat = parseFloat(entry.latestPosition.latitude.toString())
        const latestLng = parseFloat(entry.latestPosition.longitude.toString())

        if (!isValidCoordinate(latestLat, latestLng)) return

        // Sort and filter trajectory points
        entry.points.sort((a, b) => toTimeValue(a.timestamp) - toTimeValue(b.timestamp))
        const filteredPoints = filterTrajectoryPoints(entry.points)

        const droneId = entry.latestPosition.drone_id ?? droneKey.replace('drone:', '')
        const metadata = storeData.drones.find(d => d.id === droneId)
        
        // Apply time window filtering (same as initial load)
        const ACTIVE_POSITION_WINDOW_MS = getActivePositionWindow(mapStore)
        const DETECTION_WINDOW_MS = getDetectionWindow(mapStore)
        const MAX_POSITION_AGE_MS = getMaxPositionAge(mapStore)
        
        const positionTime = toTimeValue(entry.latestPosition.time)
        const now = Date.now()
        const positionAge = positionTime > 0 ? now - positionTime : Infinity
        
        // Check if position is recent (within configured window)
        const hasRecentPosition = positionTime > 0 && positionAge <= ACTIVE_POSITION_WINDOW_MS
        
        // Check if drone has RF detections within the configured window
        const detections = storeData.rfDetections
          .filter((d: RFDetection) => {
            const dDroneId = d.drone_id ?? null
            const dSystemId = d.system_id ?? null
            const posDroneId = entry.latestPosition.drone_id ?? null
            const posSystemId = entry.latestPosition.system_id ?? null
            return (dDroneId !== null && dDroneId === posDroneId) || 
                   (dSystemId !== null && dSystemId === posSystemId)
          })
          .map((d: RFDetection) => ({
            id: d.id,
            timestamp: d.time,
            frequency: d.frequency,
            signalStrength: d.signal_strength,
            status: d.detection_status,
            systemId: d.system_id ?? null,
            droneId: d.drone_id ?? null
          }))
        
        const hasRecentDetections = detections.some(detection => {
          const detectionTime = toTimeValue(detection.timestamp)
          const detectionAge = detectionTime > 0 ? now - detectionTime : Infinity
          return detectionTime > 0 && detectionAge <= DETECTION_WINDOW_MS
        })
        
        // Show drone if:
        // - Has recent position (within window), OR
        // - Has recent detections (within window) AND position is not too old (within max age)
        const shouldShow = hasRecentPosition || (hasRecentDetections && positionAge <= MAX_POSITION_AGE_MS)
        
        // Only add active drones to the map - skip inactive ones (same filtering as initial load)
        if (!shouldShow) {
          // Log why test drone is being filtered out
          if (IS_LIVE_VIEW_PERF_MODE && (String(droneId) === String(PERF_TEST_DRONE_ID) || metadata?.uas_id?.includes('TEST'))) {
            console.warn(`[MapPins] 🚀 TEST DRONE filtered out in incremental refresh (not active):`, {
              droneId,
              hasRecentPosition,
              hasRecentDetections,
              positionAge,
              positionTime,
              now: Date.now(),
              ACTIVE_POSITION_WINDOW_MS,
              DETECTION_WINDOW_MS,
              MAX_POSITION_AGE_MS
            })
          }
          return
        }
        
        // Log test drone in incremental refresh
        const isTestDrone = String(droneId) === String(PERF_TEST_DRONE_ID) || metadata?.uas_id?.includes('TEST')
        if (IS_LIVE_VIEW_PERF_MODE && isTestDrone) {
          console.log(`[MapPins] 🔄 Incremental refresh: Building TEST DRONE pin:`, {
            droneId,
            droneKey,
            title: metadata?.uas_id ? `Drone ${metadata.uas_id}` : `Drone ${droneId}`,
            position: { lat: latestLat, lng: latestLng },
            trajectoryPoints: filteredPoints.length,
            totalPositions: entry.positions.length,
            hasRecentPosition,
            hasRecentDetections
          })
        }

        pins.push({
          id: `drone-${droneId}`,
          lat: latestLat,
          lng: latestLng,
          title: metadata?.uas_id ? `Drone ${metadata.uas_id}` : `Drone ${droneId}`,
          type: 'drone',
          status: 'active',
          priority: 'medium',
          data: {
            drone_id: entry.latestPosition.drone_id,
            altitude: entry.latestPosition.altitude,
            speed: entry.latestPosition.speed,
            receiver_type: entry.latestPosition.receiver_type,
            system_id: entry.latestPosition.system_id ? String(entry.latestPosition.system_id) : null,
            timestamp: entry.latestPosition.time,
            trajectory: filteredPoints,
            detections: detections.length > 0 ? detections : undefined
          },
          timestamp: entry.latestPosition.time
        })
      })

      // Process GPS units (sensors) from cache
      storeData.gpsUnits.forEach((unit: GpsUnitPosition) => {
        const lat = parseCoordinate((unit as any)?.gps_lat) ?? parseCoordinate(unit.latitude)
        const lng = parseCoordinate((unit as any)?.gps_lon) ?? parseCoordinate(unit.longitude)

        if (!isValidCoordinate(lat, lng)) return

        const systemId = unit.system_id ?? unit.unit_id
        const unitKey = String(systemId ?? unit.id ?? 'unknown')
        
        // Get detections for this sensor from store
        const sensorDetections = storeData.rfDetections
          .filter((d: RFDetection) => String(d.system_id ?? '') === String(systemId ?? ''))
          .map((d: RFDetection) => ({
            id: d.id,
            timestamp: d.time,
            frequency: d.frequency,
            signalStrength: d.signal_strength,
            status: d.detection_status,
            systemId: d.system_id ?? null,
            droneId: d.drone_id ?? null
          }))

        pins.push({
          id: `gps-unit-${unitKey}`,
          lat: lat!,
          lng: lng!,
          title: (unit as any)?.unit_name || unit.name || `RF Receiver ${unitKey}`,
          type: 'sensor',
          status: sensorDetections.length > 0 ? 'warning' : 'active',
          priority: sensorDetections.length > 0 ? 'high' : 'medium',
          data: {
            unit_id: unit.unit_id ?? null,
            system_id: systemId ? String(systemId) : null,
            status: unit.status,
            timestamp: unit.time ?? null,
            detections: sensorDetections.length > 0 ? sensorDetections : undefined,
            hasRFDetections: sensorDetections.length > 0
          },
          timestamp: unit.time ?? new Date().toISOString()
        })
      })

      // Update pins in store and map (this will cause minimal blinking since we're replacing with similar data)
      if (pins.length > 0) {
        const dedupedPins = Array.from(
          pins.reduce((acc, pin) => {
            acc.set(pin.id, pin)
            return acc
          }, new Map<string, MapPin>())
        ).map(([, pin]) => pin)

        mapStore.setPins(dedupedPins)
        
        if (isMapReady.value) {
          const filtered = dedupedPins.filter(pin => mapStore.isMarkerTypeVisible(pin.type))
          
          // Log test drone in incremental refresh
          if (IS_LIVE_VIEW_PERF_MODE) {
            const testDronePin = filtered.find(p =>
              p.id === `drone-${PERF_TEST_DRONE_ID}` ||
              (p.type === 'drone' && p.data?.drone_id === PERF_TEST_DRONE_ID)
            )
            if (testDronePin) {
              console.log(`[MapPins] 🗺️ Updating map with TEST DRONE pin:`, {
                id: testDronePin.id,
                position: { lat: testDronePin.lat, lng: testDronePin.lng },
                trajectoryPoints: Array.isArray(testDronePin.data?.trajectory) ? testDronePin.data.trajectory.length : 0
              })
            }
          }
          
          mapService.addPins(filtered, mapStore.visibleMarkerTypes)
          
          // Update trajectories
          const visibleTrajectories: DroneTrajectory[] = filtered
            .filter(pin => pin.type === 'drone' && Array.isArray(pin.data?.trajectory) && pin.data.trajectory.length > 1)
            .map(pin => ({
              droneId: pin.id.replace('drone-', ''),
              points: pin.data.trajectory as DroneTrajectoryPoint[]
            }))
          
          if (IS_LIVE_VIEW_PERF_MODE && visibleTrajectories.length > 0) {
            const testTrajectory = visibleTrajectories.find(t => t.droneId === String(PERF_TEST_DRONE_ID))
            if (testTrajectory) {
              console.log(`[MapPins] 📈 Updating TEST DRONE trajectory with ${testTrajectory.points.length} points`)
            }
          }
          
          mapService.updateDroneTrajectories(visibleTrajectories)
          syncFocusModeVisuals()
          
          if (IS_LIVE_VIEW_PERF_MODE) {
            console.log(`[MapPins] ✅ Map update complete!`)
          }
        }
      }
    } catch (error) {
      console.error('[MapPins] Error in incremental refresh:', error)
      // Fallback to full refresh on error
      await loadPins()
    }
  }

  // Set up real-time updates
  let realtimeCleanup: (() => void) | null = null
  let refreshInterval: ReturnType<typeof setInterval> | null = null

  // Lifecycle hooks
  onMounted(async () => {
    // Set up real-time updates (synchronously, before any await)
    try {
      const { disconnect } = useRealtime({
        onRFDetection: handleRFDetectionUpdate,
        onDronePosition: handleDronePositionUpdate,
        onGpsUnitPosition: handleGpsUnitPositionUpdate,
        onError: (error) => {
          console.error('[MapPins] ❌ Realtime error:', error)
        },
        onReconnect: () => {
          console.log('[MapPins] 🔌 Realtime reconnected - SSE is active!')
        }
      })
      
      // Log connection status after a brief delay
      setTimeout(() => {
        const isConnected = realtimeService.isConnected()
        if (isConnected) {
          console.log('[MapPins] ✅ SSE connection verified - real-time updates are active!')
        } else {
          console.warn('[MapPins] ⚠️ SSE connection not established - updates may be delayed')
          console.warn('[MapPins] Check browser console for SSE connection errors')
          console.warn('[MapPins] Make sure your backend server is running and SSE endpoint is accessible')
        }
      }, 1000)
      realtimeCleanup = disconnect
    } catch (error) {
      console.warn('[MapPins] Failed to set up realtime service:', error)
    }
    
    if (mapContainer.value) {
      await initializeMap(mapContainer.value)
    }
    
    // Load sensors once and cache them
    await loadSensorsOnce()
    
    // Fallback: Set up a longer refresh interval (5 minutes) as backup
    // This is much less frequent since we have real-time updates
    refreshInterval = setInterval(async () => {
      if (isMapReady.value) {
        try {
          // Only refresh if realtime is not connected
          // For now, always do a lightweight refresh
          await refreshPinsIncremental()
        } catch (error) {
          console.error('[MapPins] Error refreshing data:', error)
        }
      }
    }, 5 * 60000) // 5 minutes (backup only)
  })

  // Cleanup on unmount (must be registered synchronously, outside async function)
  onUnmounted(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
    if (realtimeCleanup) {
      realtimeCleanup()
      realtimeCleanup = null
    }
    cleanup()
  })

  // Watch for selected pin changes to highlight it on the map
  watch(selectedPin, (newPin, oldPin) => {
    if (isMapReady.value) {
      console.log('[Map] selectedPin changed', {
        pinId: newPin?.id,
        oldPinId: oldPin?.id,
        zoom: mapService.getZoom()
      })
      mapService.highlightSelectedPin(newPin)
    }
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
    focusModeActive,
    focusedDronePinId,
    
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
    focusTrajectoryPoint,
    cleanup
  }
}



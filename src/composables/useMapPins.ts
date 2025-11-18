import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '@/store/map'
import { mapService } from '@/services/mapService'
import { databaseApi } from '@/services/api'
import type { MapPin, MapViewport, DroneTrajectory, DroneTrajectoryPoint, DetectionCheckpoint } from '@/types/map'
import type { DronePosition, RFDetection, OperatorPosition, GpsUnitPosition, Drone } from '@/types/database'

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
const toTimeValue = (value: string | undefined | null) => value ? new Date(value).getTime() : 0

  const focusTrajectoryPoint = (point: DroneTrajectoryPoint) => {
    if (!isMapReady.value) return
    const dronePinId = focusedDronePinId.value
    if (!dronePinId) return

    // Keep current zoom level; only pan to the detection point
    const currentZoom = mapService.getZoom()
    const zoomLevel = typeof currentZoom === 'number' ? currentZoom : (viewport.value.zoom ?? 13)
    mapService.flyTo(point.lat, point.lng, zoomLevel)
    mapService.highlightTrajectoryCheckpoint(dronePinId, point.timestamp)
    mapStore.setFocusedTrajectoryTimestamp(point.timestamp)
    
    // Try to find a matching detection for this trajectory point
    // Look for a detection with a timestamp close to this trajectory point's timestamp
    const selectedPin = mapStore.selectedPin
    if (selectedPin && Array.isArray(selectedPin.data?.detections)) {
      const detections = selectedPin.data.detections as DetectionCheckpoint[]
      const pointTime = toTimeValue(point.timestamp)
      
      // Find detection with closest timestamp (within 5 seconds)
      let closestDetection: DetectionCheckpoint | null = null
      let closestTimeDiff = Infinity
      
      detections.forEach((detection) => {
        const detectionTime = toTimeValue(detection.timestamp)
        const timeDiff = Math.abs(detectionTime - pointTime)
        // Match if within 5 seconds
        if (timeDiff < 5000 && timeDiff < closestTimeDiff) {
          closestTimeDiff = timeDiff
          closestDetection = detection
        }
      })
      
      if (closestDetection) {
        mapStore.setFocusedDetectionId(closestDetection.id)
        highlightDetections(closestDetection.id)
        // Also highlight the checkpoint marker with timestamp for precise matching
        const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
        service.highlightDetectionCheckpoint?.(dronePinId, closestDetection.id, closestDetection.timestamp)
      } else {
        mapStore.setFocusedDetectionId(null)
        highlightDetections(null)
        const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
        service.highlightDetectionCheckpoint?.(dronePinId, null)
      }
    } else {
      mapStore.setFocusedDetectionId(null)
      highlightDetections(null)
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

      // Enable clustering behavior (panel remains hidden)
      const serviceWithClusterToggle = mapService as unknown as { setClusteringEnabled?: (enabled: boolean) => void }
      serviceWithClusterToggle.setClusteringEnabled?.(true)

      mapService.onTrajectoryPointClick((point) => {
        focusTrajectoryPoint(point)
      })

      // Set up pin click handler
      mapService.onPinClick((pin: MapPin) => {
        if (pin.type === 'target') {
          mapStore.focusDetectionPin(pin)
          // Highlight the detection on the map
          const detectionId = typeof pin.data?.id === 'number'
            ? pin.data.id
            : Number(String(pin.id).replace('rf-detection-', ''))
          if (!Number.isNaN(detectionId)) {
            highlightDetections(detectionId)
            mapService.panToDetection(detectionId)
          }
        } else {
        mapStore.flyToPin(pin) // This will also call selectPin internally
        }
      })

      // Set up cluster click handler
      mapService.onClusterClick((cluster) => {
        mapStore.selectCluster(cluster)
        // Expand cluster to show individual pins immediately
        mapService.expandCluster(cluster)
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
      
      // Fetch real data from database
      const [
        dronesResponse,
        dronePositionsResponse,
        rfDetectionsResponse,
        operatorPositionsResponse,
        gpsUnitPositionsResponse
      ] = await Promise.all([
        databaseApi.getDrones(),
        databaseApi.getDronePositions(100),
        databaseApi.getRFDetections(50),
        databaseApi.getOperatorPositions(50),
        databaseApi.getGpsUnitPositions(100)
      ])

      const droneMetadata = new Map<string, Drone>()
      if (dronesResponse.success && Array.isArray(dronesResponse.data)) {
        dronesResponse.data.forEach((drone) => {
          const key = String(drone.id)
          droneMetadata.set(key, drone)
        })
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

      const isValidCoordinate = (lat: number, lng: number) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
        // Filter out zero coordinates that typically indicate missing data
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
        const processedPositionKeys = new Set<string>()
        dronePositionsResponse.data.forEach((position: DronePosition) => {
          const droneKey = String(position.drone_id)
          const lat = parseFloat(position.latitude.toString())
          const lng = parseFloat(position.longitude.toString())
          const timestamp = position.time

           if (!isValidCoordinate(lat, lng)) {
             return
           }

          const systemKey = position.system_id !== undefined && position.system_id !== null
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
          const MAX_TIME_DIFF_MS = 5 * 60 * 1000 // 5 minutes

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

          pins.push({
            id: `drone-${droneId}`,
            lat: pinLat,
            lng: pinLng,
            title: displayName,
            description: descriptor.join(' • '),
            type: 'drone',
            status: metadata?.is_active ? 'active' : 'inactive',
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
      const detectionPins: MapPin[] = []

      if (rfDetectionsResponse.success && rfDetectionsResponse.data) {
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

        const getDetectionCoordinates = (droneRef: number | null | undefined, timestamp: string): { lat: number; lng: number } | null => {
          if (droneRef === null || droneRef === undefined) {
            return null
          }
          const trajectory = droneTrajectoryPoints.get(String(droneRef))
          const detectionTime = toTimeValue(timestamp)

          if (trajectory && trajectory.length > 0) {
            let closestPoint = trajectory[trajectory.length - 1]
            let closestDiff = Math.abs(toTimeValue(closestPoint.timestamp) - detectionTime)

            if (Number.isFinite(detectionTime)) {
              trajectory.forEach(point => {
                const diff = Math.abs(toTimeValue(point.timestamp) - detectionTime)
                if (diff < closestDiff) {
                  closestDiff = diff
                  closestPoint = point
                }
              })
            }

            return { lat: closestPoint.lat, lng: closestPoint.lng }
          }

          const trajectoryEntry = droneTrajectoryMap.get(String(droneRef))
          const fallbackPosition = trajectoryEntry?.latestPosition
          if (fallbackPosition) {
            const lat = parseFloat(fallbackPosition.latitude.toString())
            const lng = parseFloat(fallbackPosition.longitude.toString())
            if (isValidCoordinate(lat, lng)) {
              return { lat, lng }
            }
          }

          return null
        }

        rfDetectionsResponse.data.forEach((detection: RFDetection) => {
          if (!registerDetection(detection)) {
            return
          }

          const checkpoint: DetectionCheckpoint = {
            id: detection.id,
            timestamp: detection.time,
            frequency: detection.frequency,
            signalStrength: detection.signal_strength,
            status: detection.detection_status,
            systemId: detection.system_id ?? null
          }

          const addDetectionToMap = (key: string) => {
            const list = droneDetectionsMap.get(key) || []
            list.push(checkpoint)
            droneDetectionsMap.set(key, list)
          }

          if (detection.drone_id !== null && detection.drone_id !== undefined) {
            addDetectionToMap(String(detection.drone_id))
          }

          if (detection.system_id !== null && detection.system_id !== undefined) {
            addDetectionToMap(`system:${detection.system_id}`)
          }

          const coordinates = getDetectionCoordinates(detection.drone_id, detection.time)
          if (coordinates) {
            detectionPins.push({
              id: `rf-detection-${detection.id}`,
              lat: coordinates.lat,
              lng: coordinates.lng,
              title: `Detection #${detection.id}`,
              description: detection.system_id
                ? `Detected by system ${detection.system_id}`
                : 'RF Detection',
              type: 'target',
              status: detection.detection_status ? 'active' : 'inactive',
              priority: detection.detection_status ? 'medium' : 'low',
              data: {
                id: detection.id,
                drone_id: detection.drone_id,
                system_id: detection.system_id ?? null,
                timestamp: detection.time,
                frequency: detection.frequency,
                signal_strength: detection.signal_strength,
                detection_status: detection.detection_status
              },
              timestamp: detection.time
            })
          }
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

          const canonicalSystemId = unit.system_id ?? (typeof unit.unit_id !== 'undefined' ? String(unit.unit_id) : null)
          const unitKey = canonicalSystemId ?? (unit.name ?? String(unit.id))
          if (seenSensorKeys.has(unitKey)) {
            return acc
          }
          seenSensorKeys.add(unitKey)

          const statusRaw = typeof unit.status === 'string' ? unit.status.toLowerCase() : null
          const status = statusRaw === 'inactive' || statusRaw === 'offline' ? 'inactive' : 'active'
          
          // Use unit name if available, otherwise construct label
          const displayName = unit.name || `RF Receiver ${unitKey}`
          const description = unit.status 
            ? `Detection Source • Status: ${unit.status}` 
            : 'RF Detection Receiver • Active monitoring'

          // Remember detector by system or unit id for association
          if (canonicalSystemId) {
            systemIdToDetector.set(String(canonicalSystemId), { name: unit.name ?? null, unit_id: unit.unit_id ?? null })
          }

          acc.push({
            id: `gps-unit-${unitKey}`,
            lat,
            lng,
            title: displayName,
            description,
            type: 'sensor',
            status,
            priority: 'medium',
            data: {
              unit_id: unit.unit_id ?? null,
              system_id: canonicalSystemId ?? null,
              status: unit.status,
              timestamp: unit.time ?? null,
              detection_range_km: 1.5 // 1.5km detection range
            },
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

      if (detectionPins.length > 0) {
        pins.push(...detectionPins)
      }
      


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
        
        // Build trajectories list for map rendering
        const droneTrajectories: DroneTrajectory[] = Array.from(droneTrajectoryPoints.entries())
          .map(([droneId, points]) => ({
            droneId,
            points
          }))
          .filter(trajectory => trajectory.points.length > 1)

        // Add pins and trajectories to map
        if (isMapReady.value) {
          mapService.addPins(dedupedPins)
          mapService.updateDroneTrajectories(droneTrajectories)
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
            mapService.showTrajectoryCheckpoints(focusedDronePinId.value, trajectoryPoints)
            mapService.highlightTrajectoryCheckpoint(focusedDronePinId.value, trajectoryPoints[trajectoryPoints.length - 1].timestamp)
            mapStore.setFocusedTrajectoryTimestamp(trajectoryPoints[trajectoryPoints.length - 1].timestamp)
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



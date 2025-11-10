import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '@/store/map'
import { mapService } from '@/services/mapService'
import { databaseApi } from '@/services/api'
import type { MapPin, MapViewport, DroneTrajectory, DroneTrajectoryPoint, DetectionCheckpoint } from '@/types/map'
import type { DronePosition, RFDetection, OperatorPosition, GpsUnitPosition } from '@/types/database'

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
  const focusedDetectionId = computed(() => mapStore.focusedDetectionId)

  const highlightDetections = (id: number | null) => {
    const service = mapService as unknown as { highlightDetection?: (id: number | null) => void }
    service.highlightDetection?.(id)
  }

  // Initialize map
  const focusTrajectoryPoint = (point: DroneTrajectoryPoint) => {
    if (!isMapReady.value) return
    const dronePinId = focusedDronePinId.value
    if (!dronePinId) return

    const zoomLevel = Math.max(viewport.value.zoom ?? 13, 15)
    mapService.flyTo(point.lat, point.lng, zoomLevel)
    mapService.highlightTrajectoryCheckpoint(dronePinId, point.timestamp)
    mapStore.setFocusedTrajectoryTimestamp(point.timestamp)
    mapStore.setFocusedDetectionId(null)
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

      mapService.onTrajectoryPointClick((point) => {
        focusTrajectoryPoint(point)
      })

      // Set up pin click handler
      mapService.onPinClick((pin: MapPin) => {
        if (pin.type === 'target') {
          mapStore.focusDetectionPin(pin)
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
      
      const toTimeValue = (value: string | undefined | null) => value ? new Date(value).getTime() : 0
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
        dronePositionsResponse,
        rfDetectionsResponse,
        operatorPositionsResponse,
        gpsUnitPositionsResponse
      ] = await Promise.all([
        databaseApi.getDronePositions(100),
        databaseApi.getRFDetections(50),
        databaseApi.getOperatorPositions(50),
        databaseApi.getGpsUnitPositions(100)
      ])
      
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
        dronePositionsResponse.data.forEach((position: DronePosition) => {
          const droneKey = String(position.drone_id)
          const lat = parseFloat(position.latitude.toString())
          const lng = parseFloat(position.longitude.toString())
          const timestamp = position.time

           if (!isValidCoordinate(lat, lng)) {
             return
           }

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
          const detections =
            detectionKeys.reduce<DetectionCheckpoint[] | undefined>((acc, key) => {
              return acc && acc.length > 0 ? acc : droneDetectionsMap.get(key)
            }, undefined) || []

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

          pins.push({
            id: `drone-${droneId}`,
            lat: pinLat,
            lng: pinLng,
            title: `Drone ${droneId}`,
            description: `Altitude: ${markerPosition.altitude}m, Speed: ${markerPosition.speed} km/h`,
            type: 'drone',
            status: 'active',
            priority: 'medium',
          data: {
              drone_id: markerPosition.drone_id,
              altitude: markerPosition.altitude,
              speed: markerPosition.speed,
              receiver_type: markerPosition.receiver_type,
              system_id: markerPosition.system_id ?? entry.latestPosition?.system_id ?? null,
              timestamp: markerPosition.time,
              trajectory: filteredPoints,
              detections
            },
            timestamp: markerPosition.time
          })
        })
      }
      
      // Aggregate RF detections per drone
      if (rfDetectionsResponse.success && rfDetectionsResponse.data) {
        rfDetectionsResponse.data.forEach((detection: RFDetection) => {
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
        })
      }
      
      // Convert operator positions to map pins
      if (operatorPositionsResponse.success && operatorPositionsResponse.data) {
        const operatorPins = operatorPositionsResponse.data.reduce<MapPin[]>((acc, position: OperatorPosition) => {
          const lat = parseFloat(position.latitude.toString())
          const lng = parseFloat(position.longitude.toString())

          if (!isValidCoordinate(lat, lng)) {
            return acc
          }

          const label = position.drone_id !== null && position.drone_id !== undefined
            ? `Operator - Drone ${position.drone_id}`
            : 'Operator (unassigned)'

          acc.push({
          id: `operator-pos-${position.id}`,
            lat,
            lng,
            title: label,
            description: position.drone_id
              ? `Operator position for drone ${position.drone_id}`
              : 'Operator without assigned drone',
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
        pins.push(...operatorPins)
      }

      if (gpsUnitPositionsResponse.success && gpsUnitPositionsResponse.data) {
        const gpsPins = gpsUnitPositionsResponse.data.reduce<MapPin[]>((acc, unit: GpsUnitPosition) => {
          const lat = extractCoordinate(unit, ['latitude', 'lat', 'latitude_deg', 'gps_lat', 'geo_lat', 'y'])
          const lng = extractCoordinate(unit, ['longitude', 'lng', 'lon', 'longitude_deg', 'gps_lng', 'gps_lon', 'geo_lon', 'x'])
          
          if (lat === null || lng === null || !isValidCoordinate(lat, lng)) {
            return acc
          }

          const unitLabel = unit.system_id ?? unit.unit_id ?? unit.name ?? unit.id
          const statusRaw = typeof unit.status === 'string' ? unit.status.toLowerCase() : null
          const status = statusRaw === 'inactive' || statusRaw === 'offline' ? 'inactive' : 'active'

          acc.push({
            id: `gps-unit-${unitLabel}`,
            lat,
            lng,
            title: `GPS Unit ${unitLabel}`,
            description: unit.status ? `Status: ${unit.status}` : 'Static GPS device position',
            type: 'sensor',
            status,
            priority: 'medium',
            data: {
              unit_id: unit.unit_id,
              system_id: unit.system_id ?? null,
              status: unit.status,
              timestamp: unit.time ?? null
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

    if (focusModeActive.value && focusedDronePinId.value) {
      const focusedPin = mapStore.pins.find(pin => pin.id === focusedDronePinId.value)
      const trajectoryPoints = (focusedPin?.data?.trajectory ?? []) as DroneTrajectoryPoint[]
      mapService.applyFocusMode(focusedDronePinId.value, focusedDroneTargetId.value)
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
      mapService.applyFocusMode(null)
      mapService.clearTrajectoryCheckpoints()
      mapStore.setFocusedTrajectoryTimestamp(null)
      highlightDetections(null)
    }
  }

  watch([focusModeActive, focusedDronePinId, focusedDroneTargetId], () => {
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



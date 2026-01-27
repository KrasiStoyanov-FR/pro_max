import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { databaseApi } from '@/services/api'
import type {
  Drone,
  DronePosition,
  RFDetection,
  OperatorPosition,
  GpsUnitPosition,
  ReceiverLog,
  FlightSession,
  DatabaseResponse
} from '@/types/database'

// Loading states for each data type
interface LoadingState {
  drones: boolean
  dronePositions: boolean
  rfDetections: boolean
  operatorPositions: boolean
  gpsUnitPositions: boolean
  receiverLogs: boolean
  flightSessions: boolean
  [key: string]: boolean // For individual item loading
}

// Error states
interface ErrorState {
  drones: string | null
  dronePositions: string | null
  rfDetections: string | null
  operatorPositions: string | null
  gpsUnitPositions: string | null
  receiverLogs: string | null
  flightSessions: string | null
  [key: string]: string | null
}

export const useDataStore = defineStore('data', () => {
  // Collections - all data indexed by ID for O(1) lookup
  const drones = ref<Map<number | string, Drone>>(new Map())
  const dronePositions = ref<Map<number, DronePosition>>(new Map())
  const rfDetections = ref<Map<number, RFDetection>>(new Map())
  const operatorPositions = ref<Map<number, OperatorPosition>>(new Map())
  const gpsUnitPositions = ref<Map<number | string, GpsUnitPosition>>(new Map())
  const receiverLogs = ref<Map<number, ReceiverLog>>(new Map())
  const flightSessions = ref<Map<number, FlightSession>>(new Map())

  // Indexes for fast lookups
  const dronesBySystemId = ref<Map<string, Drone[]>>(new Map())
  const dronePositionsByDroneId = ref<Map<number, DronePosition[]>>(new Map())
  const rfDetectionsByDroneId = ref<Map<number, RFDetection[]>>(new Map())
  const rfDetectionsBySystemId = ref<Map<string, RFDetection[]>>(new Map())
  const operatorPositionsBySystemId = ref<Map<string, OperatorPosition[]>>(new Map())
  const operatorPositionsByDroneId = ref<Map<number, OperatorPosition[]>>(new Map())
  const gpsUnitsBySystemId = ref<Map<string, GpsUnitPosition[]>>(new Map())
  const gpsUnitsByUnitId = ref<Map<number | string, GpsUnitPosition>>(new Map())

  // Loading states
  const loading = ref<LoadingState>({
    drones: false,
    dronePositions: false,
    rfDetections: false,
    operatorPositions: false,
    gpsUnitPositions: false,
    receiverLogs: false,
    flightSessions: false
  })

  // Error states
  const errors = ref<ErrorState>({
    drones: null,
    dronePositions: null,
    rfDetections: null,
    operatorPositions: null,
    gpsUnitPositions: null,
    receiverLogs: null,
    flightSessions: null
  })

  // Last fetch timestamps for cache invalidation
  const lastFetched = ref<Map<string, number>>(new Map())
  const CACHE_DURATION = 30000 // 30 seconds

  // Getters - computed arrays for easy iteration
  const dronesList = computed(() => Array.from(drones.value.values()))
  const dronePositionsList = computed(() => Array.from(dronePositions.value.values()))
  const rfDetectionsList = computed(() => Array.from(rfDetections.value.values()))
  const operatorPositionsList = computed(() => Array.from(operatorPositions.value.values()))
  const gpsUnitPositionsList = computed(() => Array.from(gpsUnitPositions.value.values()))
  const receiverLogsList = computed(() => Array.from(receiverLogs.value.values()))
  const flightSessionsList = computed(() => Array.from(flightSessions.value.values()))

  // Helper to check if data is stale
  const isStale = (key: string, customDuration?: number): boolean => {
    const lastFetch = lastFetched.value.get(key)
    if (!lastFetch) return true
    const duration = customDuration ?? CACHE_DURATION
    return Date.now() - lastFetch > duration
  }

  // Helper to update indexes
  const updateIndexes = () => {
    // Index drones by system_id
    dronesBySystemId.value.clear()
    drones.value.forEach(drone => {
      if (drone.system_id) {
        const existing = dronesBySystemId.value.get(drone.system_id) || []
        existing.push(drone)
        dronesBySystemId.value.set(drone.system_id, existing)
      }
    })

    // Index drone positions by drone_id
    dronePositionsByDroneId.value.clear()
    dronePositions.value.forEach(position => {
      const existing = dronePositionsByDroneId.value.get(position.drone_id) || []
      existing.push(position)
      dronePositionsByDroneId.value.set(position.drone_id, existing)
    })

    // Index RF detections by drone_id and system_id
    rfDetectionsByDroneId.value.clear()
    rfDetectionsBySystemId.value.clear()
    rfDetections.value.forEach(detection => {
      // By drone_id
      const byDrone = rfDetectionsByDroneId.value.get(detection.drone_id) || []
      byDrone.push(detection)
      rfDetectionsByDroneId.value.set(detection.drone_id, byDrone)

      // By system_id
      if (detection.system_id) {
        const bySystem = rfDetectionsBySystemId.value.get(detection.system_id) || []
        bySystem.push(detection)
        rfDetectionsBySystemId.value.set(detection.system_id, bySystem)
      }
    })

    // Index operator positions by system_id and drone_id
    operatorPositionsBySystemId.value.clear()
    operatorPositionsByDroneId.value.clear()
    operatorPositions.value.forEach(position => {
      if (position.system_id) {
        const bySystem = operatorPositionsBySystemId.value.get(position.system_id) || []
        bySystem.push(position)
        operatorPositionsBySystemId.value.set(position.system_id, bySystem)
      }
      const byDrone = operatorPositionsByDroneId.value.get(position.drone_id) || []
      byDrone.push(position)
      operatorPositionsByDroneId.value.set(position.drone_id, byDrone)
    })

    // Index GPS units by system_id and unit_id
    gpsUnitsBySystemId.value.clear()
    gpsUnitsByUnitId.value.clear()
    gpsUnitPositions.value.forEach(unit => {
      if (unit.system_id) {
        const bySystem = gpsUnitsBySystemId.value.get(unit.system_id) || []
        bySystem.push(unit)
        gpsUnitsBySystemId.value.set(unit.system_id, bySystem)
      }
      if (unit.unit_id) {
        gpsUnitsByUnitId.value.set(unit.unit_id, unit)
      }
    })
  }

  // ========== DRONES ==========
  const fetchDrones = async (forceRefresh = false): Promise<Drone[]> => {
    const key = 'drones'
    if (!forceRefresh && !isStale(key) && drones.value.size > 0) {
      return dronesList.value
    }

    loading.value.drones = true
    errors.value.drones = null

    try {
      const response = await databaseApi.getDrones()
      if (response.success && response.data) {
        drones.value.clear()
        response.data.forEach(drone => {
          drones.value.set(drone.id, drone)
        })
        updateIndexes()
        lastFetched.value.set(key, Date.now())
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch drones')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.value.drones = message
      throw error
    } finally {
      loading.value.drones = false
    }
  }

  const getDrone = (id: number | string): Drone | undefined => {
    return drones.value.get(id)
  }

  const getDronesBySystemId = (systemId: string): Drone[] => {
    return dronesBySystemId.value.get(systemId) || []
  }

  // ========== DRONE POSITIONS ==========
  const fetchDronePositions = async (limit?: number, forceRefresh = false): Promise<DronePosition[]> => {
    const key = `drone_positions_${limit ?? 'all'}`
    if (!forceRefresh && !isStale(key) && dronePositions.value.size > 0) {
      return dronePositionsList.value
    }

    loading.value.dronePositions = true
    errors.value.dronePositions = null

    try {
      const response = await databaseApi.getDronePositions(limit)
      if (response.success && response.data) {
        dronePositions.value.clear()
        response.data.forEach(position => {
          dronePositions.value.set(position.id, position)
        })
        updateIndexes()
        lastFetched.value.set(key, Date.now())
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch drone positions')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.value.dronePositions = message
      throw error
    } finally {
      loading.value.dronePositions = false
    }
  }

  const getDronePosition = (id: number): DronePosition | undefined => {
    return dronePositions.value.get(id)
  }

  const getDronePositionsByDroneId = (droneId: number): DronePosition[] => {
    return dronePositionsByDroneId.value.get(droneId) || []
  }

  // ========== RF DETECTIONS ==========
  const fetchRFDetections = async (
    limit?: number,
    forceRefresh = false,
    offset?: number,
    filters?: {
      type?: string
      status?: string
      timeWindow?: number | null
      zone?: string
      search?: string
      sensorId?: string | number | null
      systemId?: string | number | null
    }
  ): Promise<RFDetection[]> => {
    const filterKey = filters
      ? `${filters.type || 'all'}_${filters.status || 'all'}_${filters.timeWindow || 'all'}_${filters.zone || 'all'}_${filters.search || ''}`
      : 'no_filters'
    const key = `rf_detections_${limit ?? 'all'}_${offset ?? 0}_${filterKey}`
    if (!forceRefresh && !isStale(key) && rfDetections.value.size > 0 && offset === undefined && !filters) {
      // Only use cache if we're fetching all data (no offset, no filters)
      return rfDetectionsList.value
    }

    loading.value.rfDetections = true
    errors.value.rfDetections = null

    try {
      const response = await databaseApi.getRFDetections(limit, offset, filters)
      if (response.success && response.data) {
        if (offset === undefined) {
          // Full fetch - replace all data
          const nextDetections = new Map<number, RFDetection>()
          response.data.forEach(detection => {
            nextDetections.set(detection.id, detection)
          })
          rfDetections.value = nextDetections
          updateIndexes()
        } else {
          // Paginated fetch - replace current page data only
          // Clear existing data first to ensure we're not accumulating
          rfDetections.value.clear()
          response.data.forEach(detection => {
            rfDetections.value.set(detection.id, detection)
          })
          updateIndexes()
          console.log(`[DataStore] Fetched ${response.data.length} detections (page ${offset ? Math.floor(offset / (limit || 50)) + 1 : 1}), total in store: ${rfDetections.value.size}`)
        }
        lastFetched.value.set(key, Date.now())
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch RF detections')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.value.rfDetections = message
      throw error
    } finally {
      loading.value.rfDetections = false
    }
  }

  const totalCounts = ref<{ rfDetections: number | null }>({ rfDetections: null })

  const fetchRFDetectionsCount = async (
    forceRefresh = false,
    filters?: {
      type?: string
      status?: string
      timeWindow?: number | null
      zone?: string
      search?: string
      sensorId?: string | number | null
      systemId?: string | number | null
    }
  ): Promise<number> => {
    const filterKey = filters
      ? `${filters.type || 'all'}_${filters.status || 'all'}_${filters.timeWindow || 'all'}_${filters.zone || 'all'}_${filters.search || ''}`
      : 'no_filters'
    const key = `rf_detections_count_${filterKey}`
    if (!forceRefresh && !isStale(key, 5000)) {
      const cached = totalCounts.value.rfDetections
      if (cached !== null) {
        console.log(`[DataStore] Using cached count: ${cached}`)
        return cached
      }
    }

    try {
      const response = await databaseApi.getRFDetectionsCount(filters)
      if (response.success && response.count !== undefined) {
        const count = typeof response.count === 'number' ? response.count : Number(response.count)
        if (Number.isFinite(count) && count >= 0) {
          console.log(`[DataStore] Fetched total count: ${count}`)
          totalCounts.value.rfDetections = count
          lastFetched.value.set(key, Date.now())
          return count
        } else {
          console.warn(`[DataStore] Invalid count value: ${response.count}`)
        }
      } else {
        console.warn(`[DataStore] Count fetch failed:`, response.error)
      }
      return 0
    } catch (error) {
      console.error('[DataStore] Failed to fetch RF detections count:', error)
      return 0
    }
  }

  const getRFDetection = (id: number): RFDetection | undefined => {
    return rfDetections.value.get(id)
  }

  const getRFDetectionsByDroneId = (droneId: number): RFDetection[] => {
    return rfDetectionsByDroneId.value.get(droneId) || []
  }

  const getRFDetectionsBySystemId = (systemId: string): RFDetection[] => {
    return rfDetectionsBySystemId.value.get(systemId) || []
  }

  // ========== OPERATOR POSITIONS ==========
  const fetchOperatorPositions = async (limit?: number, forceRefresh = false): Promise<OperatorPosition[]> => {
    const key = `operator_positions_${limit ?? 'all'}`
    if (!forceRefresh && !isStale(key) && operatorPositions.value.size > 0) {
      return operatorPositionsList.value
    }

    loading.value.operatorPositions = true
    errors.value.operatorPositions = null

    try {
      const response = await databaseApi.getOperatorPositions(limit)
      if (response.success && response.data) {
        operatorPositions.value.clear()
        response.data.forEach(position => {
          operatorPositions.value.set(position.id, position)
        })
        updateIndexes()
        lastFetched.value.set(key, Date.now())
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch operator positions')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.value.operatorPositions = message
      throw error
    } finally {
      loading.value.operatorPositions = false
    }
  }

  const getOperatorPosition = (id: number): OperatorPosition | undefined => {
    return operatorPositions.value.get(id)
  }

  const getOperatorPositionsBySystemId = (systemId: string): OperatorPosition[] => {
    return operatorPositionsBySystemId.value.get(systemId) || []
  }

  const getOperatorPositionsByDroneId = (droneId: number): OperatorPosition[] => {
    return operatorPositionsByDroneId.value.get(droneId) || []
  }

  // ========== GPS UNIT POSITIONS (DETECTORS) ==========
  const fetchGpsUnitPositions = async (limit?: number, forceRefresh = false): Promise<GpsUnitPosition[]> => {
    const key = `gps_unit_positions_${limit ?? 'all'}`
    if (!forceRefresh && !isStale(key) && gpsUnitPositions.value.size > 0) {
      return gpsUnitPositionsList.value
    }

    loading.value.gpsUnitPositions = true
    errors.value.gpsUnitPositions = null

    try {
      const response = await databaseApi.getGpsUnitPositions(limit)
      if (response.success && response.data) {
        gpsUnitPositions.value.clear()
        response.data.forEach(unit => {
          // Build a unique key to avoid overwriting devices that share unit_id/system_id
          const latVal = (unit as any)?.gps_lat ?? unit.latitude ?? (unit as any)?.lat ?? null
          const lonVal = (unit as any)?.gps_lon ?? unit.longitude ?? (unit as any)?.lng ?? null
          const timeVal = unit.time ?? (unit as any)?.timestamp ?? null

          const key =
            unit.id ??
            unit.unit_id ??
            (unit.system_id ? String(unit.system_id) : null) ??
            // Fallback: include coordinates and time to differentiate rows
            `row:${latVal ?? 'na'}:${lonVal ?? 'na'}:${timeVal ?? 'na'}:${Math.random().toString(36).slice(2)}`

          gpsUnitPositions.value.set(key, unit)
        })
        updateIndexes()
        lastFetched.value.set(key, Date.now())
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch GPS unit positions')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.value.gpsUnitPositions = message
      throw error
    } finally {
      loading.value.gpsUnitPositions = false
    }
  }

  const getGpsUnitPosition = (id: number | string): GpsUnitPosition | undefined => {
    return gpsUnitPositions.value.get(id) || gpsUnitsByUnitId.value.get(id)
  }

  const getGpsUnitsBySystemId = (systemId: string): GpsUnitPosition[] => {
    return gpsUnitsBySystemId.value.get(systemId) || []
  }

  // Remove a GPS unit position locally by matching id/unit_id/system_id
  const removeGpsUnitPosition = (pk: string | number) => {
    const targetKey = String(pk)
    const targetNum = Number(pk)
    let removed = false
    let removedKey: string | number | null = null

    // Try to delete by map key directly if present
    if (gpsUnitPositions.value.has(pk as any)) {
      gpsUnitPositions.value.delete(pk as any)
      removed = true
      removedKey = pk
    } else {
      // Fallback: find by id/unit_id/system_id match (handle both string and number comparisons)
      for (const [key, unit] of gpsUnitPositions.value.entries()) {
        const matches =
          (unit.id !== null && unit.id !== undefined && (String(unit.id) === targetKey || Number(unit.id) === targetNum)) ||
          (unit.unit_id !== null && unit.unit_id !== undefined && (String(unit.unit_id) === targetKey || Number(unit.unit_id) === targetNum)) ||
          (unit.system_id !== null && unit.system_id !== undefined && String(unit.system_id) === targetKey)
        if (matches) {
          gpsUnitPositions.value.delete(key)
          removed = true
          removedKey = key
          break
        }
      }
    }

    if (removed) {
      console.log('[DataStore] Removed GPS unit position:', { pk, removedKey, remaining: gpsUnitPositions.value.size })
      updateIndexes()
      // Clear cache to force refresh on next fetch
      lastFetched.value.delete('gps_unit_positions_all')
      lastFetched.value.delete('gps_unit_positions_undefined')
    } else {
      console.warn('[DataStore] Failed to find GPS unit position to remove:', pk, 'Available keys:', Array.from(gpsUnitPositions.value.keys()).slice(0, 5))
    }
  }

  const getGpsUnitByUnitId = (unitId: number | string): GpsUnitPosition | undefined => {
    return gpsUnitsByUnitId.value.get(unitId)
  }

  // ========== RECEIVER LOGS ==========
  const fetchReceiverLogs = async (limit?: number, forceRefresh = false): Promise<ReceiverLog[]> => {
    const key = `receiver_logs_${limit ?? 'all'}`
    if (!forceRefresh && !isStale(key) && receiverLogs.value.size > 0) {
      return receiverLogsList.value
    }

    loading.value.receiverLogs = true
    errors.value.receiverLogs = null

    try {
      const response = await databaseApi.getReceiverLogs(limit)
      if (response.success && response.data) {
        receiverLogs.value.clear()
        response.data.forEach(log => {
          receiverLogs.value.set(log.id, log)
        })
        lastFetched.value.set(key, Date.now())
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch receiver logs')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.value.receiverLogs = message
      throw error
    } finally {
      loading.value.receiverLogs = false
    }
  }

  const getReceiverLog = (id: number): ReceiverLog | undefined => {
    return receiverLogs.value.get(id)
  }

  // ========== FLIGHT SESSIONS ==========
  const fetchFlightSessions = async (limit = 50, forceRefresh = false): Promise<FlightSession[]> => {
    const key = `flight_sessions_${limit}`
    if (!forceRefresh && !isStale(key) && flightSessions.value.size > 0) {
      return flightSessionsList.value
    }

    loading.value.flightSessions = true
    errors.value.flightSessions = null

    try {
      const response = await databaseApi.getFlightSessions(limit)
      if (response.success && response.data) {
        flightSessions.value.clear()
        response.data.forEach(session => {
          flightSessions.value.set(session.id, session)
        })
        lastFetched.value.set(key, Date.now())
        return response.data
      } else {
        throw new Error(response.error || 'Failed to fetch flight sessions')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.value.flightSessions = message
      throw error
    } finally {
      loading.value.flightSessions = false
    }
  }

  const getFlightSession = (id: number): FlightSession | undefined => {
    return flightSessions.value.get(id)
  }

  // ========== INCREMENTAL UPDATE METHODS ==========
  // These methods allow updating individual items without full refresh
  
  const upsertRFDetection = (detection: RFDetection): void => {
    rfDetections.value.set(detection.id, detection)
    updateIndexes()
  }

  const removeRFDetection = (id: number): void => {
    rfDetections.value.delete(id)
    updateIndexes()
  }

  const upsertDronePosition = (position: DronePosition): void => {
    dronePositions.value.set(position.id, position)
    updateIndexes()
  }

  const removeDronePosition = (id: number): void => {
    dronePositions.value.delete(id)
    updateIndexes()
  }

  const upsertGpsUnitPosition = (unit: GpsUnitPosition): void => {
    // Build a unique key to avoid overwriting devices that share unit_id/system_id
    const latVal = (unit as any)?.gps_lat ?? unit.latitude ?? (unit as any)?.lat ?? null
    const lonVal = (unit as any)?.gps_lon ?? unit.longitude ?? (unit as any)?.lng ?? null
    const timeVal = unit.time ?? (unit as any)?.timestamp ?? null

    const key =
      unit.id ??
      unit.unit_id ??
      (unit.system_id ? String(unit.system_id) : null) ??
      // Fallback: include coordinates and time to differentiate rows
      `row:${latVal ?? 'na'}:${lonVal ?? 'na'}:${timeVal ?? 'na'}:${Math.random().toString(36).slice(2)}`

    gpsUnitPositions.value.set(key, unit)
    updateIndexes()
  }

  const removeGpsUnitPositionById = (pk: string | number): void => {
    // This is a wrapper that calls the existing removeGpsUnitPosition method
    // The existing method handles complex key matching
    const targetKey = String(pk)
    const targetNum = Number(pk)
    let removed = false

    // Try to delete by map key directly if present
    if (gpsUnitPositions.value.has(pk as any)) {
      gpsUnitPositions.value.delete(pk as any)
      removed = true
    } else {
      // Fallback: find by id/unit_id/system_id match
      for (const [key, unit] of gpsUnitPositions.value.entries()) {
        const matches =
          (unit.id !== null && unit.id !== undefined && (String(unit.id) === targetKey || Number(unit.id) === targetNum)) ||
          (unit.unit_id !== null && unit.unit_id !== undefined && (String(unit.unit_id) === targetKey || Number(unit.unit_id) === targetNum)) ||
          (unit.system_id !== null && unit.system_id !== undefined && String(unit.system_id) === targetKey)
        if (matches) {
          gpsUnitPositions.value.delete(key)
          removed = true
          break
        }
      }
    }

    if (removed) {
      updateIndexes()
    }
  }

  const upsertDrone = (drone: Drone): void => {
    drones.value.set(drone.id, drone)
    updateIndexes()
  }

  const removeDrone = (id: number | string): void => {
    drones.value.delete(id)
    updateIndexes()
  }

  const upsertOperatorPosition = (position: OperatorPosition): void => {
    operatorPositions.value.set(position.id, position)
    updateIndexes()
  }

  const removeOperatorPosition = (id: number): void => {
    operatorPositions.value.delete(id)
    updateIndexes()
  }

  // ========== UTILITY METHODS ==========
  const clearCache = () => {
    lastFetched.value.clear()
    databaseApi.clearCache()
  }

  const clearAll = () => {
    drones.value.clear()
    dronePositions.value.clear()
    rfDetections.value.clear()
    operatorPositions.value.clear()
    gpsUnitPositions.value.clear()
    receiverLogs.value.clear()
    flightSessions.value.clear()
    updateIndexes()
    clearCache()
  }

  return {
    // State
    drones,
    dronePositions,
    rfDetections,
    operatorPositions,
    gpsUnitPositions,
    receiverLogs,
    flightSessions,
    loading,
    errors,

    // Getters
    dronesList,
    dronePositionsList,
    rfDetectionsList,
    operatorPositionsList,
    gpsUnitPositionsList,
    receiverLogsList,
    flightSessionsList,

    // Drones
    fetchDrones,
    getDrone,
    getDronesBySystemId,

    // Drone Positions
    fetchDronePositions,
    getDronePosition,
    getDronePositionsByDroneId,

    // RF Detections
    fetchRFDetections,
    fetchRFDetectionsCount,
    getRFDetection,
    getRFDetectionsByDroneId,
    getRFDetectionsBySystemId,

    // Operator Positions
    fetchOperatorPositions,
    getOperatorPosition,
    getOperatorPositionsBySystemId,
    getOperatorPositionsByDroneId,

    // GPS Unit Positions (Detectors)
    fetchGpsUnitPositions,
    getGpsUnitPosition,
    getGpsUnitsBySystemId,
    removeGpsUnitPosition,
    getGpsUnitByUnitId,

    // Receiver Logs
    fetchReceiverLogs,
    getReceiverLog,

    // Flight Sessions
    fetchFlightSessions,
    getFlightSession,

    // Incremental Updates
    upsertRFDetection,
    removeRFDetection,
    upsertDronePosition,
    removeDronePosition,
    upsertGpsUnitPosition,
    removeGpsUnitPosition, // Keep existing method for backward compatibility
    removeGpsUnitPositionById, // New incremental update method
    upsertDrone,
    removeDrone,
    upsertOperatorPosition,
    removeOperatorPosition,

    // Utilities
    clearCache,
    clearAll,
    updateIndexes
  }
})


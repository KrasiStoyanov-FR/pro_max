import { computed, onMounted } from 'vue'
import { useDataStore } from '@/store/data'
import { databaseApi } from '@/services/api'
import type {
  Drone,
  DronePosition,
  RFDetection,
  OperatorPosition,
  GpsUnitPosition,
  ReceiverLog,
  FlightSession
} from '@/types/database'

/**
 * Composable for easy data access throughout the application
 * Provides reactive access to all data types with automatic caching and loading states
 */
export function useData() {
  const dataStore = useDataStore()

  // ========== COMPUTED GETTERS ==========
  const drones = computed(() => dataStore.dronesList)
  const dronePositions = computed(() => dataStore.dronePositionsList)
  const rfDetections = computed(() => dataStore.rfDetectionsList)
  const operatorPositions = computed(() => dataStore.operatorPositionsList)
  const detectors = computed(() => dataStore.gpsUnitPositionsList)
  const receiverLogs = computed(() => dataStore.receiverLogsList)
  const flightSessions = computed(() => dataStore.flightSessionsList)

  // Loading states
  const isLoading = computed(() => ({
    drones: dataStore.loading.drones,
    dronePositions: dataStore.loading.dronePositions,
    rfDetections: dataStore.loading.rfDetections,
    operatorPositions: dataStore.loading.operatorPositions,
    detectors: dataStore.loading.gpsUnitPositions,
    receiverLogs: dataStore.loading.receiverLogs,
    flightSessions: dataStore.loading.flightSessions
  }))

  // Error states
  const errors = computed(() => ({
    drones: dataStore.errors.drones,
    dronePositions: dataStore.errors.dronePositions,
    rfDetections: dataStore.errors.rfDetections,
    operatorPositions: dataStore.errors.operatorPositions,
    detectors: dataStore.errors.gpsUnitPositions,
    receiverLogs: dataStore.errors.receiverLogs,
    flightSessions: dataStore.errors.flightSessions
  }))

  // ========== FETCH METHODS ==========
  const fetchDrones = async (forceRefresh = false) => {
    return await dataStore.fetchDrones(forceRefresh)
  }

  const fetchDronePositions = async (limit = 100, forceRefresh = false) => {
    return await dataStore.fetchDronePositions(limit, forceRefresh)
  }

  const fetchRFDetections = async (limit = 100, forceRefresh = false) => {
    return await dataStore.fetchRFDetections(limit, forceRefresh)
  }

  const fetchOperatorPositions = async (limit = 50, forceRefresh = false) => {
    return await dataStore.fetchOperatorPositions(limit, forceRefresh)
  }

  const fetchDetectors = async (limit = 100, forceRefresh = false) => {
    return await dataStore.fetchGpsUnitPositions(limit, forceRefresh)
  }

  const fetchReceiverLogs = async (limit = 50, forceRefresh = false) => {
    return await dataStore.fetchReceiverLogs(limit, forceRefresh)
  }

  const fetchFlightSessions = async (limit = 50, forceRefresh = false) => {
    return await dataStore.fetchFlightSessions(limit, forceRefresh)
  }

  // ========== GET BY ID METHODS ==========
  const getDrone = (id: number | string): Drone | undefined => {
    return dataStore.getDrone(id)
  }

  const getDronePosition = (id: number): DronePosition | undefined => {
    return dataStore.getDronePosition(id)
  }

  const getRFDetection = (id: number): RFDetection | undefined => {
    return dataStore.getRFDetection(id)
  }

  const getOperatorPosition = (id: number): OperatorPosition | undefined => {
    return dataStore.getOperatorPosition(id)
  }

  const getDetector = (id: number | string): GpsUnitPosition | undefined => {
    return dataStore.getGpsUnitPosition(id)
  }

  const getReceiverLog = (id: number): ReceiverLog | undefined => {
    return dataStore.getReceiverLog(id)
  }

  const getFlightSession = (id: number): FlightSession | undefined => {
    return dataStore.getFlightSession(id)
  }

  // ========== FETCH INDIVIDUAL ITEMS (ON-DEMAND) ==========
  const fetchDroneById = async (id: number | string, forceRefresh = false): Promise<Drone | null> => {
    // Check cache first
    if (!forceRefresh) {
      const cached = dataStore.getDrone(id)
      if (cached) return cached
    }

    // Fetch from API
    const response = await databaseApi.getDroneById(id)
    if (response.success && response.data) {
      // Store will be updated via the response handling
      // For now, we'll manually add it to the store
      dataStore.drones.set(response.data.id, response.data)
      return response.data
    }
    return null
  }

  const fetchDetectorById = async (id: number | string, forceRefresh = false): Promise<GpsUnitPosition | null> => {
    // Check cache first
    if (!forceRefresh) {
      const cached = dataStore.getGpsUnitPosition(id)
      if (cached) return cached
    }

    // Fetch from API
    const response = await databaseApi.getDetectorById(id)
    if (response.success && response.data) {
      const key = response.data.id || response.data.unit_id || String(response.data.system_id) || String(Date.now())
      dataStore.gpsUnitPositions.set(key, response.data)
      return response.data
    }
    return null
  }

  const fetchRFDetectionById = async (id: number, forceRefresh = false): Promise<RFDetection | null> => {
    // Check cache first
    if (!forceRefresh) {
      const cached = dataStore.getRFDetection(id)
      if (cached) return cached
    }

    // Fetch from API
    const response = await databaseApi.getRFDetectionById(id)
    if (response.success && response.data) {
      dataStore.rfDetections.set(response.data.id, response.data)
      return response.data
    }
    return null
  }

  // ========== GET BY RELATIONSHIP METHODS ==========
  const getDronesBySystemId = (systemId: string): Drone[] => {
    return dataStore.getDronesBySystemId(systemId)
  }

  const getDronePositionsByDroneId = (droneId: number): DronePosition[] => {
    return dataStore.getDronePositionsByDroneId(droneId)
  }

  const getRFDetectionsByDroneId = (droneId: number): RFDetection[] => {
    return dataStore.getRFDetectionsByDroneId(droneId)
  }

  const getRFDetectionsBySystemId = (systemId: string): RFDetection[] => {
    return dataStore.getRFDetectionsBySystemId(systemId)
  }

  const getOperatorPositionsBySystemId = (systemId: string): OperatorPosition[] => {
    return dataStore.getOperatorPositionsBySystemId(systemId)
  }

  const getOperatorPositionsByDroneId = (droneId: number): OperatorPosition[] => {
    return dataStore.getOperatorPositionsByDroneId(droneId)
  }

  const getDetectorsBySystemId = (systemId: string): GpsUnitPosition[] => {
    return dataStore.getGpsUnitsBySystemId(systemId)
  }

  const getDetectorByUnitId = (unitId: number | string): GpsUnitPosition | undefined => {
    return dataStore.getGpsUnitByUnitId(unitId)
  }

  // ========== UTILITY METHODS ==========
  const clearCache = () => {
    dataStore.clearCache()
  }

  const clearAll = () => {
    dataStore.clearAll()
  }

  const refreshAll = async () => {
    await Promise.all([
      fetchDrones(true),
      fetchDronePositions(100, true),
      fetchRFDetections(100, true),
      fetchOperatorPositions(50, true),
      fetchDetectors(100, true),
      fetchReceiverLogs(50, true),
      fetchFlightSessions(50, true)
    ])
  }

  return {
    // Reactive data
    drones,
    dronePositions,
    rfDetections,
    operatorPositions,
    detectors,
    receiverLogs,
    flightSessions,
    isLoading,
    errors,

    // Fetch collections
    fetchDrones,
    fetchDronePositions,
    fetchRFDetections,
    fetchOperatorPositions,
    fetchDetectors,
    fetchReceiverLogs,
    fetchFlightSessions,

    // Get by ID (from cache)
    getDrone,
    getDronePosition,
    getRFDetection,
    getOperatorPosition,
    getDetector,
    getReceiverLog,
    getFlightSession,

    // Fetch individual items (on-demand)
    fetchDroneById,
    fetchDetectorById,
    fetchRFDetectionById,

    // Get by relationship
    getDronesBySystemId,
    getDronePositionsByDroneId,
    getRFDetectionsByDroneId,
    getRFDetectionsBySystemId,
    getOperatorPositionsBySystemId,
    getOperatorPositionsByDroneId,
    getDetectorsBySystemId,
    getDetectorByUnitId,

    // Utilities
    clearCache,
    clearAll,
    refreshAll
  }
}


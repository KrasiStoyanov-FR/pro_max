import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/store/auth'
import router from '@/router'
import type { 
  Drone, 
  DronePosition, 
  RFDetection, 
  FlightSession, 
  OperatorPosition, 
  ReceiverLog,
  GpsUnitPosition,
  DroneWithPositions,
  MapMarker,
  DronePositionsResponse,
  DronesResponse,
  RFDetectionsResponse,
  GpsUnitPositionsResponse,
  DatabaseResponse
} from '@/types/database'
import type { SystemStatusResponse } from '@/types/system'

// Database name configuration
const DATABASE_NAME = import.meta.env.VITE_DB_NAME || 'drone_monitoring'

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/db',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach auth token
api.interceptors.request.use(
  (config: any) => {
    const authStore = useAuthStore()
    
    if (authStore.token && config.headers) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    const authStore = useAuthStore()
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      authStore.logout()
      router.push('/login')
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      // TODO: Show access denied message
      console.warn('Access denied')
    }
    
    return Promise.reject(error)
  }
)

// API endpoints
export const apiEndpoints = {
  // Authentication
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  profile: '/auth/profile',
  
  // Map data
  targets: '/targets',
  targetsById: (id: string) => `/targets/${id}`,
  targetsByBounds: (bounds: string) => `/targets?bbox=${bounds}`,
  
  // Radar data
  radarStatus: '/radar/status',
  radarHistory: '/radar/history',
  
  // System
  health: '/health',
  version: '/version',
}


// Simple cache to prevent duplicate API calls
const apiCache = new Map<string, { data: any; timestamp: number }>()
const pendingRequests = new Map<string, Promise<any>>()
const CACHE_DURATION = 30000 // 30 seconds cache

// Helper function to get cached data or fetch new data with request deduplication
const getCachedData = async (key: string, fetchFn: () => Promise<any>) => {
  const cached = apiCache.get(key)
  const now = Date.now()
  
  // Return cached data if it's still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data
  }
  
  // If there's already a pending request for this key, wait for it
  if (pendingRequests.has(key)) {
    return await pendingRequests.get(key)
  }
  
  // Create a new request and store it as pending
  const requestPromise = fetchFn().then(data => {
    // Cache the result
    apiCache.set(key, { data, timestamp: Date.now() })
    // Remove from pending requests
    pendingRequests.delete(key)
    return data
  }).catch(error => {
    // Remove from pending requests on error
    pendingRequests.delete(key)
    throw error
  })
  
  pendingRequests.set(key, requestPromise)
  return await requestPromise
}

// Function to clear cache (useful for forced refresh)
const clearCache = () => {
  apiCache.clear()
  pendingRequests.clear()
}

// Real database API functions
export const databaseApi = {
  async login(credentials: { email: string; password: string }) {
    throw new Error('Authentication not yet implemented - please implement real auth endpoint')
  },
  
  // Get all drones from database
  async getDrones(): Promise<DronesResponse> {
    // REAL DATA: Original API call (commented out when using mock data)
    return getCachedData('drones', async () => {
      try {
        const response = await api.get(`/table/drones?database=${DATABASE_NAME}`)
        return {
          success: true,
          data: response.data.data as Drone[]
        }
      } catch (error) {
        console.error('[API] Failed to fetch drones from database:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  },
  
  // Get drone positions from database
  async getDronePositions(limit?: number): Promise<DronePositionsResponse> {
    const cacheKey = `drone_positions_${limit ?? 'all'}`
    // REAL DATA: Original API call (commented out when using mock data)
    return getCachedData(cacheKey, async () => {
      try {
        const limitParam = typeof limit === 'number' ? `&limit=${limit}` : ''
        const response = await api.get(`/table/drone_positions?database=${DATABASE_NAME}${limitParam}`)
        return {
          success: true,
          data: response.data.data as DronePosition[]
        }
      } catch (error) {
        console.error('[API] Failed to fetch drone positions from database:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  },
  
  // Get RF detections from database
  async getRFDetections(
    limit?: number,
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
  ): Promise<RFDetectionsResponse> {
    const filterKey = filters
      ? `${filters.type || 'all'}_${filters.status || 'all'}_${filters.timeWindow || 'all'}_${filters.zone || 'all'}_${filters.search || ''}_${filters.systemId ?? ''}`
      : 'no_filters'
    const cacheKey = `rf_detections_${limit ?? 'all'}_${offset ?? 0}_${filterKey}`
    // REAL DATA: Original API call (commented out when using mock data)
    return getCachedData(cacheKey, async () => {
      try {
        const params = new URLSearchParams()
        params.append('database', DATABASE_NAME)
        if (typeof limit === 'number' && limit > 0) {
          params.append('limit', limit.toString())
        }
        if (typeof offset === 'number' && offset >= 0) {
          params.append('offset', offset.toString())
        }
        if (filters) {
          if (filters.type && filters.type !== 'all') {
            params.append('type', filters.type)
          }
          if (filters.status && filters.status !== 'all') {
            params.append('status', filters.status)
          }
          if (filters.timeWindow) {
            params.append('timeWindow', filters.timeWindow.toString())
          }
          if (filters.zone && filters.zone !== 'all') {
            params.append('zone', filters.zone)
          }
          if (filters.search && filters.search.trim()) {
            params.append('search', filters.search.trim())
          }
          if (filters.systemId != null && filters.systemId !== '') {
            params.append('systemId', String(filters.systemId))
          }
        }
        const response = await api.get(`/table/rf_detections?${params.toString()}`)
        return {
          success: true,
          data: response.data.data as RFDetection[]
        }
      } catch (error) {
        console.error('[API] Failed to fetch RF detections from database:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }) // Shorter cache for filtered results (defaults to CACHE_DURATION)
  },

  async getRFDetectionsCount(filters?: {
    type?: string
    status?: string
    timeWindow?: number | null
    zone?: string
    search?: string
    sensorId?: string | number | null
    systemId?: string | number | null
  }): Promise<{ success: boolean; count?: number; error?: string }> {
    const filterKey = filters
      ? `${filters.type || 'all'}_${filters.status || 'all'}_${filters.timeWindow || 'all'}_${filters.zone || 'all'}_${filters.search || ''}_${filters.systemId ?? ''}`
      : 'no_filters'
    const cacheKey = `rf_detections_count_${filterKey}`
    return getCachedData(cacheKey, async () => {
      try {
        const params = new URLSearchParams()
        params.append('database', DATABASE_NAME)
        params.append('count', 'true')
        if (filters) {
          if (filters.type && filters.type !== 'all') {
            params.append('type', filters.type)
          }
          if (filters.status && filters.status !== 'all') {
            params.append('status', filters.status)
          }
          if (filters.timeWindow) {
            params.append('timeWindow', filters.timeWindow.toString())
          }
          if (filters.zone && filters.zone !== 'all') {
            params.append('zone', filters.zone)
          }
          if (filters.search && filters.search.trim()) {
            params.append('search', filters.search.trim())
          }
          if (filters.sensorId !== null && filters.sensorId !== undefined) {
            params.append('sensorId', String(filters.sensorId))
          }
          if (filters.systemId !== null && filters.systemId !== undefined) {
            params.append('systemId', String(filters.systemId))
          }
        }
        const response = await api.get(`/table/rf_detections?${params.toString()}`)
        // Server returns { success: true, count: number }
        const count = response.data?.count ?? response.data?.data?.count ?? 0
        return {
          success: true,
          count: typeof count === 'number' ? count : 0
        }
      } catch (error) {
        console.error('[API] Failed to fetch RF detections count:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }) // Shorter cache for filtered counts (defaults to CACHE_DURATION)
  },
  
  // Get flight sessions from database
  async getFlightSessions(limit: number = 50): Promise<{ success: boolean; data?: FlightSession[]; error?: string }> {
    try {
      const response = await api.get(`/table/flight_sessions?database=${DATABASE_NAME}&limit=${limit}`)
    return {
        success: true,
        data: response.data.data as FlightSession[]
      }
    } catch (error) {
      console.error('[API] Failed to fetch flight sessions from database:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
  
  // Get operator positions from database
  async getOperatorPositions(limit?: number): Promise<{ success: boolean; data?: OperatorPosition[]; error?: string }> {
    const cacheKey = `operator_positions_${limit ?? 'all'}`
    // REAL DATA: Original API call (commented out when using mock data)
    return getCachedData(cacheKey, async () => {
      try {
        const limitParam = typeof limit === 'number' ? `&limit=${limit}` : ''
        const response = await api.get(`/table/operator_positions?database=${DATABASE_NAME}${limitParam}`)
        return {
          success: true,
          data: response.data.data as OperatorPosition[]
        }
      } catch (error) {
        console.error('[API] Failed to fetch operator positions from database:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  },

  async getGpsUnitPositions(limit?: number): Promise<GpsUnitPositionsResponse> {
    const cacheKey = `gps_unit_position_${limit ?? 'all'}`
    // REAL DATA: Original API call (commented out when using mock data)
    return getCachedData(cacheKey, async () => {
      try {
        const limitParam = typeof limit === 'number' ? `&limit=${limit}` : ''
        const response = await api.get(`/table/gps_unit_position?database=${DATABASE_NAME}${limitParam}`)
        return {
          success: true,
          data: response.data.data as GpsUnitPosition[]
        }
      } catch (error) {
        console.error('[API] Failed to fetch GPS unit positions from database:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  },

  // Create a new device (GPS unit)
  async createDevice(deviceData: {
    unitId?: string | number | null
    name: string
    latitude: number
    longitude: number
  }): Promise<DatabaseResponse<GpsUnitPosition>> {
    try {
      // Clear cache for GPS unit positions to force refresh
      apiCache.delete('gps_unit_position_all')
      apiCache.delete('gps_unit_position_undefined')
      
      // Prepare the device data for the database
      // Map form fields to actual database column names
      // Based on the actual schema: unit_id, gps_lat, gps_lon, unit_name
      const payload: any = {
        gps_lat: deviceData.latitude,
        gps_lon: deviceData.longitude
      }

      // Map unit_id - try to convert to number if it's a numeric string
      if (deviceData.unitId) {
        const unitIdNum = Number(deviceData.unitId)
        payload.unit_id = !isNaN(unitIdNum) ? unitIdNum : deviceData.unitId
      }

      // Map name to unit_name if provided
      if (deviceData.name) {
        payload.unit_name = deviceData.name
      }

      // Note: The backend will filter out any columns that don't exist in the table
      // So we can try to include optional fields and they'll be ignored if not present

      // Insert into database via API
      const response = await api.post(`/table/gps_unit_position?database=${DATABASE_NAME}`, {
        data: payload
      })

      // Backend returns { success: true, data: <created record> }
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data as GpsUnitPosition
        }
      }

      return {
        success: false,
        error: response.data.error || 'Failed to create device'
      }
    } catch (error: any) {
      console.error('[API] Failed to create device:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  },

  // Update a GPS unit position device
  async updateDevice(
    existingDevice: GpsUnitPosition,
    deviceData: {
      unitId?: string | number | null
      name: string
      latitude: number
      longitude: number
    }
  ): Promise<DatabaseResponse<GpsUnitPosition>> {
    try {
      // Clear cache for GPS unit positions to force refresh
      apiCache.delete('gps_unit_position_all')
      apiCache.delete('gps_unit_position_undefined')
      
      // Determine the primary key - for gps_unit_position, prefer id (numeric) over unit_id (may contain spaces/special chars)
      // Use id if available, otherwise fall back to unit_id
      const pkValue = existingDevice.id ?? existingDevice.unit_id
      const pkColumn = existingDevice.id !== null && existingDevice.id !== undefined ? 'id' : 'unit_id'
      
      if (!pkValue) {
        return {
          success: false,
          error: 'Cannot update device: no primary key found'
        }
      }

      // Prepare the update payload
      const payload: any = {
        gps_lat: deviceData.latitude,
        gps_lon: deviceData.longitude
      }

      // Map name to unit_name
      if (deviceData.name) {
        payload.unit_name = deviceData.name
      }

      // Note: unit_id cannot be changed during update (it's the primary key)
      // The backend will filter out any columns that don't exist in the table

      // Update via API using PUT method
      // Encode pkValue to handle special characters and spaces
      const encodedPkValue = encodeURIComponent(String(pkValue))
      const url = `/table/gps_unit_position/${encodedPkValue}?database=${DATABASE_NAME}&pkColumn=${encodeURIComponent(pkColumn)}`

      const response = await api.put(url, { data: payload })

      // Backend returns { success: true, data: <updated record> }
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data as GpsUnitPosition
        }
      }

      return {
        success: false,
        error: response.data.error || 'Failed to update device'
      }
    } catch (error: any) {
      console.error('[API] Failed to update device:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  },

  // Delete a GPS unit position by id (primary key)
  async deleteGpsUnitPosition(recordId: string | number, pkColumn?: string): Promise<DatabaseResponse<{ deleted: number }>> {
    try {
      // Clear cache for GPS unit positions to force refresh after deletion
      apiCache.delete('gps_unit_position_all')
      apiCache.delete('gps_unit_position_undefined')
      
      const pkParam = pkColumn ? `&pkColumn=${encodeURIComponent(pkColumn)}` : ''
      console.log('[API] Deleting GPS unit position:', { recordId, pkColumn, url: `/table/gps_unit_position/${recordId}?database=${DATABASE_NAME}${pkParam}` })
      
      const response = await api.delete(`/table/gps_unit_position/${recordId}?database=${DATABASE_NAME}${pkParam}`)
      
      console.log('[API] Delete response:', response.data)
      
      if (response.data.success) {
        const deletedCount = response.data.data?.deleted ?? 0
        if (deletedCount > 0) {
          return {
            success: true,
            data: response.data.data
          }
        } else {
          return {
            success: false,
            error: `No records were deleted. The record with ${pkColumn || 'primary key'}="${recordId}" may not exist.`
          }
        }
      } else {
        return {
          success: false,
          error: response.data.error || 'Delete request failed'
        }
      }
    } catch (error: any) {
      console.error('[API] Failed to delete GPS unit position:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  },

  // Get individual items by ID
  async getDroneById(id: number | string): Promise<DatabaseResponse<Drone>> {
    return getCachedData(`drone_${id}`, async () => {
      try {
        const response = await api.get(`/table/drones?database=${DATABASE_NAME}&id=${id}`)
        const drones = response.data.data as Drone[]
        const drone = drones.find(d => d.id === Number(id) || String(d.id) === String(id))
        if (drone) {
          return {
            success: true,
            data: drone
          }
        }
        return {
          success: false,
          error: `Drone with ID ${id} not found`
        }
      } catch (error) {
        console.error(`[API] Failed to fetch drone ${id} from database:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  },

  async getDetectorById(id: number | string): Promise<DatabaseResponse<GpsUnitPosition>> {
    return getCachedData(`detector_${id}`, async () => {
      try {
        const response = await api.get(`/table/gps_unit_position?database=${DATABASE_NAME}&id=${id}`)
        const units = response.data.data as GpsUnitPosition[]
        const unit = units.find(u => 
          u.id === Number(id) || 
          String(u.id) === String(id) ||
          u.unit_id === Number(id) ||
          String(u.unit_id) === String(id)
        )
        if (unit) {
          return {
            success: true,
            data: unit
          }
        }
        return {
          success: false,
          error: `Detector with ID ${id} not found`
        }
      } catch (error) {
        console.error(`[API] Failed to fetch detector ${id} from database:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  },

  async getRFDetectionById(id: number): Promise<DatabaseResponse<RFDetection>> {
    return getCachedData(`rf_detection_${id}`, async () => {
      try {
        const response = await api.get(`/table/rf_detections?database=${DATABASE_NAME}&id=${id}`)
        const detections = response.data.data as RFDetection[]
        const detection = detections.find(d => d.id === id)
        if (detection) {
          return {
            success: true,
            data: detection
          }
        }
        return {
          success: false,
          error: `RF Detection with ID ${id} not found`
        }
      } catch (error) {
        console.error(`[API] Failed to fetch RF detection ${id} from database:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  },
  
  // Get receiver logs from database
  // TOOD: show history of what happened to the device (only for the engineer role of the user)
  async getReceiverLogs(limit?: number): Promise<{ success: boolean; data?: ReceiverLog[]; error?: string }> {
    const limitParam = typeof limit === 'number' ? `&limit=${limit}` : ''
    try {
      const response = await api.get(`/table/receiver_logs?database=${DATABASE_NAME}${limitParam}`)
      return {
        success: true,
        data: response.data.data as ReceiverLog[]
      }
    } catch (error) {
      console.error('[API] Failed to fetch receiver logs from database:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
  
  // Legacy method - get targets (now returns drone positions as map markers)
  async getTargets(bounds?: string) {
    try {
      // Get real drone positions from database
      const positionsResponse = await this.getDronePositions(50)
      
      if (positionsResponse.success && positionsResponse.data) {
        // Convert drone positions to map markers
        const markers = positionsResponse.data.map((position: DronePosition) => ({
          id: `drone-${position.drone_id}-${position.id}`,
          lat: parseFloat(position.latitude.toString()),
          lng: parseFloat(position.longitude.toString()),
          title: `Drone ${position.drone_id}`,
          type: 'drone' as const,
          status: 'active',
          priority: 'high',
          data: {
            altitude: position.altitude,
            speed: position.speed,
            timestamp: position.time,
            receiver_type: position.receiver_type
          }
        }))
        
        return {
          data: {
            targets: markers
          }
        }
      }
      
      throw new Error('No drone positions available from database')
    } catch (error) {
      console.error('[API] Failed to fetch targets from database:', error)
      throw new Error(`Failed to fetch drone positions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
  
  // Legacy method - get target by ID
  async getTargetById(id: string) {
    try {
      // Try to find drone position by ID
      const positionsResponse = await this.getDronePositions(1000)
      
      if (positionsResponse.success && positionsResponse.data) {
        const position = positionsResponse.data.find(p => p.id.toString() === id || p.drone_id.toString() === id)
        if (position) {
          return {
            data: {
              id: position.id.toString(),
              lat: parseFloat(position.latitude.toString()),
              lng: parseFloat(position.longitude.toString()),
              title: `Drone ${position.drone_id}`,
              type: 'drone',
              status: 'active',
              priority: 'high',
              data: {
                altitude: position.altitude,
                speed: position.speed,
                timestamp: position.time,
                receiver_type: position.receiver_type
              }
            }
          }
        }
      }
      
      throw new Error(`Target with ID ${id} not found in database`)
    } catch (error) {
      console.error('[API] Failed to fetch target by ID from database:', error)
      throw new Error(`Failed to fetch target: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
  
  async getRadarStatus() {
    try {
      // Get receiver logs to determine radar status
      const logsResponse = await this.getReceiverLogs(10)
      
      if (logsResponse.success && logsResponse.data) {
        const latestLog = logsResponse.data[0]
        return {
          data: {
            status: latestLog?.status || 'unknown',
            message: latestLog?.message || 'Radar system status unknown',
            lastUpdate: latestLog?.time
          }
        }
      }
      
      throw new Error('No receiver logs available from database')
    } catch (error) {
      console.error('[API] Failed to fetch radar status from database:', error)
      throw new Error(`Failed to fetch radar status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
  
  async getHealth() {
    // REAL DATA: Original API call (commented out when using mock data)
    try {
      const response = await api.get('/health')
      return response
    } catch (error) {
      console.error('[API] Failed to fetch health status:', error)
      return {
        data: {
          status: 'error',
          message: 'Database connection failed'
        }
      }
    }
  },

  // Get system status aggregate endpoint
  // Note: Bypasses cache to ensure fresh data every poll (5s interval)
  async getSystemStatus(forceRefresh = false): Promise<SystemStatusResponse> {
    // Check for pending request (request deduplication only)
    const pendingKey = 'system_status_pending'
    if (pendingRequests.has(pendingKey) && !forceRefresh) {
      return await pendingRequests.get(pendingKey)
    }
    
    const normalizeTimestamp = (value: string | null | undefined) => {
      if (!value) return ''
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toISOString()
    }

    const normalizeCoordinate = (value: number | string | null | undefined, precision = 4) => {
      if (value === null || value === undefined) return ''
      const numeric = typeof value === 'string' ? parseFloat(value) : value
      if (!Number.isFinite(numeric)) return ''
      return numeric.toFixed(precision)
    }

    const buildEntityKey = (...parts: Array<string | number | null | undefined>) => {
      const sanitized = parts
        .map(part => {
          if (typeof part === 'string') return part.trim()
          if (typeof part === 'number') return part.toString()
          return part ?? ''
        })
        .filter(part => part !== '' && part !== null && part !== undefined)
      return sanitized.length ? sanitized.join('|') : ''
    }

    const fetchFn = async () => {
      try {
        // Aggregate from individual endpoints
        const [healthResponse, dronesResponse, dronePositionsResponse, detectionsResponse, operatorsResponse] = await Promise.allSettled([
          this.getHealth(),
          this.getDrones(),
          this.getDronePositions(),
          this.getRFDetections(),
          this.getOperatorPositions()
        ])

        // Determine database status
        let dbStatus: 'ok' | 'degraded' | 'down' = 'ok'
        let dbMessage = 'Database connected'
        
        if (healthResponse.status === 'rejected') {
          dbStatus = 'down'
          dbMessage = 'Health check failed'
        } else {
          const health = healthResponse.value?.data
          if (!health || health.status === 'error') {
            dbStatus = 'down'
            dbMessage = 'Database connection failed'
          } else if (health.status === 'degraded') {
            dbStatus = 'degraded'
            dbMessage = 'Database performance degraded'
          }
        }

        // Count active drones (deduplicated, recent positions)
        // Time window configuration from environment variables
        const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
        
        const getActiveWindow = (): number => {
          if (isTestMode) return ONE_YEAR_MS
          const envValue = import.meta.env.VITE_ACTIVE_POSITION_WINDOW_MS
          return envValue ? parseInt(envValue, 10) : 15 * 60 * 1000 // Default: 15 minutes
        }
        
        // Helper to format time window for logging
        const formatTimeWindow = (ms: number): string => {
          if (ms >= 365 * 24 * 60 * 60 * 1000) return '1 year'
          if (ms >= 24 * 60 * 60 * 1000) return `${Math.round(ms / (24 * 60 * 60 * 1000))} days`
          if (ms >= 60 * 60 * 1000) return `${Math.round(ms / (60 * 60 * 1000))} hours`
          if (ms >= 60 * 1000) return `${Math.round(ms / (60 * 1000))} minutes`
          return `${Math.round(ms / 1000)} seconds`
        }
        
        let activeDrones = 0
        const activeWindowMs = getActiveWindow()
        const cutoffTime = activeWindowMs > 0 ? Date.now() - activeWindowMs : 0

        // Use Set to track unique drones by drone_id (and system_id if available)
        // This ensures we count unique drones, not unique positions
        const uniqueActiveDrones = new Set<string>()

        if (
          dronePositionsResponse.status === 'fulfilled' &&
          dronePositionsResponse.value.success &&
          Array.isArray(dronePositionsResponse.value.data)
        ) {
          dronePositionsResponse.value.data.forEach(position => {
            const timestamp = position.time ? new Date(position.time).getTime() : NaN
            if (Number.isNaN(timestamp) || timestamp < cutoffTime) {
              return
            }

            // Count unique drones, not unique positions
            // Use drone_id as primary identifier, with system_id as secondary for uniqueness
            // Don't include coordinates - we want to count the drone once, not once per position
            const key = position.drone_id !== null && position.drone_id !== undefined
              ? `drone:${position.drone_id}${position.system_id ? `:system:${position.system_id}` : ''}`
              : null

            if (key && !uniqueActiveDrones.has(key)) {
              uniqueActiveDrones.add(key)
            }
          })
        }

        // Only count drones with positions in the configured time window
        activeDrones = uniqueActiveDrones.size
        
        // Log for debugging
        console.log(`[SystemStatus] Active drones: ${activeDrones} unique drones (time window: ${formatTimeWindow(activeWindowMs)}, source: ${isTestMode ? 'test mode' : (import.meta.env.VITE_ACTIVE_POSITION_WINDOW_MS ? 'env' : 'default')})`)

        // Count RF detections (deduplicated by system + drone + timestamp)
        // Time window from environment variables, or 1 year in test mode
        const getDetectionWindow = (): number => {
          if (isTestMode) return ONE_YEAR_MS
          const envValue = import.meta.env.VITE_DETECTION_WINDOW_MS
          return envValue ? parseInt(envValue, 10) : 60 * 60 * 1000 // Default: 1 hour
        }
        
        let rfDetections = 0
        if (detectionsResponse.status === 'fulfilled' && detectionsResponse.value.success && Array.isArray(detectionsResponse.value.data)) {
          const detectionWindowMs = getDetectionWindow()
          const detectionCutoff = detectionWindowMs > 0 ? Date.now() - detectionWindowMs : 0
          const uniqueDetections = new Set<string>()
          detectionsResponse.value.data.forEach(detection => {
            // Filter to only count detections within the configured window
            const detectionTime = detection.time ? new Date(detection.time).getTime() : NaN
            if (Number.isNaN(detectionTime) || detectionTime < detectionCutoff) {
              return
            }
            
            const timestamp = normalizeTimestamp(detection.time)
            const key =
              buildEntityKey(detection.system_id, detection.drone_id, timestamp) ||
              `detection:${detection.id}`
            if (!uniqueDetections.has(key)) {
              uniqueDetections.add(key)
            }
          })
          rfDetections = uniqueDetections.size
        }

        // Count operators online (deduplicated within 5 minutes window)
        let operatorsOnline = 0
        if (operatorsResponse.status === 'fulfilled' && operatorsResponse.value.success && Array.isArray(operatorsResponse.value.data)) {
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
          const uniqueOperators = new Set<string>()
          operatorsResponse.value.data.forEach(operator => {
            if (!operator.time) return
            const operatorTime = new Date(operator.time).getTime()
            if (Number.isNaN(operatorTime) || operatorTime < fiveMinutesAgo) return

            const key =
              buildEntityKey(
                operator.system_id,
                operator.drone_id,
                normalizeCoordinate(operator.latitude, 3),
                normalizeCoordinate(operator.longitude, 3)
              ) || `operator:${operator.id}`

            if (!uniqueOperators.has(key)) {
              uniqueOperators.add(key)
            }
          })
          operatorsOnline = uniqueOperators.size
        }

        return {
          success: true,
          data: {
            database: {
              status: dbStatus,
              message: dbMessage,
              lastCheck: new Date().toISOString()
            },
            metrics: {
              activeDrones,
              rfDetections,
              operatorsOnline,
              lastUpdated: new Date().toISOString()
            }
          },
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        console.error('[API] Failed to fetch system status:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    }

    // Execute fetch with request deduplication (but no caching)
    const requestPromise = fetchFn().then(data => {
      pendingRequests.delete(pendingKey)
      return data
    }).catch(error => {
      pendingRequests.delete(pendingKey)
      throw error
    })

    pendingRequests.set(pendingKey, requestPromise)
    return await requestPromise
  },
  
  // Clear cache to force fresh data fetch
  clearCache() {
    clearCache()
  }
}

// Export the database API service
export const apiService = databaseApi

export default api

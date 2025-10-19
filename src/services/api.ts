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
  DroneWithPositions,
  MapMarker,
  DronePositionsResponse,
  DronesResponse,
  RFDetectionsResponse
} from '@/types/database'

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001/api/db',
  timeout: 30000,
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
    return getCachedData('drones', async () => {
      try {
        const response = await api.get('/table/drones?database=drone_monitoring')
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
  async getDronePositions(limit: number = 100): Promise<DronePositionsResponse> {
    return getCachedData(`drone_positions_${limit}`, async () => {
      try {
        const response = await api.get(`/table/drone_positions?database=drone_monitoring&limit=${limit}`)
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
  async getRFDetections(limit: number = 100): Promise<RFDetectionsResponse> {
    return getCachedData(`rf_detections_${limit}`, async () => {
      try {
        const response = await api.get(`/table/rf_detections?database=drone_monitoring&limit=${limit}`)
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
    })
  },
  
  // Get flight sessions from database
  async getFlightSessions(limit: number = 50): Promise<{ success: boolean; data?: FlightSession[]; error?: string }> {
    try {
      const response = await api.get(`/table/flight_sessions?database=drone_monitoring&limit=${limit}`)
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
  async getOperatorPositions(limit: number = 50): Promise<{ success: boolean; data?: OperatorPosition[]; error?: string }> {
    return getCachedData(`operator_positions_${limit}`, async () => {
      try {
        const response = await api.get(`/table/operator_positions?database=drone_monitoring&limit=${limit}`)
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
  
  // Get receiver logs from database
  async getReceiverLogs(limit: number = 50): Promise<{ success: boolean; data?: ReceiverLog[]; error?: string }> {
    try {
      const response = await api.get(`/table/receiver_logs?database=drone_monitoring&limit=${limit}`)
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
  
  // Clear cache to force fresh data fetch
  clearCache() {
    clearCache()
  }
}

// Export the database API service
export const apiService = databaseApi

export default api

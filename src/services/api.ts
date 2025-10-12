import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/store/auth'
import router from '@/router'

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
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

// API endpoints - TODO: Replace with real backend endpoints
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

// Mock API functions for development
export const mockApi = {
  // Mock login endpoint
  async login(credentials: { email: string; password: string }) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (credentials.email === 'admin@radar.com' && credentials.password === 'password') {
      return {
        data: {
          user: {
            id: '1',
            name: 'Admin User',
            email: 'admin@radar.com',
            role: 'admin'
          },
          token: 'mock-jwt-token-' + Date.now(),
          expiresIn: 86400 // 24 hours
        }
      }
    } else {
      throw new Error('Invalid credentials')
    }
  },
  
  // Mock targets endpoint
  async getTargets(bounds?: string) {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Return mock targets data
    return {
      data: {
        targets: [
          {
            id: '1',
            lat: 40.7128,
            lng: -74.0060,
            title: 'New York Radar Station',
            type: 'radar',
            status: 'active',
            priority: 'high'
          },
          {
            id: '2',
            lat: 34.0522,
            lng: -118.2437,
            title: 'Los Angeles Target',
            type: 'target',
            status: 'warning',
            priority: 'medium'
          },
          {
            id: '3',
            lat: 41.8781,
            lng: -87.6298,
            title: 'Chicago Threat',
            type: 'threat',
            status: 'critical',
            priority: 'critical'
          }
        ]
      }
    }
  },
  
  // Mock target by ID
  async getTargetById(id: string) {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const targets = [
      {
        id: '1',
        lat: 40.7128,
        lng: -74.0060,
        title: 'New York Radar Station',
        description: 'Primary radar station covering the northeastern region',
        type: 'radar',
        status: 'active',
        priority: 'high',
        data: {
          frequency: '2.4 GHz',
          range: '250 km',
          altitude: '150 m',
          lastUpdate: new Date().toISOString()
        }
      }
    ]
    
    const target = targets.find(t => t.id === id)
    if (!target) {
      throw new Error('Target not found')
    }
    
    return { data: target }
  }
}

// Production API functions (to be implemented when backend is ready)
export const productionApi = {
  async login(credentials: { email: string; password: string }) {
    return api.post(apiEndpoints.login, credentials)
  },
  
  async getTargets(bounds?: string) {
    const url = bounds ? apiEndpoints.targetsByBounds(bounds) : apiEndpoints.targets
    return api.get(url)
  },
  
  async getTargetById(id: string) {
    return api.get(apiEndpoints.targetsById(id))
  },
  
  async getRadarStatus() {
    return api.get(apiEndpoints.radarStatus)
  },
  
  async getHealth() {
    return api.get(apiEndpoints.health)
  }
}

// Export the appropriate API based on environment
export const apiService = import.meta.env.DEV ? mockApi : productionApi

export default api

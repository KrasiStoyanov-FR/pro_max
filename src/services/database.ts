import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

// Database connection configuration
const DB_CONFIG = {
  baseURL: 'http://detect.pm99.site:58591',
  username: 'drone_app',
  password: 'Qwerty@',
  timeout: 30000, // 30 seconds timeout for database operations
}

// Create axios instance for database operations
// Use backend API server
const dbApi: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001/api/db',
  timeout: DB_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request interceptor for logging
dbApi.interceptors.request.use(
  (config) => {
    console.log(`[DB] Making request to: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[DB] Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for logging and error handling
dbApi.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[DB] Response received: ${response.status} ${response.statusText}`)
    console.log(`[DB] Response data:`, response.data)
    return response
  },
  (error) => {
    console.error('[DB] Response error:', error.response?.status, error.response?.statusText)
    console.error('[DB] Error details:', error.response?.data)
    return Promise.reject(error)
  }
)

// Database service functions
export const databaseService = {
  // Check database connection status
  async checkConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('[DB] Checking database connection...')
      console.log('[DB] Using baseURL:', dbApi.defaults.baseURL)
      
      const response = await dbApi.get('/test')
      return {
        success: true,
        message: 'Database connection active',
        data: response.data
      }
    } catch (error: any) {
      console.error('[DB] Connection check failed:', error)
      
      let errorMessage = 'Database connection unavailable'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        message: errorMessage,
        data: error.response?.data,
        details: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullError: error.response?.data
        }
      }
    }
  },

  // Get all databases
  async getDatabases(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      console.log('[DB] Fetching databases...')
      const response = await dbApi.get('/databases')
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('[DB] Failed to fetch databases:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get all tables/schemas
  async getTables(database?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log(`[DB] Fetching database tables${database ? ` from ${database}` : ''}...`)
      const url = database ? `/tables/${database}` : '/tables'
      const response = await dbApi.get(url)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('[DB] Failed to fetch tables:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get all data from a specific table
  async getTableData(tableName: string, database?: string, limit: number = 100): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log(`[DB] Fetching data from table: ${tableName}${database ? ` in database: ${database}` : ''}`)
      const params = new URLSearchParams()
      if (database) params.append('database', database)
      if (limit) params.append('limit', limit.toString())
      
      const url = `/table/${tableName}${params.toString() ? `?${params.toString()}` : ''}`
      const response = await dbApi.get(url)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error(`[DB] Failed to fetch data from table ${tableName}:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get all data from all tables
  async getAllData(): Promise<{ success: boolean; data?: Record<string, any>; error?: string }> {
    try {
      console.log('[DB] Fetching all database data...')
      const response = await dbApi.get('/all-data')
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('[DB] Failed to fetch all data:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Execute custom query
  async executeQuery(query: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`[DB] Executing query: ${query}`)
      const response = await dbApi.post('/query', { query })
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('[DB] Query execution failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // Get table schema information
  async getTableSchema(tableName: string, database?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log(`[DB] Fetching schema for table: ${tableName}${database ? ` in database: ${database}` : ''}`)
      const params = new URLSearchParams()
      if (database) params.append('database', database)
      
      const url = `/schema/${tableName}${params.toString() ? `?${params.toString()}` : ''}`
      const response = await dbApi.get(url)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('[DB] Failed to fetch schema:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default databaseService

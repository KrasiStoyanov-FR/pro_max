import { ref, onUnmounted } from 'vue'
import type { RFDetection, DronePosition, GpsUnitPosition } from '@/types/database'

export interface RealtimeUpdate {
  type: 'rf_detection' | 'drone_position' | 'gps_unit_position' | 'drone' | 'operator_position'
  action: 'insert' | 'update' | 'delete'
  data: RFDetection | DronePosition | GpsUnitPosition | any
  timestamp: string
}

export interface RealtimeServiceCallbacks {
  onRFDetection?: (detection: RFDetection, action: 'insert' | 'update' | 'delete') => void
  onDronePosition?: (position: DronePosition, action: 'insert' | 'update' | 'delete') => void
  onGpsUnitPosition?: (unit: GpsUnitPosition, action: 'insert' | 'update' | 'delete') => void
  onDrone?: (drone: any, action: 'insert' | 'update' | 'delete') => void
  onOperatorPosition?: (position: any, action: 'insert' | 'update' | 'delete') => void
  onError?: (error: Error) => void
  onReconnect?: () => void
}

class RealtimeService {
  private eventSource: EventSource | null = null
  private callbacks: RealtimeServiceCallbacks = {}
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000 // Start with 1 second
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isConnecting = false
  private baseURL: string

  constructor() {
    // Get SSE endpoint URL - can be different from main API URL
    // Priority: VITE_SSE_BASE_URL > VITE_API_BASE_URL > default
    // This allows testing SSE on localhost while using remote server for data
    const sseEnvURL = import.meta.env.VITE_SSE_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/db'
    
    // Remove /api/db suffix if present, we'll add /api/realtime/events instead
    let baseURL: string
    if (sseEnvURL.endsWith('/api/db')) {
      baseURL = sseEnvURL.replace(/\/api\/db$/, '')
    } else if (sseEnvURL.includes('/api/db')) {
      // Handle case where /api/db appears but not at the end
      baseURL = sseEnvURL.replace(/\/api\/db/, '')
    } else {
      baseURL = sseEnvURL
    }
    
    this.baseURL = baseURL
    const source = import.meta.env.VITE_SSE_BASE_URL ? 'VITE_SSE_BASE_URL' : (import.meta.env.VITE_API_BASE_URL ? 'VITE_API_BASE_URL' : 'default')
    console.log('[RealtimeService] SSE Base URL set to:', this.baseURL, `(from ${source}: ${sseEnvURL})`)
  }

  connect(callbacks: RealtimeServiceCallbacks): void {
    // Disconnect existing connection if any
    if (this.eventSource) {
      if (this.eventSource.readyState === EventSource.OPEN || this.eventSource.readyState === EventSource.CONNECTING) {
        this.disconnect()
      }
    }

    if (this.isConnecting) {
      console.warn('[RealtimeService] Connection already in progress')
      return
    }

    this.callbacks = callbacks
    this.isConnecting = true

    try {
      // Construct URL - baseURL should already be cleaned (e.g., "http://dds.pm99.site:3001")
      // Just append /api/realtime/events
      const url = `${this.baseURL}/api/realtime/events`
      console.log('[RealtimeService] 🔌 Attempting SSE connection to:', url)
      console.log('[RealtimeService] This should connect within 1-2 seconds if the server is running...')
      
      this.eventSource = new EventSource(url)
      const eventSourceUrl = url // Store for error handler

      this.eventSource.onopen = () => {
        console.log('[RealtimeService] ✅ SSE CONNECTED - Real-time updates are now active!')
        console.log('[RealtimeService] Listening for: rf_detection, drone_position, gps_unit_position, drone, operator_position')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
        this.callbacks.onReconnect?.()
      }

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Handle initial connection message
          if (data.type === 'connected') {
            console.log('[RealtimeService] ✅ SSE connection confirmed by server:', data.message)
            return
          }
          // Handle error messages from server
          if (data.type === 'error') {
            console.error('[RealtimeService] Server error:', data.message)
            this.callbacks.onError?.(new Error(data.message))
            return
          }
          // Handle regular updates
          const update: RealtimeUpdate = data
          this.handleUpdate(update)
        } catch (error) {
          console.error('[RealtimeService] Failed to parse message:', error, 'Raw data:', event.data)
          this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to parse message'))
        }
      }

      this.eventSource.onerror = (error) => {
        // Log all errors prominently - this is critical for debugging
        const readyState = this.eventSource?.readyState
        console.error('[RealtimeService] ❌ SSE ERROR:', {
          readyState: readyState === EventSource.CONNECTING ? 'CONNECTING' : 
                      readyState === EventSource.OPEN ? 'OPEN' : 
                      readyState === EventSource.CLOSED ? 'CLOSED' : 'UNKNOWN',
          url: eventSourceUrl,
          error: error
        })
        
        // Only log error if we're actually trying to connect
        // 404 errors are expected if the endpoint isn't available yet
        if (readyState === EventSource.CLOSED) {
          // Connection failed - this is normal if endpoint doesn't exist
          // Only log on first attempt to avoid spam
          if (this.reconnectAttempts === 0) {
            console.error(`[RealtimeService] ❌ Connection failed (404). Is the server running?`)
            console.error(`[RealtimeService] ❌ Endpoint: ${eventSourceUrl}`)
            console.error('[RealtimeService] ❌ Real-time updates will be disabled. The app will continue to work with periodic polling.')
            console.error('[RealtimeService] ❌ TO FIX: Make sure your backend server is running (`npm run server`)')
          }
          this.isConnecting = false
          this.scheduleReconnect()
        } else {
          // Other errors
          console.error('[RealtimeService] ❌ EventSource error (will retry):', error)
          this.isConnecting = false
        }
      }

      // Listen for specific event types
      this.eventSource.addEventListener('rf_detection', (event: MessageEvent) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data)
          this.handleUpdate(update)
        } catch (error) {
          console.error('[RealtimeService] Failed to parse rf_detection event:', error)
        }
      })

      this.eventSource.addEventListener('drone_position', (event: MessageEvent) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data)
          console.log('[RealtimeService] 📡 Received drone_position SSE event:', {
            action: update.action,
            positionId: update.data?.id,
            droneId: (update.data as any)?.drone_id,
            lat: (update.data as any)?.latitude,
            lng: (update.data as any)?.longitude
          })
          this.handleUpdate(update)
        } catch (error) {
          console.error('[RealtimeService] Failed to parse drone_position event:', error)
        }
      })

      this.eventSource.addEventListener('gps_unit_position', (event: MessageEvent) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data)
          this.handleUpdate(update)
        } catch (error) {
          console.error('[RealtimeService] Failed to parse gps_unit_position event:', error)
        }
      })

      this.eventSource.addEventListener('drone', (event: MessageEvent) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data)
          this.handleUpdate(update)
        } catch (error) {
          console.error('[RealtimeService] Failed to parse drone event:', error)
        }
      })

      this.eventSource.addEventListener('operator_position', (event: MessageEvent) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data)
          this.handleUpdate(update)
        } catch (error) {
          console.error('[RealtimeService] Failed to parse operator_position event:', error)
        }
      })
    } catch (error) {
      console.error('[RealtimeService] Failed to create EventSource:', error)
      this.isConnecting = false
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to create EventSource'))
      this.scheduleReconnect()
    }
  }

  private handleUpdate(update: RealtimeUpdate): void {
    // Log all updates in development to help debug
    if (import.meta.env.DEV) {
      console.log(`[RealtimeService] Received ${update.type} ${update.action}:`, {
        type: update.type,
        action: update.action,
        dataId: update.data?.id,
        droneId: (update.data as any)?.drone_id,
        timestamp: update.timestamp
      })
    }
    
    switch (update.type) {
      case 'rf_detection':
        this.callbacks.onRFDetection?.(update.data as RFDetection, update.action)
        break
      case 'drone_position':
        this.callbacks.onDronePosition?.(update.data as DronePosition, update.action)
        break
      case 'gps_unit_position':
        this.callbacks.onGpsUnitPosition?.(update.data as GpsUnitPosition, update.action)
        break
      case 'drone':
        this.callbacks.onDrone?.(update.data, update.action)
        break
      case 'operator_position':
        this.callbacks.onOperatorPosition?.(update.data, update.action)
        break
      default:
        console.warn('[RealtimeService] Unknown update type:', update.type)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Don't log error - endpoint might not be available, that's okay
      // Only log if it's a critical error
      if (this.reconnectAttempts === this.maxReconnectAttempts) {
        console.warn('[RealtimeService] Real-time updates unavailable (endpoint not found). The app will continue to work with polling.')
      }
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000) // Exponential backoff, max 30s
    
    // Only log first few attempts to avoid spam
    if (this.reconnectAttempts <= 3) {
      console.log(`[RealtimeService] Real-time endpoint not available, retrying in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    }
    
    this.reconnectTimer = setTimeout(() => {
      // Don't call disconnect() here - it will log unnecessarily
      // Just close the existing connection silently if it exists
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
      this.connect(this.callbacks)
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      const wasOpen = this.eventSource.readyState === EventSource.OPEN
      this.eventSource.close()
      this.eventSource = null
      // Only log if we were actually connected (not just failed connection attempts)
      if (wasOpen) {
        console.log('[RealtimeService] Disconnected')
      }
    }

    this.isConnecting = false
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }
}

// Singleton instance
export const realtimeService = new RealtimeService()

// Vue composable for using realtime service
export function useRealtime(callbacks: RealtimeServiceCallbacks) {
  // Only register lifecycle hook if we're in a component context
  // Check if we're in setup context by trying to get current instance
  try {
    onUnmounted(() => {
      realtimeService.disconnect()
    })
  } catch (error) {
    // Not in component context - that's okay, caller will handle cleanup
    console.warn('[RealtimeService] useRealtime called outside component context, manual cleanup required')
  }

  realtimeService.connect(callbacks)

  return {
    isConnected: () => realtimeService.isConnected(),
    disconnect: () => realtimeService.disconnect()
  }
}

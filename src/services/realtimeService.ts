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
    // Get base URL - VITE_API_BASE_URL typically includes /api/db
    // Example: "http://dds.pm99.site:3001/api/db"
    const envURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/db'
    // Remove /api/db suffix if present, we'll add /api/realtime/events instead
    // Result: "http://dds.pm99.site:3001"
    if (envURL.endsWith('/api/db')) {
      this.baseURL = envURL.replace(/\/api\/db$/, '')
    } else if (envURL.includes('/api/db')) {
      // Handle case where /api/db appears but not at the end
      this.baseURL = envURL.replace(/\/api\/db/, '')
    } else {
      this.baseURL = envURL
    }
    console.log('[RealtimeService] Base URL set to:', this.baseURL, '(from env:', envURL + ')')
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
      console.log('[RealtimeService] Connecting to:', url)
      
      this.eventSource = new EventSource(url)

      this.eventSource.onopen = () => {
        console.log('[RealtimeService] Connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
        this.callbacks.onReconnect?.()
      }

      this.eventSource.onmessage = (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data)
          this.handleUpdate(update)
        } catch (error) {
          console.error('[RealtimeService] Failed to parse message:', error)
          this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to parse message'))
        }
      }

      this.eventSource.onerror = (error) => {
        // Only log error if we're actually trying to connect
        // 404 errors are expected if the endpoint isn't available yet
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          // Connection failed - this is normal if endpoint doesn't exist
          // Don't spam console with errors, just schedule reconnect
          this.isConnecting = false
          this.scheduleReconnect()
        } else {
          // Other errors
          console.warn('[RealtimeService] EventSource error (will retry):', error)
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
      this.disconnect()
      this.connect(this.callbacks)
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.isConnecting = false
    console.log('[RealtimeService] Disconnected')
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

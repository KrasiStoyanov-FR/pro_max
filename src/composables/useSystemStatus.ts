import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { databaseApi } from '@/services/api'
import type { SystemStatus, SystemStatusResponse, SystemStatusDelta, DatabaseStatus } from '@/types/system'

const POLL_INTERVAL = 5000 // 5 seconds
const STATUS_TOLERANCE_MS = 1000 // ±1s tolerance

/**
 * Custom hook for system status polling and WebSocket integration
 * 
 * Features:
 * - Polls system status (aggregated from individual endpoints) every 5 seconds
 * - Merges WebSocket deltas when available
 * - Non-blocking updates
 * - Graceful degradation
 */
export function useSystemStatus() {
  const status = ref<SystemStatus | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchTime = ref<number>(0)
  
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let wsConnection: WebSocket | null = null
  let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null

  // Computed status indicators
  const databaseStatus = computed<DatabaseStatus>(() => {
    return status.value?.database.status || 'down'
  })

  const activeDrones = computed(() => {
    return status.value?.metrics.activeDrones ?? 0
  })

  const rfDetections = computed(() => {
    return status.value?.metrics.rfDetections ?? 0
  })

  const operatorsOnline = computed(() => {
    return status.value?.metrics.operatorsOnline ?? 0
  })

  const isStale = computed(() => {
    if (!lastFetchTime.value) return true
    const now = Date.now()
    return (now - lastFetchTime.value) > (POLL_INTERVAL + STATUS_TOLERANCE_MS)
  })

  /**
   * Fetch system status (aggregated from individual endpoints)
   */
  const fetchStatus = async (): Promise<void> => {
    // Prevent concurrent requests
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      // Force refresh to bypass cache (we want fresh data every poll)
      const response = await databaseApi.getSystemStatus(true)
      
      if (response.success && response.data) {
        // Merge with existing status to preserve WebSocket updates
        status.value = {
          ...response.data,
          // Preserve WebSocket updates if they're more recent
          metrics: status.value && 
            new Date(status.value.metrics.lastUpdated) > new Date(response.data.metrics.lastUpdated)
            ? status.value.metrics
            : response.data.metrics
        }
        lastFetchTime.value = Date.now()
      } else {
        throw new Error(response.error || 'Failed to fetch system status')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      
      // Set degraded status on error
      if (status.value) {
        status.value.database = {
          ...status.value.database,
          status: 'degraded',
          message: `Status check failed: ${message}`
        }
      } else {
        // First fetch failed - set to down
        status.value = {
          database: {
            status: 'down',
            message: `Unable to connect: ${message}`,
            lastCheck: new Date().toISOString()
          },
          metrics: {
            activeDrones: 0,
            rfDetections: 0,
            operatorsOnline: 0,
            lastUpdated: new Date().toISOString()
          }
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Apply WebSocket delta update
   */
  const applyDelta = (delta: SystemStatusDelta): void => {
    if (!status.value) {
      // If no status yet, wait for initial fetch
      return
    }

    const deltaTime = new Date(delta.timestamp).getTime()
    const currentTime = new Date(status.value.metrics.lastUpdated).getTime()

    // Only apply if delta is newer or within tolerance
    if (deltaTime >= currentTime - STATUS_TOLERANCE_MS) {
      if (delta.type === 'metric' && delta.metric) {
        status.value = {
          ...status.value,
          metrics: {
            ...status.value.metrics,
            ...delta.metric,
            lastUpdated: delta.timestamp
          }
        }
      } else if (delta.type === 'database' && delta.database) {
        status.value = {
          ...status.value,
          database: {
            ...status.value.database,
            ...delta.database,
            lastCheck: delta.timestamp
          }
        }
      }
    }
  }

  /**
   * Initialize WebSocket connection
   */
  const initWebSocket = (): void => {
    // Only connect if WebSocket is available
    if (typeof WebSocket === 'undefined') {
      console.warn('[SystemStatus] WebSocket not available, using polling only')
      return
    }

    try {
      // Determine WebSocket URL (adjust based on your backend)
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = window.location.hostname
      const wsPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '3001')
      const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/status`

      wsConnection = new WebSocket(wsUrl)

      wsConnection.onopen = () => {
        console.log('[SystemStatus] WebSocket connected')
        error.value = null
      }

      wsConnection.onmessage = (event) => {
        try {
          const delta: SystemStatusDelta = JSON.parse(event.data)
          applyDelta(delta)
        } catch (err) {
          console.error('[SystemStatus] Failed to parse WebSocket message:', err)
        }
      }

      wsConnection.onerror = (err) => {
        console.error('[SystemStatus] WebSocket error:', err)
        // Don't set error state - gracefully degrade to polling only
      }

      wsConnection.onclose = () => {
        console.log('[SystemStatus] WebSocket closed, will reconnect...')
        wsConnection = null
        
        // Reconnect after 5 seconds
        wsReconnectTimeout = setTimeout(() => {
          initWebSocket()
        }, 5000)
      }
    } catch (err) {
      console.error('[SystemStatus] Failed to initialize WebSocket:', err)
      // Gracefully degrade to polling only
    }
  }

  /**
   * Start polling
   */
  const startPolling = (): void => {
    // Initial fetch
    fetchStatus()

    // Set up polling interval
    pollInterval = setInterval(() => {
      fetchStatus()
    }, POLL_INTERVAL)
  }

  /**
   * Stop polling and close WebSocket
   */
  const stopPolling = (): void => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }

    if (wsConnection) {
      wsConnection.close()
      wsConnection = null
    }

    if (wsReconnectTimeout) {
      clearTimeout(wsReconnectTimeout)
      wsReconnectTimeout = null
    }
  }

  /**
   * Manual refresh
   */
  const refresh = async (): Promise<void> => {
    await fetchStatus()
  }

  // Lifecycle
  onMounted(() => {
    startPolling()
    initWebSocket()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    // State
    status: computed(() => status.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    isStale,

    // Computed metrics
    databaseStatus,
    activeDrones,
    rfDetections,
    operatorsOnline,

    // Methods
    refresh,
    startPolling,
    stopPolling
  }
}


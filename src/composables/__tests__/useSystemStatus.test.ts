import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useSystemStatus } from '../useSystemStatus'
import { databaseApi } from '@/services/api'

// Mock the API
vi.mock('@/services/api', () => ({
  databaseApi: {
    getSystemStatus: vi.fn()
  }
}))

describe('useSystemStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with null status', () => {
    const { status, isLoading } = useSystemStatus()
    expect(status.value).toBeNull()
    expect(isLoading.value).toBe(false)
  })

  it('should fetch status on mount', async () => {
    const mockStatus = {
      success: true,
      data: {
        database: {
          status: 'ok' as const,
          message: 'Database connected',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          activeDrones: 5,
          rfDetections: 10,
          operatorsOnline: 3,
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    }

    vi.mocked(databaseApi.getSystemStatus).mockResolvedValue(mockStatus)

    const { status, activeDrones, rfDetections, operatorsOnline, databaseStatus } = useSystemStatus()

    // Wait for initial fetch
    await vi.advanceTimersByTimeAsync(100)

    expect(databaseApi.getSystemStatus).toHaveBeenCalled()
    expect(status.value).toBeTruthy()
    expect(databaseStatus.value).toBe('ok')
    expect(activeDrones.value).toBe(5)
    expect(rfDetections.value).toBe(10)
    expect(operatorsOnline.value).toBe(3)
  })

  it('should poll every 5 seconds', async () => {
    const mockStatus = {
      success: true,
      data: {
        database: {
          status: 'ok' as const,
          message: 'Database connected',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          activeDrones: 5,
          rfDetections: 10,
          operatorsOnline: 3,
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    }

    vi.mocked(databaseApi.getSystemStatus).mockResolvedValue(mockStatus)

    useSystemStatus()

    // Initial fetch
    await vi.advanceTimersByTimeAsync(100)
    expect(databaseApi.getSystemStatus).toHaveBeenCalledTimes(1)

    // Advance 5 seconds
    await vi.advanceTimersByTimeAsync(5000)
    expect(databaseApi.getSystemStatus).toHaveBeenCalledTimes(2)

    // Advance another 5 seconds
    await vi.advanceTimersByTimeAsync(5000)
    expect(databaseApi.getSystemStatus).toHaveBeenCalledTimes(3)
  })

  it('should handle degraded database status', async () => {
    const mockStatus = {
      success: true,
      data: {
        database: {
          status: 'degraded' as const,
          message: 'Database performance degraded',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          activeDrones: 0,
          rfDetections: 0,
          operatorsOnline: 0,
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    }

    vi.mocked(databaseApi.getSystemStatus).mockResolvedValue(mockStatus)

    const { databaseStatus } = useSystemStatus()

    await vi.advanceTimersByTimeAsync(100)

    expect(databaseStatus.value).toBe('degraded')
  })

  it('should handle down database status', async () => {
    const mockStatus = {
      success: true,
      data: {
        database: {
          status: 'down' as const,
          message: 'Database connection failed',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          activeDrones: 0,
          rfDetections: 0,
          operatorsOnline: 0,
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    }

    vi.mocked(databaseApi.getSystemStatus).mockResolvedValue(mockStatus)

    const { databaseStatus } = useSystemStatus()

    await vi.advanceTimersByTimeAsync(100)

    expect(databaseStatus.value).toBe('down')
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(databaseApi.getSystemStatus).mockRejectedValue(new Error('Network error'))

    const { status, error, databaseStatus } = useSystemStatus()

    await vi.advanceTimersByTimeAsync(100)

    expect(error.value).toBeTruthy()
    expect(databaseStatus.value).toBe('down')
    expect(status.value).toBeTruthy() // Should still have a status object
  })

  it('should detect stale data', async () => {
    const mockStatus = {
      success: true,
      data: {
        database: {
          status: 'ok' as const,
          message: 'Database connected',
          lastCheck: new Date().toISOString()
        },
        metrics: {
          activeDrones: 5,
          rfDetections: 10,
          operatorsOnline: 3,
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    }

    vi.mocked(databaseApi.getSystemStatus).mockResolvedValue(mockStatus)

    const { isStale } = useSystemStatus()

    await vi.advanceTimersByTimeAsync(100)
    expect(isStale.value).toBe(false)

    // Advance beyond tolerance (6 seconds = 5000ms + 1000ms tolerance)
    await vi.advanceTimersByTimeAsync(6000)
    expect(isStale.value).toBe(true)
  })
})


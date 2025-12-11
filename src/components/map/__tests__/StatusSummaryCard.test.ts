import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusSummaryCard from '../StatusSummaryCard.vue'
import { useSystemStatus } from '@/composables/useSystemStatus'

// Mock the composable
vi.mock('@/composables/useSystemStatus', () => ({
  useSystemStatus: vi.fn()
}))

describe('StatusSummaryCard', () => {
  const mockUseSystemStatus = vi.mocked(useSystemStatus)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all metrics', () => {
    mockUseSystemStatus.mockReturnValue({
      status: { value: {
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
      }},
      isLoading: { value: false },
      error: { value: null },
      isStale: { value: false },
      databaseStatus: { value: 'ok' as const },
      activeDrones: { value: 5 },
      rfDetections: { value: 10 },
      operatorsOnline: { value: 3 },
      refresh: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn()
    })

    const wrapper = mount(StatusSummaryCard, {
      props: {
        isFullscreenMode: false
      }
    })

    expect(wrapper.text()).toContain('Database Connected')
    expect(wrapper.text()).toContain('5 Active Drones')
    expect(wrapper.text()).toContain('10 RF Detections')
    expect(wrapper.text()).toContain('3 Operators Online')
  })

  it('should hide in fullscreen mode', () => {
    mockUseSystemStatus.mockReturnValue({
      status: { value: null },
      isLoading: { value: false },
      error: { value: null },
      isStale: { value: false },
      databaseStatus: { value: 'ok' as const },
      activeDrones: { value: 0 },
      rfDetections: { value: 0 },
      operatorsOnline: { value: 0 },
      refresh: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn()
    })

    const wrapper = mount(StatusSummaryCard, {
      props: {
        isFullscreenMode: true
      }
    })

    expect(wrapper.find('[role="region"]').exists()).toBe(false)
  })

  it('should show degraded status', () => {
    mockUseSystemStatus.mockReturnValue({
      status: { value: {
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
      }},
      isLoading: { value: false },
      error: { value: null },
      isStale: { value: false },
      databaseStatus: { value: 'degraded' as const },
      activeDrones: { value: 0 },
      rfDetections: { value: 0 },
      operatorsOnline: { value: 0 },
      refresh: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn()
    })

    const wrapper = mount(StatusSummaryCard, {
      props: {
        isFullscreenMode: false
      }
    })

    expect(wrapper.text()).toContain('Database Degraded')
  })

  it('should show down status', () => {
    mockUseSystemStatus.mockReturnValue({
      status: { value: {
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
      }},
      isLoading: { value: false },
      error: { value: null },
      isStale: { value: false },
      databaseStatus: { value: 'down' as const },
      activeDrones: { value: 0 },
      rfDetections: { value: 0 },
      operatorsOnline: { value: 0 },
      refresh: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn()
    })

    const wrapper = mount(StatusSummaryCard, {
      props: {
        isFullscreenMode: false
      }
    })

    expect(wrapper.text()).toContain('Database Disconnected')
  })

  it('should emit events on click', async () => {
    mockUseSystemStatus.mockReturnValue({
      status: { value: {
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
      }},
      isLoading: { value: false },
      error: { value: null },
      isStale: { value: false },
      databaseStatus: { value: 'ok' as const },
      activeDrones: { value: 5 },
      rfDetections: { value: 10 },
      operatorsOnline: { value: 3 },
      refresh: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn()
    })

    const wrapper = mount(StatusSummaryCard, {
      props: {
        isFullscreenMode: false
      }
    })

    // Click on drones metric
    await wrapper.find('button[aria-label*="drones"]').trigger('click')
    expect(wrapper.emitted('openDronesPanel')).toBeTruthy()

    // Click on detections metric
    await wrapper.find('button[aria-label*="detections"]').trigger('click')
    expect(wrapper.emitted('openDetectionsPanel')).toBeTruthy()

    // Click on operators metric
    await wrapper.find('button[aria-label*="operators"]').trigger('click')
    expect(wrapper.emitted('openOperatorsPanel')).toBeTruthy()
  })

  it('should be keyboard accessible', () => {
    mockUseSystemStatus.mockReturnValue({
      status: { value: null },
      isLoading: { value: false },
      error: { value: null },
      isStale: { value: false },
      databaseStatus: { value: 'ok' as const },
      activeDrones: { value: 0 },
      rfDetections: { value: 0 },
      operatorsOnline: { value: 0 },
      refresh: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn()
    })

    const wrapper = mount(StatusSummaryCard, {
      props: {
        isFullscreenMode: false
      }
    })

    const widget = wrapper.find('[role="region"]')
    expect(widget.attributes('tabindex')).toBe('0')
    expect(widget.attributes('aria-label')).toBe('System Status')
  })
})


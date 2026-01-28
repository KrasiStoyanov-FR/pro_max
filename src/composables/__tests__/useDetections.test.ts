import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useDetections } from '../useDetections'
import type { DronePosition, RFDetection } from '@/types/database'

const rfDetectionsList = ref<RFDetection[]>([])
const dronePositionsList = ref<DronePosition[]>([])
const fetchRFDetectionsMock = vi.fn<[], Promise<void>>(() => Promise.resolve())
const fetchDronePositionsMock = vi.fn<[], Promise<void>>(() => Promise.resolve())
const loadingState = { rfDetections: false, dronePositions: false }
const errorState = { rfDetections: null as string | null }

vi.mock('@/store/data', () => {
  return {
    useDataStore: () => ({
      rfDetectionsList,
      dronePositionsList,
      loading: loadingState,
      errors: errorState,
      fetchRFDetections: fetchRFDetectionsMock,
      fetchDronePositions: fetchDronePositionsMock
    })
  }
})

describe('useDetections', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchRFDetectionsMock.mockClear()
    fetchDronePositionsMock.mockClear()
    rfDetectionsList.value = [
      {
        id: 1,
        type: 'uav',
        status: 'alarm',
        distance: 1200,
        altitude: 150,
        bearing: 45,
        time: new Date().toISOString(),
        unit_name: 'Sensor Alpha',
        drone_id: 9,
        system_id: 'SYS-9',
        risk_level: 'high'
      },
      {
        id: 2,
        type: 'rc plane',
        status: 'track',
        distance: null,
        altitude: null,
        bearing: null,
        time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        unit_name: 'Sensor Beta',
        drone_id: 9999,
        system_id: 'SYS-TRACK',
        risk_level: 'medium',
        zone: 'North'
      },
      {
        id: 3,
        type: null as any,
        status: 'track',
        distance: null,
        altitude: null,
        bearing: null,
        time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        unit_name: 'Sensor Beta Duplicate',
        drone_id: 9999,
        system_id: 'SYS-TRACK',
        risk_level: 'medium',
        zone: 'North'
      }
    ] as RFDetection[]

    dronePositionsList.value = [
      {
        id: 101,
        drone_id: 9,
        time: new Date().toISOString(),
        latitude: 0,
        longitude: 0,
        altitude: 220,
        speed: 0,
        receiver_type: 'RX',
        system_id: 'SYS-9',
        distance: 950,
        bearing: 92
      },
      {
        id: 102,
        drone_id: 15,
        time: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        latitude: 0,
        longitude: 0,
        altitude: 60,
        speed: 0,
        receiver_type: 'RX',
        system_id: 'SYS-OTHER',
        distance: 320,
        bearing: 75
      },
      {
        id: 103,
        drone_id: 123,
        time: new Date(Date.now() - 60 * 1000).toISOString(),
        latitude: 0,
        longitude: 0,
        altitude: 70,
        speed: 0,
        receiver_type: 'RX',
        system_id: 'SYS-TRACK',
        distance: 700,
        bearing: 110
      }
    ] as DronePosition[]
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  const mountHook = () => {
    let hookResult: ReturnType<typeof useDetections> | null = null
    const wrapper = mount({
      setup() {
        hookResult = useDetections({ refreshInterval: 5000 })
        return () => null
      }
    })
    return { result: hookResult!, wrapper }
  }

  it('maps detections and exposes filtering helpers', async () => {
    const { result, wrapper } = mountHook()
    await nextTick()

    expect(result.detections.value).toHaveLength(3)
    expect(result.filteredDetections.value).toHaveLength(3)

    result.filters.search.value = 'beta'
    await nextTick()
    expect(result.filteredDetections.value).toHaveLength(2)
    expect(result.filteredDetections.value[0].sensorName.toLowerCase()).toContain('sensor beta')

    result.filters.type.value = 'UAV'
    await nextTick()
    expect(result.filteredDetections.value).toHaveLength(0)

    // Ensure fallback to drone positions fills empty metrics
    const fallbackDetection = result.detections.value.find(d => d.id === 3)
    expect(fallbackDetection?.distanceMeters).toBe(700)
    expect(fallbackDetection?.altitudeMeters).toBe(70)
    expect(fallbackDetection?.bearingDegrees).toBe(110)

    wrapper.unmount()
  })

  it('filters by time window and zone', async () => {
    const { result, wrapper } = mountHook()
    await nextTick()

    result.filters.timeWindow.value = 5
    await nextTick()
    expect(result.filteredDetections.value).toHaveLength(1)

    result.filters.zone.value = 'North'
    await nextTick()
    expect(result.filteredDetections.value).toHaveLength(0)

    wrapper.unmount()
  })

  it('filters by detection type and resets back to all', async () => {
    const { result, wrapper } = mountHook()
    await nextTick()

    // All detections initially
    expect(result.filteredDetections.value).toHaveLength(3)

    result.filters.type.value = 'UAV'
    await nextTick()
    expect(result.filteredDetections.value).toHaveLength(1)
    expect(result.filteredDetections.value[0].type).toBe('UAV')

    result.filters.type.value = 'Unknown'
    await nextTick()
    expect(result.filteredDetections.value).toHaveLength(1)
    expect(result.filteredDetections.value[0].type).toBe('Unknown')

    result.filters.type.value = 'all'
    await nextTick()
    expect(result.filteredDetections.value).toHaveLength(3)

    wrapper.unmount()
  })

  it('toggles sorting and auto-refreshes on interval', async () => {
    const { result, wrapper } = mountHook()
    await nextTick()

    expect(result.sort.field.value).toBe('lastSeen')
    result.sort.setSort('distance')
    expect(result.sort.field.value).toBe('distance')
    expect(result.sort.direction.value).toBe('asc')

    result.sort.setSort('distance')
    expect(result.sort.direction.value).toBe('desc')

    const detectionCallsBefore = fetchRFDetectionsMock.mock.calls.length
    const positionCallsBefore = fetchDronePositionsMock.mock.calls.length
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()
    expect(fetchRFDetectionsMock.mock.calls.length).toBeGreaterThan(detectionCallsBefore)
    expect(fetchDronePositionsMock.mock.calls.length).toBeGreaterThan(positionCallsBefore)

    wrapper.unmount()
  })
})



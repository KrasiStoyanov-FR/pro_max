import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DetectionsTable from '../DetectionsTable.vue'
import type { DetectionItem } from '@/types/detections'

const baseSource = {
  id: 1,
  time: new Date().toISOString(),
  detection_status: true,
  signal_strength: -40,
  frequency: 2450,
  drone_id: 12
}

const sampleDetections: DetectionItem[] = [
  {
    id: 1,
    type: 'UAV',
    status: 'Alarm',
    distanceMeters: 1200,
    altitudeMeters: 150,
    bearingDegrees: 90,
    lastSeen: new Date().toISOString(),
    sensorName: 'Alpha',
    sensorId: 'A-1',
    riskLevel: 'high',
    zone: 'Central',
    signalStrength: -40,
    frequency: 2450,
    latitude: 12.34,
    longitude: 56.78,
    sensors: [{ name: 'Alpha Sensor' }],
    source: baseSource as any
  },
  {
    id: 2,
    type: 'RC',
    status: 'Track',
    distanceMeters: 400,
    altitudeMeters: 80,
    bearingDegrees: 120,
    lastSeen: new Date().toISOString(),
    sensorName: 'Beta',
    sensorId: 'B-2',
    riskLevel: 'medium',
    zone: 'East',
    signalStrength: -55,
    frequency: 2440,
    latitude: 22.11,
    longitude: 44.55,
    sensors: [{ name: 'Beta Sensor' }],
    source: { ...baseSource, id: 2 } as any
  }
]

describe('DetectionsTable', () => {
  it('renders detection rows and placeholders', () => {
    const wrapper = mount(DetectionsTable, {
      props: {
        detections: sampleDetections,
        isLoading: false,
        sortField: 'distance',
        sortDirection: 'asc'
      }
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('RC')

    const actionButtons = wrapper.findAll('tbody tr:first-child button')
    expect(actionButtons).toHaveLength(2)
    expect(actionButtons[0].text()).toContain('Details')
    expect(actionButtons[1].text()).toContain('Show on map')
  })

  it('emits sort change when header clicked', async () => {
    const wrapper = mount(DetectionsTable, {
      props: {
        detections: sampleDetections,
        isLoading: false,
        sortField: 'lastSeen',
        sortDirection: 'desc'
      }
    })

    const statusHeaderButton = wrapper.get('thead th:nth-child(2) button')
    await statusHeaderButton.trigger('click')

    expect(wrapper.emitted('change-sort')).toBeTruthy()
    expect(wrapper.emitted('change-sort')?.[0]).toEqual(['status'])
  })

  it('emits show-details when button clicked', async () => {
    const wrapper = mount(DetectionsTable, {
      props: {
        detections: sampleDetections,
        isLoading: false,
        sortField: 'lastSeen',
        sortDirection: 'desc'
      }
    })

    const detailsButton = wrapper.get('tbody tr:first-child button')
    await detailsButton.trigger('click')

    expect(wrapper.emitted('show-details')).toBeTruthy()
    expect(wrapper.emitted('show-details')?.[0]?.[0]).toEqual(sampleDetections[0])
  })
})



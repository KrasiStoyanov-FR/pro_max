import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DetectionsTable from '../DetectionsTable.vue'
import type { DetectionItem } from '@/types/detections'

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
    zone: 'Central'
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
    zone: 'East'
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

    const actionButton = wrapper.get('tbody tr:first-child button')
    expect(actionButton.attributes('disabled')).toBeDefined()
    expect(actionButton.text()).toContain('Show on map')
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
})



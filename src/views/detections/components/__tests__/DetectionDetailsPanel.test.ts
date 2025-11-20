import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DetectionDetailsPanel from '../DetectionDetailsPanel.vue'
import type { DetectionItem } from '@/types/detections'

const baseDetection: DetectionItem = {
  id: 1,
  type: 'UAV',
  status: 'Detect',
  distanceMeters: 1000,
  altitudeMeters: 120,
  bearingDegrees: 45,
  lastSeen: new Date().toISOString(),
  sensorName: 'Alpha Sensor',
  sensorId: 'ALPHA',
  riskLevel: 'high',
  signalStrength: -42,
  frequency: 2450,
  latitude: 10.12345,
  longitude: -70.98765,
  sensors: [{ name: 'Alpha Sensor', id: 'ALPHA' }],
  source: {
    id: 1,
    time: new Date().toISOString(),
    detection_status: true,
    signal_strength: -42,
    frequency: 2450,
    drone_id: 1
  } as any
}

describe('DetectionDetailsPanel', () => {
  it('renders detection details', () => {
    const wrapper = mount(DetectionDetailsPanel, {
      props: {
        detection: baseDetection,
        visible: true
      },
      global: {
        stubs: {
          MapPreview: {
            template: '<div class="map-stub" />'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('Alpha Sensor')
    expect(wrapper.text()).toContain('UAV')
    expect(wrapper.text()).toContain('Risk')
  })

  it('emits close event when button clicked', async () => {
    const wrapper = mount(DetectionDetailsPanel, {
      props: {
        detection: baseDetection,
        visible: true
      },
      global: {
        stubs: {
          MapPreview: {
            template: '<div class="map-stub" />'
          }
        }
      }
    })

    await wrapper.get('button[aria-label="Close details panel"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})



import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SensorDetailsPanel from '../SensorDetailsPanel.vue'
import type { SensorItem } from '@/types/sensors'

const sensor: SensorItem = {
  id: 'A-1',
  name: 'Alpha Sensor',
  type: 'RF',
  status: 'online',
  lastCommunication: new Date().toISOString(),
  firmwareVersion: '1.0.0',
  softwareVersion: '2.0.0',
  locationLabel: 'Tower 1',
  latitude: 10,
  longitude: 20,
  network: {
    connectionType: 'LTE',
    ipAddress: '10.0.0.1',
    signalStrength: -55,
    carrier: 'Telco'
  },
  hardware: {
    cpuLoad: 35,
    memoryUsage: 60,
    temperatureCelsius: 42,
    storageUsage: 70,
    uptimeSeconds: 7200
  },
  source: {}
}

describe('SensorDetailsPanel', () => {
  it('renders sensor details', () => {
    const wrapper = mount(SensorDetailsPanel, {
      props: {
        sensor,
        visible: true,
        logs: [
          {
            id: 1,
            system_id: 'SYS-1',
            receiver_type: 'rf',
            status: 'online',
            time: new Date().toISOString(),
            message: 'All good'
          }
        ]
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
    expect(wrapper.text()).toContain('Sensor ID')
    expect(wrapper.text()).toContain('LTE')
  })

  it('emits close event', async () => {
    const wrapper = mount(SensorDetailsPanel, {
      props: {
        sensor,
        visible: true,
        logs: [],
        logsLoading: false
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



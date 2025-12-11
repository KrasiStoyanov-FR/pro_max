import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SensorsTable from '../SensorsTable.vue'
import type { SensorItem } from '@/types/sensors'

const sensors: SensorItem[] = [
  {
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
  },
  {
    id: 'B-2',
    name: 'Beta Sensor',
    type: 'Radar',
    status: 'offline',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: '1.2.0',
    softwareVersion: '2.4.1',
    locationLabel: 'Tower 2',
    latitude: 30,
    longitude: 40,
    network: {
      connectionType: 'Ethernet',
      ipAddress: '10.0.0.2',
      signalStrength: -70,
      carrier: null
    },
    hardware: {
      cpuLoad: 50,
      memoryUsage: 55,
      temperatureCelsius: 38,
      storageUsage: 50,
      uptimeSeconds: 5400
    },
    source: {}
  }
]

describe('SensorsTable', () => {
  it('renders sensors and highlights selection', () => {
    const wrapper = mount(SensorsTable, {
      props: {
        sensors,
        isLoading: false,
        selectedId: 'A-1'
      }
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].classes()).toContain('bg-white/10')
    expect(wrapper.text()).toContain('Alpha Sensor')
    expect(wrapper.text()).toContain('Beta Sensor')
  })

  it('emits show-details when button clicked', async () => {
    const wrapper = mount(SensorsTable, {
      props: {
        sensors,
        isLoading: false,
        selectedId: null
      }
    })

    const button = wrapper.get('tbody tr:first-child button')
    await button.trigger('click')

    expect(wrapper.emitted('show-details')).toBeTruthy()
    expect(wrapper.emitted('show-details')?.[0]?.[0]).toEqual(sensors[0])
  })
})



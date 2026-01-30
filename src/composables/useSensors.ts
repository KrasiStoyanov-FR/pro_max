import { ref, computed, onBeforeUnmount, watch, type Ref, isRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/store/data'
import type { GpsUnitPosition } from '@/types/database'
import type { SensorItem, SensorStatus, SensorType, SensorSortField, SensorGroupByField } from '@/types/sensors'

export interface UseSensorsOptions {
  refreshInterval?: number
  enabled?: Ref<boolean> | boolean
}

export interface UseSensorsResult {
  sensors: Ref<SensorItem[]>
  filteredSensors: Ref<SensorItem[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  filters: {
    search: Ref<string>
    status: Ref<'all' | 'active' | 'inactive'>
  }
  sort: {
    field: Ref<SensorSortField | null>
    direction: Ref<'asc' | 'desc'>
    setSort: (field: SensorSortField) => void
  }
  groupBy: Ref<SensorGroupByField>
  refresh: () => Promise<void>
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const getStatus = (record: GpsUnitPosition): string => {
  // Use the actual "status" field from the database table
  // No transformation - just return what's in the database
  return record.status?.toString() ?? 
         (record as any)?.state?.toString() ?? 
         (record as any)?.health?.toString() ?? 
         '—'
}

const getType = (record: GpsUnitPosition): string => {
  // Use the actual "type" field from the database table
  // No transformation - just return what's in the database
  return record.type?.toString() ?? 
         (record as any)?.sensor_type?.toString() ?? 
         (record as any)?.category?.toString() ?? 
         '—'
}

const resolveName = (record: GpsUnitPosition): string => {
  // Check both 'name' and 'unit_name' columns (database uses unit_name)
  return (
    record.name ||
    (record as any)?.unit_name ||
    (record.system_id ? `System ${record.system_id}` : null) ||
    (record.unit_id ? `Unit ${record.unit_id}` : null) ||
    'Unnamed sensor'
  )
}

const parseCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(numeric as number) ? (numeric as number) : null
}

const mapSensorRecord = (record: GpsUnitPosition): SensorItem => {
  const latitude =
    parseCoordinate(record.latitude) ??
    parseCoordinate((record as any)?.gps_lat) ??
    parseCoordinate((record as any)?.lat) ??
    parseCoordinate((record as any)?.latitude_deg)
  const longitude =
    parseCoordinate(record.longitude) ??
    parseCoordinate((record as any)?.gps_lon) ??
    parseCoordinate((record as any)?.lng) ??
    parseCoordinate((record as any)?.longitude_deg)

  const fallbackId = record.id ?? record.unit_id ?? record.system_id ?? `sensor-${Math.random().toString(36).slice(2)}`

  return {
    id: fallbackId.toString(),
    name: resolveName(record),
    type: getType(record),
    status: getStatus(record),
    unitGroup: (record as any)?.unit_group ?? (record as any)?.group ?? null,
    lastCommunication: record.time ?? record.last_seen ?? null,
    firmwareVersion: (record as any)?.firmware_version ?? (record as any)?.firmware ?? null,
    softwareVersion: (record as any)?.software_version ?? null,
    locationLabel: (record as any)?.location ?? (record as any)?.site ?? null,
    latitude,
    longitude,
    network: {
      connectionType: (record as any)?.connection_type ?? (record as any)?.network_type ?? null,
      ipAddress: (record as any)?.ip_address ?? null,
      signalStrength: toNumber((record as any)?.signal_strength ?? (record as any)?.lte_signal ?? record.signal_strength ?? null),
      carrier: (record as any)?.carrier ?? null
    },
    hardware: {
      cpuLoad: toNumber((record as any)?.cpu_load ?? (record as any)?.cpu_usage),
      memoryUsage: toNumber((record as any)?.memory_usage ?? (record as any)?.ram_usage),
      temperatureCelsius: toNumber((record as any)?.temperature ?? (record as any)?.temp_c),
      storageUsage: toNumber((record as any)?.storage_usage ?? (record as any)?.disk_usage),
      uptimeSeconds: toNumber((record as any)?.uptime)
    },
    source: record
  }
}

export function useSensors(options: UseSensorsOptions = {}): UseSensorsResult {
  // NOTE: Periodic refresh is disabled for static sensors
  // When mobile sensors are added, set refreshInterval > 0 to enable auto-refresh
  // For now, sensors are static (fixed location) so no periodic refresh is needed
  const { refreshInterval = 0, enabled = true } = options

  const dataStore = useDataStore()
  const { gpsUnitPositionsList, loading, errors } = storeToRefs(dataStore)

  const sensors = computed<SensorItem[]>(() => {
    const list = gpsUnitPositionsList.value ?? []
    return list.map(mapSensorRecord)
  })

  const filters = {
    search: ref<string>(''),
    status: ref<'all' | 'active' | 'inactive'>('all')
  }

  const sortField = ref<SensorSortField | null>('lastCommunication')
  const sortDirection = ref<'asc' | 'desc'>('desc')
  const groupBy = ref<SensorGroupByField>('none')

  const isSensorActive = (sensor: SensorItem): boolean => {
    const sourceStatus = (sensor.source as any)?.status
    const status = sourceStatus ? String(sourceStatus).toLowerCase() : sensor.status.toLowerCase()
    return ['online', 'running', 'active', 'healthy'].includes(status)
  }

  const filteredSensors = computed<SensorItem[]>(() => {
    let result = [...sensors.value]

    // Apply search filter
    if (filters.search.value.trim()) {
      const searchLower = filters.search.value.toLowerCase().trim()
      result = result.filter(sensor => {
        const group = sensor.unitGroup ?? ''
        const firmware = sensor.firmwareVersion ?? ''
        return (
          sensor.name.toLowerCase().includes(searchLower) ||
          sensor.id.toLowerCase().includes(searchLower) ||
          sensor.type.toLowerCase().includes(searchLower) ||
          group.toLowerCase().includes(searchLower) ||
          firmware.toLowerCase().includes(searchLower) ||
          sensor.status.toLowerCase().includes(searchLower)
        )
      })
    }

    // Apply status filter
    if (filters.status.value !== 'all') {
      result = result.filter(sensor => {
        const active = isSensorActive(sensor)
        return filters.status.value === 'active' ? active : !active
      })
    }

    // Apply sorting
    if (sortField.value) {
      result.sort((a, b) => {
        let comparison = 0
        switch (sortField.value) {
          case 'id':
            comparison = (a.id || '').localeCompare(b.id || '')
            break
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '')
            break
          case 'unitGroup':
            comparison = (a.unitGroup ?? '').localeCompare(b.unitGroup ?? '')
            break
          case 'type':
            comparison = (a.type || '').localeCompare(b.type || '')
            break
          case 'status':
            comparison = (a.status || '').localeCompare(b.status || '')
            break
          case 'firmwareVersion':
            comparison = (a.firmwareVersion ?? '').localeCompare(b.firmwareVersion ?? '')
            break
          case 'lastCommunication': {
            const timeA = a.lastCommunication ? new Date(a.lastCommunication).getTime() : 0
            const timeB = b.lastCommunication ? new Date(b.lastCommunication).getTime() : 0
            comparison = timeA - timeB
            break
          }
          default:
            return 0
        }
        return sortDirection.value === 'asc' ? comparison : -comparison
      })
    }

    return result
  })

  const setSort = (field: SensorSortField) => {
    if (sortField.value === field) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortDirection.value = field === 'lastCommunication' ? 'desc' : 'asc'
    }
  }

  const isLoading = computed(() => Boolean(loading.value?.gpsUnitPositions))
  const error = computed(() => errors.value?.gpsUnitPositions ?? null)

  const enabledRef: Ref<boolean> = isRef(enabled) ? enabled : ref(enabled)
  
  // TODO: Re-enable when mobile sensors are added
  // let refreshTimer: ReturnType<typeof setInterval> | null = null
  let refreshPromise: Promise<void> | null = null

  const refresh = async (): Promise<void> => {
    if (!enabledRef.value) return
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        await dataStore.fetchGpsUnitPositions(undefined, true)
      } catch (err) {
        console.error('[useSensors] Failed to refresh sensors', err)
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  // TODO: Re-enable when mobile sensors are added
  // const startAutoRefresh = () => {
  //   if (refreshTimer || refreshInterval <= 0) return
  //   refreshTimer = setInterval(() => {
  //     void refresh()
  //   }, refreshInterval)
  // }

  // const stopAutoRefresh = () => {
  //   if (refreshTimer) {
  //     clearInterval(refreshTimer)
  //     refreshTimer = null
  //   }
  // }

  const boot = async () => {
    if (!enabledRef.value) return
    // Initial fetch only - no periodic refresh for static sensors
    await refresh()
    // TODO: Re-enable when mobile sensors are added
    // startAutoRefresh()
  }

  if (enabledRef.value) {
    void boot()
  }

  watch(enabledRef, (isEnabled) => {
    if (isEnabled) {
      void boot()
    } else {
      // TODO: Re-enable when mobile sensors are added
      // stopAutoRefresh()
    }
  })

  onBeforeUnmount(() => {
    // TODO: Re-enable when mobile sensors are added
    // stopAutoRefresh()
  })

  return {
    sensors,
    filteredSensors,
    isLoading,
    error,
    filters,
    sort: {
      field: sortField,
      direction: sortDirection,
      setSort
    },
    groupBy,
    refresh
  }
}



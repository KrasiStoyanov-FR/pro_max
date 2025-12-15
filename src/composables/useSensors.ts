import { ref, computed, onBeforeUnmount, watch, type Ref, isRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/store/data'
import type { GpsUnitPosition } from '@/types/database'
import type { SensorItem, SensorStatus, SensorType } from '@/types/sensors'

export interface UseSensorsOptions {
  refreshInterval?: number
  enabled?: Ref<boolean> | boolean
}

export interface UseSensorsResult {
  sensors: Ref<SensorItem[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
}

const SENSOR_STATUS_MAP: Record<string, SensorStatus> = {
  online: 'online',
  running: 'online',
  active: 'online',
  healthy: 'online',
  offline: 'offline',
  disconnected: 'offline',
  down: 'offline',
  degraded: 'degraded',
  warning: 'degraded'
}

const SENSOR_TYPE_MAP: Record<string, SensorType> = {
  rf: 'RF',
  'rf detector': 'RF',
  radar: 'Radar',
  'radar sensor': 'Radar',
  'eo/ir': 'EO/IR',
  'eo-ir': 'EO/IR',
  'eo_ir': 'EO/IR',
  combined: 'Combined',
  hybrid: 'Combined'
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeStatus = (record: GpsUnitPosition): SensorStatus => {
  const candidates = [record.status, record.state, (record as any)?.health]

  for (const candidate of candidates) {
    if (!candidate) continue
    const normalized = candidate.toString().toLowerCase()
    if (SENSOR_STATUS_MAP[normalized]) {
      return SENSOR_STATUS_MAP[normalized]
    }
  }

  return 'offline'
}

const normalizeType = (record: GpsUnitPosition): SensorType => {
  const candidates = [record.type, (record as any)?.sensor_type, (record as any)?.category]

  for (const candidate of candidates) {
    if (!candidate) continue
    const normalized = candidate.toString().toLowerCase()
    if (SENSOR_TYPE_MAP[normalized]) {
      return SENSOR_TYPE_MAP[normalized]
    }
  }

  return 'Unknown'
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
    type: normalizeType(record),
    status: normalizeStatus(record),
    lastCommunication: record.time ?? record.last_seen ?? null,
    firmwareVersion: (record as any)?.firmware_version ?? null,
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
    return list
      .map(mapSensorRecord)
      .sort((a, b) => {
        const timeA = a.lastCommunication ? new Date(a.lastCommunication).getTime() : 0
        const timeB = b.lastCommunication ? new Date(b.lastCommunication).getTime() : 0
        return timeB - timeA
      })
  })

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
    isLoading,
    error,
    refresh
  }
}



import { ref, computed, onBeforeUnmount, watch, isRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/store/data'
import type { Drone, DronePosition, RFDetection } from '@/types/database'
import type { DroneItem, UnifiedDetectionRow } from '@/types/drones'

export interface UseMergedDetectionsOptions {
  refreshInterval?: number
  enabled?: Ref<boolean> | boolean
  /** Max number of RF detections to fetch (default 1000). Positions are fetched without limit. */
  rfLimit?: number
}

export interface UseMergedDetectionsResult {
  /** Stable during loading: shows previous data until new fetch completes */
  mergedDetections: Ref<UnifiedDetectionRow[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
}

const mapDroneToItem = (record: Drone): DroneItem => {
  const manufacturer = (record as any).manufacturer ?? null
  const modelName = (record as any).model_name ?? null
  const displayName =
    modelName ||
    record.serial_number ||
    record.uas_id ||
    record.mac_address ||
    `Drone #${record.id}`
  return {
    id: record.id,
    systemId: record.system_id ?? null,
    macAddress: record.mac_address,
    serialNumber: record.serial_number,
    uasId: record.uas_id,
    firstSeen: record.first_seen,
    lastSeen: record.last_seen,
    isActive: record.is_active,
    manufacturer,
    modelName,
    displayName
  }
}

const timeToMs = (value?: string | null): number => {
  if (!value) return Number.NaN
  return new Date(value).getTime()
}

export function useMergedDetections(
  options: UseMergedDetectionsOptions = {}
): UseMergedDetectionsResult {
  const {
    refreshInterval = 30000,
    enabled = true,
    rfLimit = 1000
  } = options

  const dataStore = useDataStore()
  const { dronePositionsList, rfDetectionsList, dronesList, loading, errors } =
    storeToRefs(dataStore)

  const localError = ref<string | null>(null)

  const load = async (forceRefresh = false) => {
    localError.value = null
    try {
      await Promise.all([
        dataStore.fetchDrones(forceRefresh),
        dataStore.fetchDronePositions(undefined, forceRefresh),
        dataStore.fetchRFDetections(rfLimit, forceRefresh)
      ])
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Unknown error'
    }
  }

  const mergedDetections = computed<UnifiedDetectionRow[]>(() => {
    const positions = Array.isArray(dronePositionsList.value)
      ? dronePositionsList.value
      : []
    const rfList = Array.isArray(rfDetectionsList.value) ? rfDetectionsList.value : []

    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined) return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const latestRows = new Map<string, UnifiedDetectionRow>()
    const finalRows: UnifiedDetectionRow[] = []

    const processRow = (row: UnifiedDetectionRow) => {
      const droneId = row.drone?.id
      
      if (droneId !== undefined && droneId !== null) {
        // Group by Drone ID + Sensor ID + Source Type
        const systemId = row.systemId ?? 'unknown'
        const key = `${row.source}::${droneId}::${systemId}`
        
        const existing = latestRows.get(key)
        const newTime = timeToMs(row.time)
        
        if (!existing) {
          latestRows.set(key, row)
        } else {
           const oldTime = timeToMs(existing.time)
           const newValid = Number.isFinite(newTime)
           const oldValid = Number.isFinite(oldTime)
           
           if (newValid && (!oldValid || newTime > oldTime)) {
             latestRows.set(key, row)
           }
        }
      } else {
        finalRows.push(row)
      }
    }

    for (const pos of positions) {
      const drone =
        typeof pos.drone_id === 'number' && Number.isFinite(pos.drone_id)
          ? dataStore.getDrone(pos.drone_id)
          : undefined
      
      const row: UnifiedDetectionRow = {
        source: 'position',
        rowKey: `position-${pos.id}`,
        id: pos.id,
        time: pos.time ?? '',
        systemId: pos.system_id ?? null,
        altitude: pos.altitude ?? null,
        speed: pos.speed ?? null,
        receiverType: pos.receiver_type ?? null,
        latitude: toNum(pos.latitude) ?? null,
        longitude: toNum(pos.longitude) ?? null,
        drone: drone ? mapDroneToItem(drone) : null
      }
      processRow(row)
    }

    for (const rf of rfList) {
      const drone =
        typeof rf.drone_id === 'number' && Number.isFinite(rf.drone_id)
          ? dataStore.getDrone(rf.drone_id)
          : undefined

      const time = rf.time ?? rf.last_seen ?? rf.updated_at ?? ''
      const lat = toNum(rf.latitude ?? rf.lat) ?? null
      const lng = toNum(rf.longitude ?? rf.lon ?? rf.lng) ?? null
      
      const row: UnifiedDetectionRow = {
        source: 'rf',
        rowKey: `rf-${rf.id}`,
        id: rf.id,
        time,
        systemId: rf.system_id ?? null,
        altitude: rf.altitude ?? null,
        speed: typeof rf.speed === 'number' ? rf.speed : null,
        receiverType: rf.receiver_type ?? null,
        latitude: lat,
        longitude: lng,
        detectionStatus: rf.detection_status ?? null,
        signalStrength: rf.signal_strength ?? null,
        frequency: rf.frequency ?? null,
        drone: drone ? mapDroneToItem(drone) : null
      }
      processRow(row)
    }

    finalRows.push(...latestRows.values())

    finalRows.sort((a, b) => {
      const ta = timeToMs(a.time)
      const tb = timeToMs(b.time)
      if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0
      if (!Number.isFinite(ta)) return 1
      if (!Number.isFinite(tb)) return -1
      return tb - ta
    })

    return finalRows
  })

  const isLoading = computed(
    () =>
      loading.value.drones ||
      loading.value.dronePositions ||
      loading.value.rfDetections
  )

  const error = computed(
    () =>
      localError.value ??
      errors.value.drones ??
      errors.value.dronePositions ??
      errors.value.rfDetections ??
      null
  )

  const refresh = () => load(true)

  const lastMerged = ref<UnifiedDetectionRow[]>([])
  watch(
    [mergedDetections, isLoading],
    () => {
      if (!isLoading.value && mergedDetections.value.length) {
        lastMerged.value = mergedDetections.value
      }
    },
    { immediate: true }
  )
  const displayedMerged = computed<UnifiedDetectionRow[]>(() =>
    isLoading.value ? lastMerged.value : mergedDetections.value
  )

  const enabledRef = isRef(enabled) ? enabled : ref(enabled)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const startAutoRefresh = () => {
    if (intervalId) return
    if (refreshInterval > 0) {
      intervalId = setInterval(() => load(), refreshInterval)
    }
  }

  const stopAutoRefresh = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const boot = () => {
    if (!enabledRef.value) return
    void load()
    startAutoRefresh()
  }

  if (enabledRef.value) {
    boot()
  }

  watch(enabledRef, (isEnabled) => {
    if (isEnabled) {
      boot()
    } else {
      stopAutoRefresh()
    }
  })

  onBeforeUnmount(() => {
    stopAutoRefresh()
  })

  return {
    mergedDetections: displayedMerged,
    isLoading,
    error,
    refresh
  }
}

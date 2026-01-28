import { ref, computed, onBeforeUnmount, watch, isRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/store/data'
import type { Drone, RFDetection } from '@/types/database'
import type { DroneItem, DroneFiltersState, DroneSortField } from '@/types/drones'

export interface UseDronesOptions {
  refreshInterval?: number
  enabled?: Ref<boolean> | boolean
}

export interface UseDronesResult {
  drones: Ref<DroneItem[]>
  filteredDrones: Ref<DroneItem[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  filters: {
    search: Ref<string>
    status: Ref<'all' | 'active' | 'inactive'>
  }
  sort: {
    field: Ref<DroneSortField | null>
    direction: Ref<'asc' | 'desc'>
    setSort: (field: DroneSortField) => void
  }
  refresh: () => Promise<void>
}

const mapDroneRecord = (record: Drone): DroneItem => {
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

export function useDrones(options: UseDronesOptions = {}): UseDronesResult {
  const {
    refreshInterval = 30000, // 30 seconds default
    enabled = true
  } = options

  const dataStore = useDataStore()
  const {
    dronesList,
    loading,
    errors
  } = storeToRefs(dataStore)

  const dronesSource = computed<Drone[]>(() => {
    const source = dronesList.value
    return Array.isArray(source) ? source : []
  })

  const drones = computed<DroneItem[]>(() => {
    const baseItems = dronesSource.value.map(mapDroneRecord)

    // Derive firstSeen from detections when needed and ensure lastSeen is never before firstSeen
    return baseItems.map((drone) => {
      let firstSeen = drone.firstSeen
      let lastSeen = drone.lastSeen

      const dbFirstTime = new Date(firstSeen).getTime()
      const hasValidDbFirst = Number.isFinite(dbFirstTime)

      // Collect candidate timestamps from detections for firstSeen
      const candidateFirstTimes: number[] = []

      // By drone ID
      const detectionsByDrone: RFDetection[] = dataStore.getRFDetectionsByDroneId(drone.id) || []
      detectionsByDrone.forEach((detection) => {
        const ts =
          detection.time ??
          detection.last_seen ??
          detection.updated_at ??
          null
        if (!ts) return
        const time = new Date(ts).getTime()
        if (Number.isFinite(time)) {
          candidateFirstTimes.push(time)
        }
      })

      // By system ID (if available)
      if (drone.systemId) {
        const detectionsBySystem: RFDetection[] = dataStore.getRFDetectionsBySystemId(String(drone.systemId)) || []
        detectionsBySystem.forEach((detection) => {
          const ts =
            detection.time ??
            detection.last_seen ??
            detection.updated_at ??
            null
          if (!ts) return
          const time = new Date(ts).getTime()
          if (Number.isFinite(time)) {
            candidateFirstTimes.push(time)
          }
        })
      }

      // Use earliest detection as firstSeen fallback/override when appropriate
      if (candidateFirstTimes.length) {
        const earliest = Math.min(...candidateFirstTimes)
        if (!hasValidDbFirst || earliest < dbFirstTime) {
          firstSeen = new Date(earliest).toISOString()
        }
      }

      // If database lastSeen is behind firstSeen, align it with firstSeen until it catches up
      if (lastSeen) {
        const lastTime = new Date(lastSeen).getTime()
        const firstTimeForCompare = new Date(firstSeen).getTime()
        if (
          Number.isFinite(lastTime) &&
          Number.isFinite(firstTimeForCompare) &&
          lastTime < firstTimeForCompare
        ) {
          lastSeen = firstSeen
        }
      }

      return {
        ...drone,
        firstSeen,
        lastSeen
      }
    })
  })

  const filters = {
    search: ref<string>(''),
    status: ref<'all' | 'active' | 'inactive'>('all')
  }

  const sortField = ref<DroneSortField | null>('lastSeen')
  const sortDirection = ref<'asc' | 'desc'>('desc')

  const filteredDrones = computed<DroneItem[]>(() => {
    let result = [...drones.value]

    // Apply search filter
    if (filters.search.value.trim()) {
      const searchLower = filters.search.value.toLowerCase().trim()
      result = result.filter(drone => {
        return (
          drone.manufacturer?.toLowerCase().includes(searchLower) ||
          drone.modelName?.toLowerCase().includes(searchLower) ||
          drone.macAddress.toLowerCase().includes(searchLower) ||
          drone.serialNumber?.toLowerCase().includes(searchLower) ||
          drone.uasId?.toLowerCase().includes(searchLower) ||
          drone.displayName.toLowerCase().includes(searchLower) ||
          drone.id.toString().includes(searchLower)
        )
      })
    }

    // Apply status filter
    if (filters.status.value !== 'all') {
      result = result.filter(drone => {
        if (filters.status.value === 'active') {
          return drone.isActive
        } else {
          return !drone.isActive
        }
      })
    }

    // Apply sorting
    if (sortField.value) {
      result.sort((a, b) => {
        let comparison = 0
        switch (sortField.value) {
          case 'id':
            comparison = a.id - b.id
            break
          case 'manufacturer':
            comparison = (a.manufacturer || '').localeCompare(b.manufacturer || '')
            break
          case 'modelName':
            comparison = (a.modelName || '').localeCompare(b.modelName || '')
            break
          case 'serialNumber':
            comparison = (a.serialNumber || '').localeCompare(b.serialNumber || '')
            break
          case 'firstSeen': {
            const timeA = new Date(a.firstSeen).getTime()
            const timeB = new Date(b.firstSeen).getTime()
            comparison = timeA - timeB
            break
          }
          case 'lastSeen': {
            const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0
            const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0
            comparison = timeA - timeB
            break
          }
          case 'systemId':
            comparison = (a.systemId ? String(a.systemId) : '').localeCompare(
              b.systemId ? String(b.systemId) : ''
            )
            break
          default:
            return 0
        }
        return sortDirection.value === 'asc' ? comparison : -comparison
      })
    }

    return result
  })

  const setSort = (field: DroneSortField) => {
    if (sortField.value === field) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortDirection.value = field === 'lastSeen' ? 'desc' : 'asc'
    }
  }

  const enabledRef: Ref<boolean> = isRef(enabled) ? enabled : ref(enabled)
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let refreshPromise: Promise<void> | null = null

  const startAutoRefresh = () => {
    if (refreshTimer || refreshInterval <= 0) return
    refreshTimer = setInterval(() => {
      void refresh()
    }, refreshInterval)
  }

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  const refresh = async (): Promise<void> => {
    if (!enabledRef.value) return
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        await dataStore.fetchDrones(true)
      } catch (err) {
        console.error('[useDrones] Failed to refresh drones', err)
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  // Watch filter changes to refetch data
  watch(
    [
      () => filters.search.value,
      () => filters.status.value
    ],
    () => {
      // Filters are applied client-side, no need to refetch
    }
  )

  const boot = async () => {
    if (!enabledRef.value) return
    await refresh()
    startAutoRefresh()
  }

  if (enabledRef.value) {
    void boot()
  }

  watch(enabledRef, (isEnabled) => {
    if (isEnabled) {
      void boot()
    } else {
      stopAutoRefresh()
    }
  })

  onBeforeUnmount(() => {
    stopAutoRefresh()
  })

  const isLoading = computed(() => {
    const loadingState = loading.value
    return Boolean(loadingState?.drones)
  })
  
  const error = computed(() => {
    return errors.value?.drones ?? null
  })

  return {
    drones,
    filteredDrones,
    isLoading,
    error,
    filters,
    sort: {
      field: sortField,
      direction: sortDirection,
      setSort
    },
    refresh
  }
}




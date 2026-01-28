import { ref, computed, onBeforeUnmount, watch, isRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/store/data'
import type { Drone, DronePosition, RFDetection } from '@/types/database'
import type {
  DetectionFiltersState,
  DetectionItem,
  DetectionSensorInfo,
  DetectionRiskLevel,
  DetectionSortField,
  DetectionStatus,
  DetectionType
} from '@/types/detections'

export interface UseDetectionsOptions {
  limit?: number
  positionsLimit?: number
  refreshInterval?: number
  enabled?: Ref<boolean> | boolean
}

export interface UseDetectionsResult {
  detections: Ref<DetectionItem[]>
  filteredDetections: Ref<DetectionItem[]>
  paginatedDetections: Ref<DetectionItem[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  filters: {
    search: Ref<string>
    type: Ref<DetectionType | 'all'>
    status: Ref<DetectionStatus | 'all'>
    timeWindow: Ref<number | null>
    zone: Ref<string | 'all'>
  }
  sort: {
    field: Ref<DetectionSortField | null>
    direction: Ref<'asc' | 'desc'>
    setSort: (field: DetectionSortField) => void
  }
  pagination: {
    currentPage: Ref<number>
    pageSize: Ref<number>
    totalPages: Ref<number>
    totalItems: Ref<number>
    setPage: (page: number) => void
    setPageSize: (size: number) => void
  }
  refresh: () => Promise<void>
}

const STATUS_PRIORITY: DetectionStatus[] = ['Alarm', 'Track', 'Detect', 'Whitelisted']

const detectionTypeMap: Record<string, DetectionType> = {
  uav: 'UAV',
  drone: 'UAV',
  rc: 'RC',
  'rc plane': 'RC',
  'rc helicopter': 'RC',
  unknown: 'Unknown',
  default: 'Unknown',
  'n/a': 'Unknown',
  'not specified': 'Unknown',
  interference: 'Interference',
  jammer: 'Interference',
  spoofing: 'Interference'
}

const detectionStatusMap: Record<string, DetectionStatus> = {
  alarm: 'Alarm',
  alert: 'Alarm',
  critical: 'Alarm',
  track: 'Track',
  tracking: 'Track',
  detect: 'Detect',
  detected: 'Detect',
  whitelisted: 'Whitelisted',
  clear: 'Whitelisted'
}

const normalizeType = (value?: string | null): DetectionType => {
  if (!value || !value.trim()) return 'Unknown'
  const normalized = value.trim().toLowerCase()
  return detectionTypeMap[normalized] ?? detectionTypeMap.default
}

const normalizeStatus = (record: RFDetection): DetectionStatus => {
  const candidates = [
    record.status,
    record.tracking_status,
    record.alert_status,
    record.risk_level,
    record.detection_status ? 'Detect' : 'Whitelisted'
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const normalized = candidate.toString().toLowerCase()
    if (detectionStatusMap[normalized]) {
      return detectionStatusMap[normalized]
    }
  }

  return record.detection_status ? 'Detect' : 'Whitelisted'
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const resolveSensorName = (record: RFDetection): string => {
  return (
    record.sensor_name ||
    record.receiver_name ||
    record.receiver_type ||
    (record.system_id ? `System ${record.system_id}` : 'Unknown sensor')
  )
}

const resolveSensorId = (record: RFDetection): string | number | null => {
  return record.sensor_id ?? record.system_id ?? null
}

const resolveSensors = (record: RFDetection): DetectionSensorInfo[] => {
  const sensors: DetectionSensorInfo[] = []

  if (record.sensor_name) {
    sensors.push({
      id: resolveSensorId(record),
      name: record.sensor_name
    })
  }

  if (Array.isArray(record.sensor_list)) {
    record.sensor_list.forEach(name => {
      sensors.push({ name })
    })
  }

  if (!sensors.length && record.system_id) {
    sensors.push({ id: record.system_id, name: `System ${record.system_id}` })
  }

  return sensors
}

const deriveRiskLevel = (record: RFDetection): DetectionRiskLevel | null => {
  const candidate = record.risk_level?.toString().toLowerCase()
  if (candidate === 'high') return 'high'
  if (candidate === 'medium') return 'medium'
  if (candidate === 'low') return 'low'

  // Risk is not yet formally defined – avoid inferring from other metrics
  return null
}

const resolveDistance = (record: RFDetection, position?: DronePosition | null): number | null => {
  const detectionDistance = toNumber(record.distance ?? record.range_m)
  if (detectionDistance !== null) return detectionDistance
  if (position) {
    const fallback = toNumber(position.distance ?? position.range_m)
    if (fallback !== null) return fallback
  }
  return null
}

const resolveAltitude = (record: RFDetection, position?: DronePosition | null): number | null => {
  const detectionAltitude = toNumber(record.altitude)
  if (detectionAltitude !== null) return detectionAltitude
  return toNumber(position?.altitude)
}

const resolveBearing = (record: RFDetection, position?: DronePosition | null): number | null => {
  const detectionBearing = toNumber(record.bearing ?? record.azimuth)
  if (detectionBearing !== null) return detectionBearing
  if (position) {
    const fallback = toNumber(
      position.bearing ??
        (position as unknown as { azimuth?: number | string | null }).azimuth ??
        (position as unknown as { heading?: number | string | null }).heading
    )
    if (fallback !== null) return fallback
  }
  return null
}

const resolveTimestamp = (record: RFDetection): string => {
  return record.time || record.last_seen || record.updated_at || new Date().toISOString()
}

const resolveCoordinates = (
  record: RFDetection,
  position?: DronePosition | null
): { lat: number | null; lng: number | null } => {
  const latCandidates = [
    record.latitude,
    record.lat,
    (record as unknown as { latitude_deg?: number | string | null }).latitude_deg,
    position?.latitude
  ]
  const lngCandidates = [
    record.longitude,
    record.lon,
    record.lng,
    (record as unknown as { longitude_deg?: number | string | null }).longitude_deg,
    position?.longitude
  ]

  const toCoord = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    const numeric = typeof value === 'string' ? parseFloat(value) : value
    return Number.isFinite(numeric as number) ? (numeric as number) : null
  }

  const lat = latCandidates.map(toCoord).find(value => value !== null) ?? null
  const lng = lngCandidates.map(toCoord).find(value => value !== null) ?? null

  return { lat, lng }
}

const resolveAngle = (
  record: RFDetection,
  fallbackFieldA: keyof RFDetection,
  fallbackFieldB: keyof RFDetection
): number | null => {
  const primary = toNumber(record[fallbackFieldA])
  if (primary !== null) return primary
  return toNumber(record[fallbackFieldB])
}

const timeToMs = (value?: string | null): number => {
  if (!value) return Number.NaN
  const timestamp = new Date(value).getTime()
  return timestamp
}

const getMetricQuality = (record: RFDetection): number => {
  let score = 0
  if (toNumber(record.distance ?? record.range_m) !== null) score += 1
  if (toNumber(record.altitude) !== null) score += 1
  if (toNumber(record.bearing ?? record.azimuth) !== null) score += 1
  return score
}

const shouldReplaceRecord = (current: RFDetection, candidate: RFDetection): boolean => {
  const currentTime = timeToMs(resolveTimestamp(current))
  const candidateTime = timeToMs(resolveTimestamp(candidate))

  const currentQuality = getMetricQuality(current)
  const candidateQuality = getMetricQuality(candidate)

  if (Number.isNaN(currentTime) && Number.isNaN(candidateTime)) {
    return candidateQuality >= currentQuality
  }

  if (Number.isNaN(currentTime)) return true
  if (Number.isNaN(candidateTime)) return false

  if (candidateTime === currentTime) {
    return candidateQuality >= currentQuality
  }

  return candidateTime > currentTime
}

const normalizeKeyTimestamp = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  // Round to nearest second to collapse sub-second duplicates
  const rounded = Math.round(date.getTime() / 1000) * 1000
  return new Date(rounded).toISOString()
}

const buildDetectionKey = (record: RFDetection, fallbackIndex: number): string => {
  const parts: string[] = []

  if (record.id !== undefined && record.id !== null) {
    parts.push(`id:${record.id}`)
  } else {
    parts.push(`idx:${fallbackIndex}`)
  }

  const timestamp = resolveTimestamp(record)
  const normalizedTime = normalizeKeyTimestamp(timestamp)
  parts.push(`time:${normalizedTime}`)

  const sensorKey =
    record.system_id?.toString().trim() ||
    record.sensor_id?.toString().trim() ||
    record.sensor_name?.toString().trim() ||
    record.receiver_name?.toString().trim() ||
    'unknown-sensor'
  parts.push(`sensor:${sensorKey}`)

  const droneKey =
    record.drone_id !== null && record.drone_id !== undefined
      ? `drone:${record.drone_id}`
      : 'drone:none'
  parts.push(droneKey)

  return parts.join('|')
}

const buildDroneDisplayName = (drone: Drone): string => {
  const manufacturer = (drone as any).manufacturer ?? null
  const modelName = (drone as any).model_name ?? null

  if (modelName && manufacturer) {
    return `${manufacturer} ${modelName}`
  }

  if (modelName) {
    return String(modelName)
  }

  if (drone.serial_number) return drone.serial_number
  if (drone.uas_id) return drone.uas_id
  if (drone.mac_address) return drone.mac_address

  return `Drone #${drone.id}`
}

const mapDetectionRecord = (
  record: RFDetection,
  position?: DronePosition | null,
  drone?: Drone | null
): DetectionItem => {
  const coordinates = resolveCoordinates(record, position)

  const droneInfo =
    drone && typeof drone.id === 'number'
      ? {
          id: drone.id,
          systemId: drone.system_id ?? null,
          manufacturer: ((drone as any).manufacturer ?? null) as string | null,
          modelName: ((drone as any).model_name ?? null) as string | null,
          serialNumber: drone.serial_number ?? null,
          firstSeen: drone.first_seen ?? null,
          lastSeen: (drone as any).last_seen ?? null,
          displayName: buildDroneDisplayName(drone)
        }
      : undefined

  return {
    id: record.id,
    type: normalizeType(record.type ?? record.target_type ?? record.category),
    status: normalizeStatus(record),
    distanceMeters: resolveDistance(record, position),
    altitudeMeters: resolveAltitude(record, position),
    bearingDegrees: resolveBearing(record, position),
    lastSeen: resolveTimestamp(record),
    sensorName: resolveSensorName(record),
    sensorId: resolveSensorId(record),
    riskLevel: deriveRiskLevel(record),
    zone: record.zone ?? null,
    droneId: record.drone_id,
    systemId: record.system_id,
    frequency: record.frequency,
    signalStrength: toNumber(record.signal_strength),
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    speedMetersPerSecond: toNumber(record.speed ?? position?.speed),
    aglMeters: toNumber(record.agl_height ?? record.agl),
    angleXDegrees: resolveAngle(record, 'angle_x', 'angle_x_deg'),
    angleYDegrees: resolveAngle(record, 'angle_y', 'angle_y_deg'),
    band: record.band ?? null,
    confidence: toNumber(record.confidence),
    targetId: record.target_id ?? record.drone_id ?? null,
    sensors: resolveSensors(record),
    drone: droneInfo,
    source: record
  }
}

export function useDetections(options: UseDetectionsOptions = {}): UseDetectionsResult {
  const {
    limit,
    positionsLimit,
    refreshInterval = 5000,
    enabled = true
  } = options

  const dataStore = useDataStore()
  const {
    rfDetectionsList,
    dronePositionsList,
    loading,
    errors
  } = storeToRefs(dataStore)

  // For paginated fetching, we only have the current page's data
  const detectionsSource = computed<RFDetection[]>(() => {
    const source = rfDetectionsList.value
    return Array.isArray(source) ? source : []
  })

  const dronePositionsSource = computed<DronePosition[]>(() => {
    const source = dronePositionsList.value
    return Array.isArray(source) ? source : []
  })

  const positionIndexes = computed(() => {
    const byDroneId = new Map<number, DronePosition[]>()
    const bySystemId = new Map<string, DronePosition[]>()

    dronePositionsSource.value.forEach(position => {
      const droneId = typeof position.drone_id === 'number' ? position.drone_id : null
      if (droneId !== null && Number.isFinite(droneId)) {
        const bucket = byDroneId.get(droneId) ?? []
        bucket.push(position)
        byDroneId.set(droneId, bucket)
      }

      if (position.system_id) {
        const key = position.system_id.toString()
        const bucket = bySystemId.get(key) ?? []
        bucket.push(position)
        bySystemId.set(key, bucket)
      }
    })

    const sortByRecency = (list: DronePosition[]) => {
      list.sort((a, b) => timeToMs(b.time) - timeToMs(a.time))
    }

    byDroneId.forEach(sortByRecency)
    bySystemId.forEach(sortByRecency)

    return { byDroneId, bySystemId }
  })

  const findSupportingPosition = (record: RFDetection): DronePosition | null => {
    const { byDroneId, bySystemId } = positionIndexes.value
    const candidates = new Set<DronePosition>()

    if (typeof record.drone_id === 'number' && Number.isFinite(record.drone_id)) {
      const matches = byDroneId.get(record.drone_id)
      matches?.forEach(match => candidates.add(match))
    }

    if (record.system_id) {
      const matches = bySystemId.get(record.system_id)
      matches?.forEach(match => candidates.add(match))
    }

    if (!candidates.size) {
      return null
    }

    const detectionTime = timeToMs(resolveTimestamp(record))
    if (Number.isNaN(detectionTime)) {
      return candidates.values().next().value ?? null
    }

    let best: DronePosition | null = null
    let bestDelta = Number.POSITIVE_INFINITY

    candidates.forEach(candidate => {
      const delta = Math.abs(timeToMs(candidate.time) - detectionTime)
      if (delta < bestDelta) {
        best = candidate
        bestDelta = delta
      }
    })

    return best
  }

  const filters = {
    search: ref<DetectionFiltersState['search']>(''),
    type: ref<DetectionFiltersState['type']>('all'),
    status: ref<DetectionFiltersState['status']>('all'),
    timeWindow: ref<DetectionFiltersState['timeWindow']>(24 * 60),
    zone: ref<DetectionFiltersState['zone']>('all'),
    sensorId: ref<DetectionFiltersState['sensorId']>(null),
    systemId: ref<DetectionFiltersState['systemId']>(null)
  }

  const sortField = ref<DetectionSortField | null>('lastSeen')
  const sortDirection = ref<'asc' | 'desc'>('desc')

  // Pagination state
  const currentPage = ref(1)
  const pageSize = ref(50)

  // Simplified deduplication - only for current page (much smaller dataset)
  const dedupedDetections = computed<RFDetection[]>(() => {
    // With pagination, we only have ~50-200 records, so deduplication is fast
    const bestByKey = new Map<string, RFDetection>()

    detectionsSource.value.forEach((record, index) => {
      const key = buildDetectionKey(record, index)
      const existing = bestByKey.get(key)

      if (!existing) {
        bestByKey.set(key, record)
        return
      }

      if (shouldReplaceRecord(existing, record)) {
        bestByKey.set(key, record)
      }
    })

    // Sort by time (newest first) - server already orders by id DESC, but we sort by timestamp for consistency
    return Array.from(bestByKey.values()).sort((a, b) => {
      const timeA = timeToMs(resolveTimestamp(a))
      const timeB = timeToMs(resolveTimestamp(b))

      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0
      if (Number.isNaN(timeA)) return 1
      if (Number.isNaN(timeB)) return -1
      return timeB - timeA
    })
  })

  const detections = computed<DetectionItem[]>(() => {
    return dedupedDetections.value.map(record => {
      const position = findSupportingPosition(record)
      const drone =
        typeof record.drone_id === 'number' && Number.isFinite(record.drone_id)
          ? dataStore.getDrone(record.drone_id)
          : undefined
      return mapDetectionRecord(record, position, drone ?? null)
    })
  })

  // With server-side filtering, we only get filtered data from the server
  // So we just need to apply client-side sorting to the already-filtered results
  const filteredDetections = computed<DetectionItem[]>(() => {
    // Data from server is already filtered, we just need to sort it
    if (!sortField.value) {
      return detections.value
    }

    const sorted = [...detections.value].sort((a, b) => {
      switch (sortField.value) {
        case 'distance': {
          const distanceA = a.distanceMeters ?? Number.POSITIVE_INFINITY
          const distanceB = b.distanceMeters ?? Number.POSITIVE_INFINITY
          return distanceA - distanceB
        }
        case 'lastSeen': {
          const timeA = new Date(a.lastSeen).getTime()
          const timeB = new Date(b.lastSeen).getTime()

          if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0
          if (Number.isNaN(timeA)) return 1
          if (Number.isNaN(timeB)) return -1
          return timeA - timeB
        }
        case 'status': {
          const indexA = STATUS_PRIORITY.indexOf(a.status)
          const indexB = STATUS_PRIORITY.indexOf(b.status)
          return indexA - indexB
        }
        default:
          return 0
      }
    })

    return sortDirection.value === 'asc' ? sorted : sorted.reverse()
  })

  // Note: Filter change watching is now handled in refresh() to trigger data fetch

  // Paginated detections - since we're fetching only current page, use filtered directly
  // (no need to slice as we only have current page data)
  const paginatedDetections = computed<DetectionItem[]>(() => {
    // With server-side pagination, we only have the current page's data
    // So filteredDetections already contains just the current page
    return filteredDetections.value
  })

  const totalPages = computed(() => {
    // Use totalCount from server for pagination, fallback to filtered length
    const count = totalCount.value > 0 ? totalCount.value : filteredDetections.value.length
    const validCount = Number.isFinite(count) && count >= 0 ? count : 0
    const validPageSize = Number.isFinite(pageSize.value) && pageSize.value > 0 ? pageSize.value : 50
    return Math.ceil(validCount / validPageSize) || 1
  })

  const setPage = (page: number) => {
    const maxPage = totalPages.value
    currentPage.value = Math.max(1, Math.min(page, maxPage))
  }

  const setPageSize = (size: number) => {
    pageSize.value = Math.max(10, Math.min(size, 500))
    currentPage.value = 1 // Reset to first page when changing page size
  }

  const setSort = (field: DetectionSortField) => {
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

  // Total count for pagination
  const totalCount = ref<number>(0)
  
  const fetchTotalCount = async () => {
    try {
      const filterParams = {
        type: filters.type.value !== 'all' ? filters.type.value : undefined,
        status: filters.status.value !== 'all' ? filters.status.value : undefined,
        timeWindow: filters.timeWindow.value,
        zone: filters.zone.value !== 'all' ? filters.zone.value : undefined,
        search: filters.search.value.trim() || undefined,
        sensorId: filters.sensorId.value ?? undefined,
        systemId: filters.systemId.value ?? undefined
      }
      const count = await dataStore.fetchRFDetectionsCount(true, filterParams)
      totalCount.value = count
    } catch (err) {
      console.error('[useDetections] Failed to fetch total count', err)
    }
  }

  const refresh = async (): Promise<void> => {
    if (!enabledRef.value) return
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        // Build filter parameters
        const filterParams = {
          type: filters.type.value !== 'all' ? filters.type.value : undefined,
          status: filters.status.value !== 'all' ? filters.status.value : undefined,
          timeWindow: filters.timeWindow.value,
          zone: filters.zone.value !== 'all' ? filters.zone.value : undefined,
          search: filters.search.value.trim() || undefined,
          sensorId: filters.sensorId.value ?? undefined,
          systemId: filters.systemId.value ?? undefined
        }

        // Fetch total count with filters
        await fetchTotalCount()
        
        // Fetch only current page data with filters
        const offset = (currentPage.value - 1) * pageSize.value
        await Promise.all([
          dataStore.fetchRFDetections(pageSize.value, true, offset, filterParams),
          dataStore.fetchDronePositions(positionsLimit, true)
        ])
      } catch (err) {
        console.error('[useDetections] Failed to refresh detections', err)
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  // Watch page changes and filter changes to fetch new data
  watch([currentPage, pageSize], () => {
    if (enabledRef.value) {
      void refresh()
    }
  })

  // Watch filter changes to refetch data and reset to page 1
  watch(
    [
      () => filters.search.value,
      () => filters.type.value,
      () => filters.status.value,
      () => filters.timeWindow.value,
      () => filters.zone.value,
      () => filters.sensorId.value,
      () => filters.systemId.value
    ],
    () => {
      currentPage.value = 1 // Reset to first page when filters change
      if (enabledRef.value) {
        void refresh()
      }
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
    return Boolean(loadingState?.rfDetections || loadingState?.dronePositions)
  })
  const error = computed(() => {
    return errors.value?.rfDetections ?? null
  })

  return {
    detections,
    filteredDetections,
    paginatedDetections,
    isLoading,
    error,
    filters,
    sort: {
      field: sortField,
      direction: sortDirection,
      setSort
    },
    pagination: {
      currentPage,
      pageSize,
      totalPages,
      totalItems: computed(() => {
        // Always prefer totalCount from server, only fallback to filtered length if totalCount is 0 and we have data
        if (totalCount.value > 0) {
          return totalCount.value
        }
        // If we haven't fetched the count yet but have filtered data, use that as a temporary value
        const filteredLength = filteredDetections.value.length
        return Number.isFinite(filteredLength) && filteredLength >= 0 ? filteredLength : 0
      }),
      setPage,
      setPageSize
    },
    refresh
  }
}


// Types for drones page and report generation

export interface DroneItem {
  id: number
  systemId?: string | null
  macAddress: string
  serialNumber: string | null
  uasId: string | null
  firstSeen: string
  lastSeen: string | null
  isActive: boolean
  manufacturer: string | null
  modelName: string | null
  // Computed fields
  displayName: string
}

export interface DroneFiltersState {
  search: string
  status: 'all' | 'active' | 'inactive'
}

export type DroneSortField =
  | 'id'
  | 'manufacturer'
  | 'modelName'
  | 'serialNumber'
  | 'firstSeen'
  | 'lastSeen'
  | 'systemId'
  | 'time'

/** Unified row for Drones page table: each row is from drone_positions or rf_detections */
export type UnifiedDetectionSource = 'position' | 'rf'

export interface UnifiedDetectionRow {
  source: UnifiedDetectionSource
  /** Stable key for v-for and selection (e.g. "position-123", "rf-456") */
  rowKey: string
  id: number
  time: string
  systemId?: string | null
  altitude?: number | null
  speed?: number | null
  receiverType?: string | null
  /** Detection location for map preview */
  latitude?: number | null
  longitude?: number | null
  /** RF only */
  detectionStatus?: boolean | null
  signalStrength?: number | null
  frequency?: number | null
  /** Resolved when source === 'position' and drone_id is set */
  drone?: DroneItem | null
}

// Report types
export interface TimePeriod {
  startDate: string // ISO date string
  endDate: string // ISO date string
}

export interface DeviceStatus {
  deviceId: number
  deviceName: string
  connected: boolean
  connectionPeriods: Array<{
    start: string
    end: string | null
  }>
}

export interface DetectionInReport {
  id: number
  startTime: string
  endTime: string | null
  droneData: Record<string, any> // All drone-related fields
  operatorData: Record<string, any> // All operator-related fields
  [key: string]: any // All other fields from database
}

export interface ReportData {
  deviceName: string
  deviceId: number
  status: DeviceStatus
  detections: DetectionInReport[]
  period: TimePeriod
}

export interface ReportRequest {
  droneIds: number[]
  period: TimePeriod
}




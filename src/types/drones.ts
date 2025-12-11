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
  // Computed fields
  displayName: string
}

export interface DroneFiltersState {
  search: string
  status: 'all' | 'active' | 'inactive'
}

export type DroneSortField = 'id' | 'macAddress' | 'serialNumber' | 'firstSeen' | 'lastSeen' | 'isActive'

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


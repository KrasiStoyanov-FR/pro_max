export type SensorStatus = string // Use actual database values, not a predefined enum
export type SensorType = string // Use actual database values, not a predefined enum

export interface SensorNetworkInfo {
  connectionType?: string | null
  ipAddress?: string | null
  signalStrength?: number | null
  carrier?: string | null
}

export interface SensorHardwareInfo {
  cpuLoad?: number | null
  memoryUsage?: number | null
  temperatureCelsius?: number | null
  storageUsage?: number | null
  uptimeSeconds?: number | null
}

export interface SensorItem {
  id: string
  name: string
  type: SensorType
  status: SensorStatus
  unitGroup?: string | null
  lastCommunication: string | null
  firmwareVersion?: string | null
  softwareVersion?: string | null
  locationLabel?: string | null
  latitude?: number | null
  longitude?: number | null
  network: SensorNetworkInfo
  hardware: SensorHardwareInfo
  source: Record<string, unknown>
}



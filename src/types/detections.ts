export type DetectionType = 'UAV' | 'RC' | 'Unknown' | 'Interference'
export type DetectionStatus = 'Detect' | 'Track' | 'Alarm' | 'Whitelisted'
export type DetectionRiskLevel = 'low' | 'medium' | 'high'

export interface DetectionItem {
  id: number
  type: DetectionType
  status: DetectionStatus
  distanceMeters: number | null
  altitudeMeters: number | null
  bearingDegrees: number | null
  lastSeen: string
  sensorName: string
  sensorId?: string | number | null
  riskLevel: DetectionRiskLevel
  zone?: string | null
  droneId?: number | null
  systemId?: string | null
  frequency?: number | null
  signalStrength?: number | null
}

export type DetectionSortField = 'distance' | 'lastSeen' | 'status'

export interface DetectionFiltersState {
  search: string
  type: DetectionType | 'all'
  status: DetectionStatus | 'all'
  timeWindow: number | null
  zone: string | 'all'
}


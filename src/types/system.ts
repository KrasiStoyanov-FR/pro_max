/**
 * System status types for the Status Summary widget
 */

export type DatabaseStatus = 'ok' | 'degraded' | 'down'

export interface SystemStatus {
  database: {
    status: DatabaseStatus
    message: string
    lastCheck: string
    responseTime?: number
  }
  metrics: {
    activeDrones: number
    rfDetections: number
    operatorsOnline: number
    lastUpdated: string
  }
}

export interface SystemStatusResponse {
  success: boolean
  data?: SystemStatus
  error?: string
  timestamp: string
}

export interface SystemStatusDelta {
  type: 'metric' | 'database'
  metric?: {
    activeDrones?: number
    rfDetections?: number
    operatorsOnline?: number
  }
  database?: {
    status: DatabaseStatus
    message?: string
  }
  timestamp: string
}


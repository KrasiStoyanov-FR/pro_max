export interface MapPin {
  id: string
  lat: number
  lng: number
  title: string
  description?: string
  type: 'radar' | 'target' | 'threat' | 'friendly' | 'unknown' | 'drone'
  status: 'active' | 'inactive' | 'warning' | 'critical'
  priority: 'low' | 'medium' | 'high' | 'critical'
  data?: Record<string, any>
  timestamp: string
}

export interface DroneTrajectoryPoint {
  lat: number
  lng: number
  timestamp: string
}

export interface DroneTrajectory {
  droneId: string
  points: DroneTrajectoryPoint[]
}

export interface DetectionCheckpoint {
  id: number
  timestamp: string
  frequency: number | null
  signalStrength: number | null
  status: boolean
}

export interface MapViewport {
  center: [number, number]
  zoom: number
  maxZoom?: number
  minZoom?: number
}

export interface MapControl {
  id: string
  position: 'topright' | 'topleft' | 'bottomright' | 'bottomleft'
  element: HTMLElement
}

export interface RestrictedZone {
  id: string
  name: string
  coords?: [number, number][]  // For rectangular zones
  radius?: number              // For circular zones (in meters)
  color: string
  center: [number, number]
  description?: string
}



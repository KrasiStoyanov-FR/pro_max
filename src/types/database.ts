// Database schema types based on the real MariaDB schema

// Main drone table
export interface Drone {
  id: number
  mac_address: string
  serial_number: string | null
  uas_id: string | null
  first_seen: string // TIMESTAMP
  last_seen: string | null // TIMESTAMP
  is_active: boolean
}

// Drone positions table
export interface DronePosition {
  id: number
  drone_id: number
  time: string // TIMESTAMP
  latitude: number // DECIMAL(10, 8)
  longitude: number // DECIMAL(11, 8)
  altitude: number // DECIMAL(8, 2)
  speed: number // DECIMAL(5, 2)
  receiver_type: string | null
}

// Operator positions table
export interface OperatorPosition {
  id: number
  drone_id: number
  time: string // TIMESTAMP
  latitude: number // DECIMAL(10, 8)
  longitude: number // DECIMAL(11, 8)
}

// RF detections table
export interface RFDetection {
  id: number
  time: string // TIMESTAMP
  detection_status: boolean
  signal_strength: number | null // DECIMAL(8, 2)
  frequency: number | null // DECIMAL(10, 2)
  drone_id: number
}

// Receiver logs table
export interface ReceiverLog {
  id: number
  receiver_type: string | null
  status: string | null
  time: string // TIMESTAMP
  message: string | null
}

// Flight sessions table
export interface FlightSession {
  id: number
  drone_id: number
  start_time: string | null // TIMESTAMP
  end_time: string | null // TIMESTAMP
  max_altitude: number | null // DECIMAL(8, 2)
  max_speed: number | null // DECIMAL(5, 2)
  total_distance: number | null // DECIMAL(10, 2)
}

// Combined data types for frontend use
export interface DroneWithPositions extends Drone {
  latest_position?: DronePosition
  latest_rf_detection?: RFDetection
  flight_sessions?: FlightSession[]
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  type: 'drone' | 'operator' | 'detection'
  title: string
  data: DronePosition | OperatorPosition | RFDetection
  timestamp: string
}

// Database response types
export interface DatabaseResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// API response types
export interface DronePositionsResponse extends DatabaseResponse<DronePosition[]> {}
export interface DronesResponse extends DatabaseResponse<Drone[]> {}
export interface RFDetectionsResponse extends DatabaseResponse<RFDetection[]> {}
export interface FlightSessionsResponse extends DatabaseResponse<FlightSession[]> {}
export interface OperatorPositionsResponse extends DatabaseResponse<OperatorPosition[]> {}
export interface ReceiverLogsResponse extends DatabaseResponse<ReceiverLog[]> {}

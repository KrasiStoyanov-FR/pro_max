/**
 * Mock Data Service for Documentation Screenshots
 * 
 * This service provides curated, presentational data for screenshots.
 * Set USE_MOCK_DATA = true to enable mock data mode.
 * 
 * NOTE: This is for documentation purposes only. Real API calls are commented out
 * when mock mode is enabled to prevent breaking the working version.
 */

// ============================================================================
// CONFIGURATION: Set to true to use mock data for screenshots
// ============================================================================
export const USE_MOCK_DATA = true

// ============================================================================
// BULGARIAN LOCATIONS (Sofia and surrounding areas)
// ============================================================================

// Sofia city center
const SOFIA_CENTER = { lat: 42.6977, lng: 23.3219 }

// Key locations in Bulgaria for realistic data
const LOCATIONS = {
  sofia: { lat: 42.6977, lng: 23.3219, name: 'Sofia' },
  sofiaAirport: { lat: 42.6905, lng: 23.4125, name: 'Sofia Airport' },
  plovdiv: { lat: 42.1354, lng: 24.7453, name: 'Plovdiv' },
  varna: { lat: 43.2141, lng: 27.9147, name: 'Varna' },
  burgas: { lat: 42.5048, lng: 27.4626, name: 'Burgas' },
  ruse: { lat: 43.8564, lng: 25.9533, name: 'Ruse' },
  staraZagora: { lat: 42.4258, lng: 25.6344, name: 'Stara Zagora' },
  pleven: { lat: 43.4170, lng: 24.6067, name: 'Pleven' },
  sliven: { lat: 42.6858, lng: 26.3228, name: 'Sliven' },
  dobrich: { lat: 43.5722, lng: 27.8278, name: 'Dobrich' }
}

// Helper to generate timestamps
const getTimestamp = (hoursAgo: number = 0): string => {
  const date = new Date()
  date.setHours(date.getHours() - hoursAgo)
  return date.toISOString()
}

// Helper to add small random offset to coordinates
const addOffset = (lat: number, lng: number, maxOffset: number = 0.01): [number, number] => {
  const latOffset = (Math.random() - 0.5) * maxOffset
  const lngOffset = (Math.random() - 0.5) * maxOffset
  return [lat + latOffset, lng + lngOffset]
}

// Helper to calculate distance between two coordinates in km (Haversine formula)
const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper to generate trajectory points
const generateTrajectory = (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  points: number = 15
): Array<{ lat: number; lng: number; timestamp: string }> => {
  const trajectory: Array<{ lat: number; lng: number; timestamp: string }> = []
  const hoursAgo = points
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    const lat = startLat + (endLat - startLat) * progress
    const lng = startLng + (endLng - startLng) * progress
    trajectory.push({
      lat: lat + (Math.random() - 0.5) * 0.001, // Small random variation
      lng: lng + (Math.random() - 0.5) * 0.001,
      timestamp: getTimestamp(hoursAgo - i)
    })
  }
  
  return trajectory
}

// ============================================================================
// MOCK DRONE POSITIONS
// ============================================================================

export const mockDronePositions = () => {
  // Drone 1: Delivery drone in Sofia center
  const drone1Trajectory = generateTrajectory(
    42.6877, 23.3119, // Start: Sofia west
    42.7077, 23.3319, // End: Sofia east
    20
  )
  
  // Drone 2: Patrol drone near airport
  const drone2Trajectory = generateTrajectory(
    42.6805, 23.4025, // Start: Airport area
    42.7005, 23.4225, // End: Moving north
    18
  )
  
  // Drone 3: Surveillance drone in Plovdiv
  const drone3Trajectory = generateTrajectory(
    42.1254, 24.7353, // Start: Plovdiv south
    42.1454, 24.7553, // End: Plovdiv north
    12
  )
  
  // Drone 4: Emergency response drone in Sofia (different area)
  const drone4Trajectory = generateTrajectory(
    42.7027, 23.3419, // Start: Sofia northeast
    42.6827, 23.3519, // End: Sofia southeast
    15
  )
  
  // Drone 5: Delivery drone in Varna (coastal)
  const drone5Trajectory = generateTrajectory(
    43.2041, 27.9047, // Start: Varna west
    43.2241, 27.9247, // End: Varna east
    14
  )
  
  // Drone 6: Patrol drone in Burgas (coastal)
  const drone6Trajectory = generateTrajectory(
    42.4948, 27.4526, // Start: Burgas south
    42.5148, 27.4726, // End: Burgas north
    16
  )

  return [
    // Drone 1 - Delivery in Sofia
    ...drone1Trajectory.map((point, index) => ({
      id: 1000 + index,
      drone_id: 1,
      time: point.timestamp,
      latitude: point.lat,
      longitude: point.lng,
      altitude: 45.5 + Math.random() * 10,
      speed: 25.3 + Math.random() * 5,
      receiver_type: 'RF-3000',
      system_id: 1
    })),
    
    // Drone 2 - Patrol near airport
    ...drone2Trajectory.map((point, index) => ({
      id: 2000 + index,
      drone_id: 2,
      time: point.timestamp,
      latitude: point.lat,
      longitude: point.lng,
      altitude: 120.8 + Math.random() * 20,
      speed: 35.7 + Math.random() * 8,
      receiver_type: 'RF-3000',
      system_id: 1
    })),
    
    // Drone 3 - Surveillance in Plovdiv
    ...drone3Trajectory.map((point, index) => ({
      id: 3000 + index,
      drone_id: 3,
      time: point.timestamp,
      latitude: point.lat,
      longitude: point.lng,
      altitude: 85.2 + Math.random() * 15,
      speed: 28.4 + Math.random() * 6,
      receiver_type: 'RF-2000',
      system_id: 2
    })),
    
    // Drone 4 - Emergency response in Sofia
    ...drone4Trajectory.map((point, index) => ({
      id: 4000 + index,
      drone_id: 4,
      time: point.timestamp,
      latitude: point.lat,
      longitude: point.lng,
      altitude: 95.0 + Math.random() * 15,
      speed: 30.2 + Math.random() * 7,
      receiver_type: 'RF-3000',
      system_id: 1
    })),
    
    // Drone 5 - Delivery in Varna
    ...drone5Trajectory.map((point, index) => ({
      id: 5000 + index,
      drone_id: 5,
      time: point.timestamp,
      latitude: point.lat,
      longitude: point.lng,
      altitude: 50.0 + Math.random() * 12,
      speed: 22.5 + Math.random() * 6,
      receiver_type: 'RF-3000',
      system_id: 3
    })),
    
    // Drone 6 - Patrol in Burgas
    ...drone6Trajectory.map((point, index) => ({
      id: 6000 + index,
      drone_id: 6,
      time: point.timestamp,
      latitude: point.lat,
      longitude: point.lng,
      altitude: 110.5 + Math.random() * 18,
      speed: 32.8 + Math.random() * 9,
      receiver_type: 'RF-2000',
      system_id: 3
    }))
  ]
}

// ============================================================================
// MOCK RF DETECTIONS
// Only create detections for drones within receiver range (3km)
// ============================================================================

export const mockRFDetections = () => {
  const detections = []
  const DETECTION_RANGE_KM = 3.0 // 3km detection range
  
  // Receiver positions (must match mockGpsUnitPositions)
  const receivers = [
    { lat: 42.6927, lng: 23.3169, system_id: 1, name: 'RF Receiver Sofia-1' }, // Near Sofia center
    { lat: 42.6855, lng: 23.4075, system_id: 1, name: 'RF Receiver Airport' }, // Near airport
    { lat: 42.1304, lng: 24.7403, system_id: 2, name: 'RF Receiver Plovdiv' }, // Near Plovdiv
    { lat: 43.2141, lng: 27.9147, system_id: 3, name: 'RF Receiver Varna' }, // Near Varna
    { lat: 42.5048, lng: 27.4626, system_id: 3, name: 'RF Receiver Burgas' }  // Near Burgas
  ]
  
  // Get drone positions from trajectory
  const drone1Trajectory = generateTrajectory(42.6877, 23.3119, 42.7077, 23.3319, 20)
  const drone2Trajectory = generateTrajectory(42.6805, 23.4025, 42.7005, 23.4225, 18)
  const drone3Trajectory = generateTrajectory(42.1254, 24.7353, 42.1454, 24.7553, 12)
  const drone4Trajectory = generateTrajectory(42.7027, 23.3419, 42.6827, 23.3519, 15)
  const drone5Trajectory = generateTrajectory(43.2041, 27.9047, 43.2241, 27.9247, 14)
  const drone6Trajectory = generateTrajectory(42.4948, 27.4526, 42.5148, 27.4726, 16)
  
  // Helper to check if drone position is within range of any receiver
  const isWithinRange = (droneLat: number, droneLng: number, systemId: number): boolean => {
    return receivers.some(receiver => {
      if (receiver.system_id !== systemId) return false
      const distance = calculateDistanceKm(droneLat, droneLng, receiver.lat, receiver.lng)
      return distance <= DETECTION_RANGE_KM
    })
  }
  
  // Detections for Drone 1 (Sofia delivery) - only when within range of Sofia receiver
  let detectionCount1 = 0
  drone1Trajectory.forEach((point, index) => {
    if (isWithinRange(point.lat, point.lng, 1) && detectionCount1 < 8) {
      detections.push({
        id: 100 + detectionCount1,
        time: point.timestamp,
        detection_status: true,
        signal_strength: -65.5 + Math.random() * 10,
        frequency: 2400.0 + Math.random() * 100,
        drone_id: 1,
        system_id: 1
      })
      detectionCount1++
    }
  })
  
  // Detections for Drone 2 (Airport patrol) - only when within range of Airport receiver
  let detectionCount2 = 0
  drone2Trajectory.forEach((point, index) => {
    if (isWithinRange(point.lat, point.lng, 1) && detectionCount2 < 6) {
      detections.push({
        id: 200 + detectionCount2,
        time: point.timestamp,
        detection_status: true,
        signal_strength: -72.3 + Math.random() * 8,
        frequency: 2450.0 + Math.random() * 50,
        drone_id: 2,
        system_id: 1
      })
      detectionCount2++
    }
  })
  
  // Detections for Drone 3 (Plovdiv surveillance) - only when within range of Plovdiv receiver
  let detectionCount3 = 0
  drone3Trajectory.forEach((point, index) => {
    if (isWithinRange(point.lat, point.lng, 2) && detectionCount3 < 5) {
      detections.push({
        id: 300 + detectionCount3,
        time: point.timestamp,
        detection_status: true,
        signal_strength: -68.1 + Math.random() * 12,
        frequency: 2500.0 + Math.random() * 80,
        drone_id: 3,
        system_id: 2
      })
      detectionCount3++
    }
  })
  
  // Detections for Drone 4 (Sofia emergency) - only when within range of Sofia receiver
  let detectionCount4 = 0
  drone4Trajectory.forEach((point, index) => {
    if (isWithinRange(point.lat, point.lng, 1) && detectionCount4 < 7) {
      detections.push({
        id: 400 + detectionCount4,
        time: point.timestamp,
        detection_status: true,
        signal_strength: -70.2 + Math.random() * 9,
        frequency: 2420.0 + Math.random() * 90,
        drone_id: 4,
        system_id: 1
      })
      detectionCount4++
    }
  })
  
  // Detections for Drone 5 (Varna delivery) - only when within range of Varna receiver
  let detectionCount5 = 0
  drone5Trajectory.forEach((point, index) => {
    if (isWithinRange(point.lat, point.lng, 3) && detectionCount5 < 6) {
      detections.push({
        id: 500 + detectionCount5,
        time: point.timestamp,
        detection_status: true,
        signal_strength: -66.8 + Math.random() * 11,
        frequency: 2380.0 + Math.random() * 95,
        drone_id: 5,
        system_id: 3
      })
      detectionCount5++
    }
  })
  
  // Detections for Drone 6 (Burgas patrol) - only when within range of Burgas receiver
  let detectionCount6 = 0
  drone6Trajectory.forEach((point, index) => {
    if (isWithinRange(point.lat, point.lng, 3) && detectionCount6 < 7) {
      detections.push({
        id: 600 + detectionCount6,
        time: point.timestamp,
        detection_status: true,
        signal_strength: -71.5 + Math.random() * 10,
        frequency: 2480.0 + Math.random() * 70,
        drone_id: 6,
        system_id: 3
      })
      detectionCount6++
    }
  })
  
  return detections
}

// ============================================================================
// MOCK OPERATOR POSITIONS
// ============================================================================

export const mockOperatorPositions = () => {
  return [
    {
      id: 1,
      drone_id: 1,
      time: getTimestamp(0.5),
      latitude: 42.6877,
      longitude: 23.3119,
      system_id: 1
    },
    {
      id: 2,
      drone_id: 2,
      time: getTimestamp(0.3),
      latitude: 42.6805,
      longitude: 23.4025,
      system_id: 1
    },
    {
      id: 3,
      drone_id: 3,
      time: getTimestamp(0.2),
      latitude: 42.1254,
      longitude: 24.7353,
      system_id: 2
    },
    {
      id: 4,
      drone_id: 4,
      time: getTimestamp(0.4),
      latitude: 42.7027,
      longitude: 23.3419,
      system_id: 1
    },
    {
      id: 5,
      drone_id: 5,
      time: getTimestamp(0.25),
      latitude: 43.2041,
      longitude: 27.9047,
      system_id: 3
    },
    {
      id: 6,
      drone_id: 6,
      time: getTimestamp(0.15),
      latitude: 42.4948,
      longitude: 27.4526,
      system_id: 3
    }
  ]
}

// ============================================================================
// MOCK GPS UNIT POSITIONS (Detection Sources/Receivers)
// ============================================================================

export const mockGpsUnitPositions = () => {
  return [
    {
      id: 1,
      unit_id: 101,
      system_id: 1,
      name: 'RF Receiver Sofia-1',
      status: 'active',
      time: getTimestamp(0.1),
      latitude: 42.6927, // Near Sofia center, slightly offset
      longitude: 23.3169
    },
    {
      id: 2,
      unit_id: 102,
      system_id: 1,
      name: 'RF Receiver Airport',
      status: 'active',
      time: getTimestamp(0.1),
      latitude: 42.6855, // Near airport, slightly offset
      longitude: 23.4075
    },
    {
      id: 3,
      unit_id: 103,
      system_id: 2,
      name: 'RF Receiver Plovdiv',
      status: 'active',
      time: getTimestamp(0.1),
      latitude: 42.1304, // Near Plovdiv center
      longitude: 24.7403
    },
    {
      id: 4,
      unit_id: 104,
      system_id: 3,
      name: 'RF Receiver Varna',
      status: 'active',
      time: getTimestamp(0.1),
      latitude: 43.2141, // Near Varna center
      longitude: 27.9147
    },
    {
      id: 5,
      unit_id: 105,
      system_id: 3,
      name: 'RF Receiver Burgas',
      status: 'active',
      time: getTimestamp(0.1),
      latitude: 42.5048, // Near Burgas center
      longitude: 27.4626
    }
  ]
}

// ============================================================================
// MOCK DRONES (for reference)
// ============================================================================

export const mockDrones = () => {
  return [
    {
      id: 1,
      mac_address: 'AA:BB:CC:DD:EE:01',
      serial_number: 'DRN-2024-001',
      uas_id: 'BG-DEL-001',
      first_seen: getTimestamp(24),
      last_seen: getTimestamp(0),
      is_active: true
    },
    {
      id: 2,
      mac_address: 'AA:BB:CC:DD:EE:02',
      serial_number: 'DRN-2024-002',
      uas_id: 'BG-PAT-002',
      first_seen: getTimestamp(18),
      last_seen: getTimestamp(0),
      is_active: true
    },
    {
      id: 3,
      mac_address: 'AA:BB:CC:DD:EE:03',
      serial_number: 'DRN-2024-003',
      uas_id: 'BG-SUR-003',
      first_seen: getTimestamp(12),
      last_seen: getTimestamp(0),
      is_active: true
    },
    {
      id: 4,
      mac_address: 'AA:BB:CC:DD:EE:04',
      serial_number: 'DRN-2024-004',
      uas_id: 'BG-EMR-004',
      first_seen: getTimestamp(15),
      last_seen: getTimestamp(0),
      is_active: true
    },
    {
      id: 5,
      mac_address: 'AA:BB:CC:DD:EE:05',
      serial_number: 'DRN-2024-005',
      uas_id: 'BG-DEL-005',
      first_seen: getTimestamp(14),
      last_seen: getTimestamp(0),
      is_active: true
    },
    {
      id: 6,
      mac_address: 'AA:BB:CC:DD:EE:06',
      serial_number: 'DRN-2024-006',
      uas_id: 'BG-PAT-006',
      first_seen: getTimestamp(16),
      last_seen: getTimestamp(0),
      is_active: true
    }
  ]
}

// ============================================================================
// MOCK RECEIVER LOGS
// ============================================================================

export const mockReceiverLogs = () => {
  return [
    {
      id: 1,
      receiver_type: 'RF-3000',
      status: 'operational',
      time: getTimestamp(0.1),
      message: 'System operational - all sensors active'
    },
    {
      id: 2,
      receiver_type: 'RF-2000',
      status: 'operational',
      time: getTimestamp(0.2),
      message: 'System operational - normal operation'
    },
    {
      id: 3,
      receiver_type: 'RF-3000',
      status: 'operational',
      time: getTimestamp(0.15),
      message: 'System operational - coastal monitoring active'
    }
  ]
}


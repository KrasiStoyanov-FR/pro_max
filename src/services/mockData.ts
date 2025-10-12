import type { MapPin } from '@/types/map'

export const mockPins: MapPin[] = [
  {
    id: '1',
    lat: 40.7128,
    lng: -74.0060,
    title: 'New York Radar Station',
    description: 'Primary radar station covering the northeastern region',
    type: 'radar',
    status: 'active',
    priority: 'high',
    data: {
      frequency: '2.4 GHz',
      range: '250 km',
      altitude: '150 m',
      lastUpdate: new Date().toISOString(),
      operator: 'John Smith',
      maintenance: 'Scheduled for next month'
    },
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    lat: 34.0522,
    lng: -118.2437,
    title: 'Los Angeles Target',
    description: 'Unidentified target detected in restricted airspace',
    type: 'target',
    status: 'warning',
    priority: 'medium',
    data: {
      speed: '450 km/h',
      altitude: '8000 m',
      heading: '045°',
      lastUpdate: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      confidence: '75%'
    },
    timestamp: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: '3',
    lat: 41.8781,
    lng: -87.6298,
    title: 'Chicago Threat',
    description: 'High-priority threat requiring immediate attention',
    type: 'threat',
    status: 'critical',
    priority: 'critical',
    data: {
      threatLevel: 'HIGH',
      classification: 'Hostile',
      estimatedArrival: '15 minutes',
      lastUpdate: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      responseTeam: 'Alpha-7'
    },
    timestamp: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: '4',
    lat: 29.7604,
    lng: -95.3698,
    title: 'Houston Friendly Unit',
    description: 'Friendly military unit on routine patrol',
    type: 'friendly',
    status: 'active',
    priority: 'low',
    data: {
      unit: 'Delta-3',
      mission: 'Patrol',
      lastUpdate: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      contact: 'Lt. Johnson'
    },
    timestamp: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: '5',
    lat: 33.4484,
    lng: -112.0740,
    title: 'Phoenix Radar Station',
    description: 'Secondary radar station covering the southwestern region',
    type: 'radar',
    status: 'active',
    priority: 'medium',
    data: {
      frequency: '2.8 GHz',
      range: '200 km',
      altitude: '120 m',
      lastUpdate: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
      operator: 'Sarah Wilson',
      maintenance: 'Up to date'
    },
    timestamp: new Date(Date.now() - 180000).toISOString()
  },
  {
    id: '6',
    lat: 25.7617,
    lng: -80.1918,
    title: 'Miami Unknown Contact',
    description: 'Unidentified contact with unusual flight pattern',
    type: 'unknown',
    status: 'warning',
    priority: 'medium',
    data: {
      pattern: 'Erratic',
      altitude: '5000 m',
      speed: '300 km/h',
      lastUpdate: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
      investigation: 'In progress'
    },
    timestamp: new Date(Date.now() - 240000).toISOString()
  },
  {
    id: '7',
    lat: 47.6062,
    lng: -122.3321,
    title: 'Seattle Radar Station',
    description: 'Coastal radar station monitoring Pacific approaches',
    type: 'radar',
    status: 'active',
    priority: 'high',
    data: {
      frequency: '3.2 GHz',
      range: '300 km',
      altitude: '200 m',
      lastUpdate: new Date(Date.now() - 90000).toISOString(), // 1.5 minutes ago
      operator: 'Mike Chen',
      maintenance: 'Due next week'
    },
    timestamp: new Date(Date.now() - 90000).toISOString()
  },
  {
    id: '8',
    lat: 39.9526,
    lng: -75.1652,
    title: 'Philadelphia Target',
    description: 'Commercial aircraft deviating from flight plan',
    type: 'target',
    status: 'warning',
    priority: 'low',
    data: {
      aircraft: 'Boeing 737',
      flightNumber: 'AA1234',
      deviation: '5 km from route',
      lastUpdate: new Date(Date.now() - 150000).toISOString(), // 2.5 minutes ago
      contact: 'Air Traffic Control'
    },
    timestamp: new Date(Date.now() - 150000).toISOString()
  },
  {
    id: '9',
    lat: 32.7767,
    lng: -96.7970,
    title: 'Dallas Threat',
    description: 'Potential threat approaching from the south',
    type: 'threat',
    status: 'critical',
    priority: 'high',
    data: {
      threatLevel: 'MEDIUM',
      classification: 'Suspicious',
      estimatedArrival: '25 minutes',
      lastUpdate: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
      responseTeam: 'Bravo-2'
    },
    timestamp: new Date(Date.now() - 30000).toISOString()
  },
  {
    id: '10',
    lat: 36.1627,
    lng: -86.7816,
    title: 'Nashville Friendly Unit',
    description: 'Search and rescue unit on training exercise',
    type: 'friendly',
    status: 'active',
    priority: 'low',
    data: {
      unit: 'Echo-5',
      mission: 'Training',
      lastUpdate: new Date(Date.now() - 210000).toISOString(), // 3.5 minutes ago
      contact: 'Capt. Davis'
    },
    timestamp: new Date(Date.now() - 210000).toISOString()
  }
]

export const mockPinTypes = ['radar', 'target', 'threat', 'friendly', 'unknown'] as const
export const mockStatuses = ['active', 'inactive', 'warning', 'critical'] as const
export const mockPriorities = ['low', 'medium', 'high', 'critical'] as const

// Helper function to generate random pins for testing
export const generateRandomPins = (count: number): MapPin[] => {
  const pins: MapPin[] = []
  
  for (let i = 0; i < count; i++) {
    const lat = 25 + Math.random() * 25 // 25-50 latitude (US range)
    const lng = -125 + Math.random() * 50 // -125 to -75 longitude (US range)
    
    pins.push({
      id: `random-${i + 1}`,
      lat,
      lng,
      title: `Random Target ${i + 1}`,
      description: `Generated test target ${i + 1}`,
      type: mockPinTypes[Math.floor(Math.random() * mockPinTypes.length)],
      status: mockStatuses[Math.floor(Math.random() * mockStatuses.length)],
      priority: mockPriorities[Math.floor(Math.random() * mockPriorities.length)],
      data: {
        generated: true,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })
  }
  
  return pins
}



import type { MapPin } from '@/types/map'

export const mockPins: MapPin[] = [
  {
    id: '1',
    lat: 42.6977,
    lng: 23.3219,
    title: 'Sofia Central Radar Station',
    description: 'Primary radar station covering Sofia metropolitan area',
    type: 'radar',
    status: 'active',
    priority: 'high',
    data: {
      frequency: '2.4 GHz',
      range: '250 km',
      altitude: '150 m',
      lastUpdate: new Date().toISOString(),
      operator: 'Ivan Petrov',
      maintenance: 'Scheduled for next month'
    },
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    lat: 42.6825,
    lng: 23.2925,
    title: 'Sofia West Target',
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
    lat: 42.7125,
    lng: 23.3225,
    title: 'Sofia North Threat',
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
    lat: 42.6875,
    lng: 23.3725,
    title: 'Sofia East Friendly Unit',
    description: 'Friendly military unit on routine patrol',
    type: 'friendly',
    status: 'active',
    priority: 'low',
    data: {
      unit: 'Delta-3',
      mission: 'Patrol',
      lastUpdate: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      contact: 'Lt. Ivanov'
    },
    timestamp: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: '5',
    lat: 42.6625,
    lng: 23.3225,
    title: 'Sofia South Radar Station',
    description: 'Secondary radar station covering the southern region',
    type: 'radar',
    status: 'active',
    priority: 'medium',
    data: {
      frequency: '2.8 GHz',
      range: '200 km',
      altitude: '120 m',
      lastUpdate: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
      operator: 'Maria Georgieva',
      maintenance: 'Up to date'
    },
    timestamp: new Date(Date.now() - 180000).toISOString()
  },
  {
    id: '6',
    lat: 42.7225,
    lng: 23.3925,
    title: 'Sofia North Unknown Contact',
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
    lat: 42.6525,
    lng: 23.2525,
    title: 'Sofia Southwest Radar Station',
    description: 'Mountain radar station monitoring western approaches',
    type: 'radar',
    status: 'active',
    priority: 'high',
    data: {
      frequency: '3.2 GHz',
      range: '300 km',
      altitude: '200 m',
      lastUpdate: new Date(Date.now() - 90000).toISOString(), // 1.5 minutes ago
      operator: 'Dimitar Petrov',
      maintenance: 'Due next week'
    },
    timestamp: new Date(Date.now() - 90000).toISOString()
  },
  {
    id: '8',
    lat: 42.6725,
    lng: 23.3525,
    title: 'Sofia Southeast Target',
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
    lat: 42.6425,
    lng: 23.2725,
    title: 'Sofia Southwest Threat',
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
    lat: 42.7025,
    lng: 23.3025,
    title: 'Sofia Central Friendly Unit',
    description: 'Search and rescue unit on training exercise',
    type: 'friendly',
    status: 'active',
    priority: 'low',
    data: {
      unit: 'Echo-5',
      mission: 'Training',
      lastUpdate: new Date(Date.now() - 210000).toISOString(), // 3.5 minutes ago
      contact: 'Capt. Dimitrov'
    },
    timestamp: new Date(Date.now() - 210000).toISOString()
  },
  {
    id: 'drone-1',
    lat: 42.6977,
    lng: 23.3219,
    title: 'DJI Avata 2 - Sofia Center',
    description: 'Commercial delivery drone operating in city center',
    type: 'drone',
    status: 'active',
    priority: 'medium',
    data: {
      model: 'DJI Avata 2',
      operator: 'Sofia Delivery Co.',
      mission: 'Package Delivery',
      altitude: '120 m',
      speed: '45 km/h',
      battery: '78%',
      flightTime: '12 minutes',
      payload: '2.5 kg package',
      destination: 'City Center Office',
      lastUpdate: new Date(Date.now() - 30000).toISOString(),
      pilot: 'Alex Petrov',
      zone: 'sofia-center-delivery'
    },
    timestamp: new Date(Date.now() - 30000).toISOString()
  },
  {
    id: 'drone-2',
    lat: 42.6825,
    lng: 23.2925,
    title: 'Police Surveillance Drone',
    description: 'Police surveillance drone on patrol',
    type: 'drone',
    status: 'active',
    priority: 'high',
    data: {
      model: 'DJI Matrice 30T',
      operator: 'Sofia Police Department',
      mission: 'Surveillance Patrol',
      altitude: '80 m',
      speed: '25 km/h',
      battery: '65%',
      flightTime: '18 minutes',
      payload: 'Thermal Camera',
      area: 'West District',
      lastUpdate: new Date(Date.now() - 45000).toISOString(),
      pilot: 'Officer Georgiev',
      zone: 'sofia-west-surveillance'
    },
    timestamp: new Date(Date.now() - 45000).toISOString()
  },
  {
    id: 'drone-3',
    lat: 42.7125,
    lng: 23.3225,
    title: 'Emergency Response Drone',
    description: 'Medical emergency response drone',
    type: 'drone',
    status: 'active',
    priority: 'critical',
    data: {
      model: 'DJI Mavic 3 Enterprise',
      operator: 'Sofia Emergency Services',
      mission: 'Medical Transport',
      altitude: '150 m',
      speed: '60 km/h',
      battery: '45%',
      flightTime: '8 minutes',
      payload: 'Medical Supplies',
      destination: 'Emergency Hospital',
      lastUpdate: new Date(Date.now() - 15000).toISOString(),
      pilot: 'Dr. Maria Ivanova',
      zone: 'sofia-emergency'
    },
    timestamp: new Date(Date.now() - 15000).toISOString()
  },
  {
    id: 'drone-4',
    lat: 42.6875,
    lng: 23.3725,
    title: 'Logistics Drone - East Zone',
    description: 'Commercial logistics drone in east delivery zone',
    type: 'drone',
    status: 'active',
    priority: 'medium',
    data: {
      model: 'DJI Agras T40',
      operator: 'Bulgaria Logistics',
      mission: 'Cargo Transport',
      altitude: '100 m',
      speed: '35 km/h',
      battery: '82%',
      flightTime: '25 minutes',
      payload: '5.0 kg cargo',
      destination: 'Industrial District',
      lastUpdate: new Date(Date.now() - 60000).toISOString(),
      pilot: 'Nikolay Dimitrov',
      zone: 'sofia-east-delivery'
    },
    timestamp: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: 'drone-5',
    lat: 42.6625,
    lng: 23.3225,
    title: 'Training Drone - South Zone',
    description: 'Student pilot training drone',
    type: 'drone',
    status: 'active',
    priority: 'low',
    data: {
      model: 'DJI Mini 3 Pro',
      operator: 'Sofia Flight Academy',
      mission: 'Pilot Training',
      altitude: '50 m',
      speed: '15 km/h',
      battery: '90%',
      flightTime: '30 minutes',
      payload: 'Training Module',
      exercise: 'Basic Maneuvers',
      lastUpdate: new Date(Date.now() - 120000).toISOString(),
      pilot: 'Student - Anna Petrova',
      instructor: 'Capt. Stefanov',
      zone: 'sofia-south-training'
    },
    timestamp: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: 'drone-6',
    lat: 42.7225,
    lng: 23.3925,
    title: 'Border Patrol Drone',
    description: 'Border security patrol drone',
    type: 'drone',
    status: 'active',
    priority: 'high',
    data: {
      model: 'DJI Matrice 300 RTK',
      operator: 'Border Security',
      mission: 'Border Patrol',
      altitude: '200 m',
      speed: '40 km/h',
      battery: '58%',
      flightTime: '15 minutes',
      payload: 'Multi-sensor Array',
      sector: 'Northern Border',
      lastUpdate: new Date(Date.now() - 90000).toISOString(),
      pilot: 'Officer Borisov',
      zone: 'sofia-border-patrol'
    },
    timestamp: new Date(Date.now() - 90000).toISOString()
  }
]

export const mockPinTypes = ['radar', 'target', 'threat', 'friendly', 'unknown', 'drone'] as const
export const mockStatuses = ['active', 'inactive', 'warning', 'critical'] as const
export const mockPriorities = ['low', 'medium', 'high', 'critical'] as const

// Helper function to generate random pins for testing
export const generateRandomPins = (count: number): MapPin[] => {
  const pins: MapPin[] = []
  
  for (let i = 0; i < count; i++) {
    const lat = 42.4 + Math.random() * 0.6 // 42.4-43.0 latitude (Sofia region)
    const lng = 23.0 + Math.random() * 0.8 // 23.0-23.8 longitude (Sofia region)
    
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



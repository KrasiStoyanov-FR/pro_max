import type { RestrictedZone } from '@/types/map'

export interface DroneZone extends RestrictedZone {
  type: 'patrol' | 'delivery' | 'restricted' | 'emergency' | 'training' | 'surveillance'
  opacity: number
  fillOpacity: number
  active: boolean
}

// Define drone operation zones in Sofia, Bulgaria
export const droneZones: DroneZone[] = [
  {
    id: 'sofia-center-delivery',
    name: 'Sofia City Center Delivery Zone',
    type: 'delivery',
    radius: 2000, // 2km radius
    color: '#3b82f6', // Blue for delivery
    center: [42.6977, 23.3219],
    opacity: 0.8,
    fillOpacity: 0.15,
    active: true,
    description: 'Commercial delivery drone operations in city center'
  },
  {
    id: 'sofia-west-surveillance',
    name: 'Sofia West Surveillance Zone',
    type: 'surveillance',
    radius: 1500, // 1.5km radius
    color: '#8b5cf6', // Purple for surveillance
    center: [42.6825, 23.2925],
    opacity: 0.8,
    fillOpacity: 0.15,
    active: true,
    description: 'Police surveillance drone patrol area'
  },
  {
    id: 'sofia-parliament-restricted',
    name: 'Sofia Parliament No-Fly Zone',
    type: 'restricted',
    radius: 500, // 500m radius
    color: '#ef4444', // Red for restricted
    center: [42.6945, 23.334],
    opacity: 0.9,
    fillOpacity: 0.25,
    active: true,
    description: 'Restricted airspace - Government buildings'
  },
  {
    id: 'sofia-airport-restricted',
    name: 'Sofia Airport No-Fly Zone',
    type: 'restricted',
    radius: 3000, // 3km radius
    color: '#ef4444', // Red for restricted
    center: [42.6905, 23.4125],
    opacity: 0.9,
    fillOpacity: 0.25,
    active: true,
    description: 'Sofia Airport - Restricted airspace'
  },
  {
    id: 'sofia-north-patrol',
    name: 'Sofia North Police Patrol Zone',
    type: 'patrol',
    radius: 1800, // 1.8km radius
    color: '#22c55e', // Green for patrol
    center: [42.7125, 23.3225],
    opacity: 0.8,
    fillOpacity: 0.15,
    active: true,
    description: 'Active police drone patrol area'
  },
  {
    id: 'sofia-emergency',
    name: 'Sofia Emergency Response Zone',
    type: 'emergency',
    radius: 1200, // 1.2km radius
    color: '#f59e0b', // Orange for emergency
    center: [42.6775, 23.3525],
    opacity: 0.8,
    fillOpacity: 0.2,
    active: true,
    description: 'Emergency medical drone operations'
  },
  {
    id: 'sofia-east-delivery',
    name: 'Sofia East Logistics Zone',
    type: 'delivery',
    radius: 2500, // 2.5km radius
    color: '#3b82f6', // Blue for delivery
    center: [42.6875, 23.3725],
    opacity: 0.8,
    fillOpacity: 0.15,
    active: true,
    description: 'Commercial package delivery operations'
  },
  {
    id: 'sofia-south-training',
    name: 'Sofia South Training Zone',
    type: 'training',
    radius: 1000, // 1km radius
    color: '#06b6d4', // Cyan for training
    center: [42.6625, 23.3225],
    opacity: 0.8,
    fillOpacity: 0.15,
    active: true,
    description: 'Drone pilot training and testing area'
  },
  {
    id: 'sofia-vitosha-restricted',
    name: 'Vitosha Mountain Protected Zone',
    type: 'restricted',
    radius: 4000, // 4km radius
    color: '#ef4444', // Red for restricted
    center: [42.6475, 23.2625],
    opacity: 0.9,
    fillOpacity: 0.25,
    active: true,
    description: 'Protected natural area - No fly zone'
  },
  {
    id: 'sofia-medical',
    name: 'Sofia Medical Transport Zone',
    type: 'emergency',
    radius: 800, // 800m radius
    color: '#f59e0b', // Orange for emergency
    center: [42.7005, 23.3575],
    opacity: 0.8,
    fillOpacity: 0.2,
    active: true,
    description: 'Medical supply and organ transport corridor'
  },
  {
    id: 'sofia-border-patrol',
    name: 'Sofia Border Patrol Zone',
    type: 'patrol',
    radius: 2200, // 2.2km radius
    color: '#22c55e', // Green for patrol
    center: [42.7225, 23.3925],
    opacity: 0.8,
    fillOpacity: 0.15,
    active: true,
    description: 'Border security drone patrol area'
  },
  {
    id: 'sofia-mountain-rescue',
    name: 'Sofia Mountain Rescue Zone',
    type: 'emergency',
    radius: 1500, // 1.5km radius
    color: '#f59e0b', // Orange for emergency
    center: [42.6275, 23.2775],
    opacity: 0.8,
    fillOpacity: 0.2,
    active: true,
    description: 'Mountain search and rescue operations'
  }
]

// Helper function to get zone color based on type
export function getZoneColorByType(type: DroneZone['type']): string {
  const colorMap = {
    patrol: '#22c55e',      // Green
    delivery: '#3b82f6',    // Blue
    restricted: '#ef4444',  // Red
    emergency: '#f59e0b',   // Orange
    training: '#06b6d4',    // Cyan
    surveillance: '#8b5cf6' // Purple
  }
  return colorMap[type]
}

// Helper function to get zone by ID
export function getZoneById(id: string): DroneZone | undefined {
  return droneZones.find(zone => zone.id === id)
}

// Helper function to get zones by type
export function getZonesByType(type: DroneZone['type']): DroneZone[] {
  return droneZones.filter(zone => zone.type === type)
}

// Helper function to get active zones
export function getActiveZones(): DroneZone[] {
  return droneZones.filter(zone => zone.active)
}



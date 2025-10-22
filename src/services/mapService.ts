import L from 'leaflet'
import type { MapPin, MapViewport, MapControl } from '@/types/map'
import { getActiveZones, type DroneZone } from './droneZones'

// Clustering configuration
const CLUSTER_CONFIG = {
  maxClusterRadius: 50, // pixels - even tighter clustering
  minClusterDistance: 200, // pixels - much larger minimum distance between clusters
  minZoom: 8, // minimum zoom level for clustering
  maxZoom: 14, // maximum zoom level for clustering (reduced to ensure individual pins show at zoom 15+)
  clusterIconSize: 40,
  zoomIncrement: 3, // more zoom levels to better isolate cluster
  minPinsForCluster: 3 // minimum pins required to form a cluster
}

// Clustering state
let isClusteringActive = false
const expandedClusters = new Set<string>() // Track expanded clusters to prevent re-clustering

// Clustering types
export interface PinCluster {
  id: string
  center: [number, number]
  pins: MapPin[]
  bounds: L.LatLngBounds
  marker: any
}

export interface ClusterClickCallback {
  (cluster: PinCluster): void
}

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export interface MapServiceOptions {
  center: [number, number]
  zoom: number
  maxZoom?: number
  minZoom?: number
  attribution?: string
}

export interface PinClickCallback {
  (pin: MapPin): void
}

class MapService {
  private map: L.Map | null = null
  private markers: Map<string, L.Marker> = new Map()
  private controls: Map<string, L.Control> = new Map()
  private onPinClickCallback: PinClickCallback | null = null
  private onClusterClickCallback: ClusterClickCallback | null = null
  private currentTileLayer: L.TileLayer | null = null
  private currentLayerType: 'dark' | 'light' | 'satellite' = 'satellite'
  private clusters: Map<string, PinCluster> = new Map()
  private allPins: MapPin[] = []
  private highlightMarker: L.Marker | null = null

  async init(container: HTMLElement, options: MapServiceOptions): Promise<L.Map> {
    // Lazy load Leaflet to enable code-splitting
    if (!this.map) {
      this.map = L.map(container, {
        center: options.center,
        zoom: options.zoom,
        maxZoom: options.maxZoom || 18,
        minZoom: options.minZoom || 1,
        zoomControl: false, // We'll add custom controls
        attributionControl: false, // Remove attribution control
      })

      // Add initial tile layer
      this.setTileLayer('satellite')

      // Add zoom change handler for re-clustering with debouncing
      let zoomTimeout: NodeJS.Timeout
      this.map.on('zoom', () => {
        // Clear existing timeout
        if (zoomTimeout) {
          clearTimeout(zoomTimeout)
        }
        
        // Debounce the clustering to avoid too many updates during zoom
        zoomTimeout = setTimeout(() => {
          const currentZoom = this.map!.getZoom()
          // Clear expanded clusters if zoomed out significantly
          if (currentZoom < CLUSTER_CONFIG.minZoom + 2) {
            this.clearExpandedClusters()
          }
          this.applyClustering()
        }, 150) // 150ms debounce
      })
    }

    return this.map
  }

  private addZoomControl() {
    if (!this.map) return

    const zoomControl = (L as any).control({ position: 'bottomright' })
    
    zoomControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-control')
      div.innerHTML = `
        <div class="flex flex-col space-y-1">
          <button class="map-control-button" data-action="zoom-in" title="Zoom In">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
          <button class="map-control-button" data-action="zoom-out" title="Zoom Out">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path>
            </svg>
          </button>
        </div>
      `
      
      // Add event listeners
      div.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const action = target.closest('[data-action]')?.getAttribute('data-action')
        
        if (action === 'zoom-in' && this.map) {
          this.map.zoomIn()
        } else if (action === 'zoom-out' && this.map) {
          this.map.zoomOut()
        }
      })
      
      return div
    }
    
    zoomControl.addTo(this.map)
    this.controls.set('zoom', zoomControl)
  }

  addPins(pins: MapPin[]): void {
    if (!this.map) return

    // Store all pins for clustering
    this.allPins = pins

    // Apply clustering based on zoom level (this will clear and redraw everything)
    this.applyClustering()

    // Add drone operation zones
    this.addDroneZones()
  }

  highlightSelectedPin(selectedPin: MapPin | null): void {
    if (!this.map) return

    console.log('Highlighting selected pin:', selectedPin?.id, selectedPin?.title)
    
    // Remove any existing highlight marker
    this.clearHighlightMarker()
    
    if (selectedPin) {
      // Create a large, bright highlight marker
      const highlightIcon = L.divIcon({
        className: 'highlight-marker',
        html: `
          <div style="
            width: 40px; 
            height: 40px; 
            background: #ff0000; 
            border: 4px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
            animation: pulse 1s infinite;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 16px;
          ">
            ★
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
      
      // Create the highlight marker
      this.highlightMarker = L.marker([selectedPin.lat, selectedPin.lng], {
        icon: highlightIcon,
        zIndexOffset: 1000 // Make sure it's on top
      })
      
      // Add to map
      this.highlightMarker.addTo(this.map)
      
      console.log('Added highlight marker for pin:', selectedPin.id)
      
      // Force individual pins to be shown with fade effect
      this.forceShowIndividualPins(selectedPin)
    } else {
      // If selectedPin is null, clear the fade effect
      this.clearFadeEffect()
    }
  }

  private clearHighlightMarker(): void {
    if (this.highlightMarker && this.map) {
      this.map.removeLayer(this.highlightMarker)
      this.highlightMarker = null
      
      // Restore all markers to full opacity
      this.clearFadeEffect()
    }
  }

  // Public method to clear highlight marker (called from outside)
  public clearHighlight(): void {
    this.clearHighlightMarker()
  }

  private forceShowIndividualPins(selectedPin: MapPin): void {
    console.log('Force showing individual pins with fade effect for:', selectedPin.id)
    console.log('Existing markers count:', this.markers.size)
    
    // If no markers exist, we need to create them first
    if (this.markers.size === 0) {
      console.log('No existing markers, creating individual pins')
      this.showIndividualPins(selectedPin)
      return
    }
    
    // Clear clusters but keep markers
    this.clearClusters()
    
    // Apply fade effect to existing markers
    this.markers.forEach((marker, pinId) => {
      const isSelected = selectedPin?.id === pinId
      const isFaded = selectedPin !== null && !isSelected
      console.log(`Processing existing marker ${pinId}: isSelected=${isSelected}, isFaded=${isFaded}`)
      
      if (isFaded) {
        console.log(`Fading existing marker ${pinId}`)
        // Add a small delay to ensure the marker is fully rendered
        setTimeout(() => {
          this.fadeMarker(marker)
        }, 50)
      } else {
        console.log(`Brightening selected marker ${pinId}`)
        this.brightenMarker(marker)
      }
    })
  }

  private applyFadeEffect(selectedPin: MapPin): void {
    console.log('Applying fade effect, selected pin:', selectedPin.id)
    console.log('Total markers available:', this.markers.size)
    
    // Since markers are already created with fade effect in showIndividualPins,
    // we don't need to apply additional fade effect here
    console.log('Markers already have fade effect applied in showIndividualPins')
  }

  private clearFadeEffect(): void {
    console.log('Clearing fade effect')
    
    // Restore all markers to full opacity
    this.markers.forEach((marker) => {
      this.brightenMarker(marker)
    })
  }

  private brightenMarker(marker: L.Marker): void {
    const element = marker.getElement()
    if (element) {
      element.style.opacity = '1'
      ;(marker as any).isFaded = false
    }
  }

  private fadeMarker(marker: L.Marker): void {
    const element = marker.getElement()
    console.log('fadeMarker called, element found:', !!element)
    if (element) {
      console.log('Setting opacity to 0.5 for marker')
      element.style.opacity = '0.5'
      ;(marker as any).isFaded = true
      
      // Add hover effects
      element.addEventListener('mouseenter', () => {
        this.brightenMarker(marker)
      })
      element.addEventListener('mouseleave', () => {
        if ((marker as any).isFaded) {
          this.fadeMarker(marker)
        }
      })
    } else {
      console.log('No element found for marker, cannot fade')
    }
  }

  private clearDroneZones(): void {
    if (!this.map) return
    
    // Remove all existing zone layers
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Circle && (layer as any).options.className?.startsWith('zone-')) {
        this.map!.removeLayer(layer)
      }
    })
  }

  private addDroneZones(): void {
    if (!this.map) return

    // Clear existing zones first to prevent stacking
    this.clearDroneZones()

    const zones = getActiveZones()

    zones.forEach(zone => {
      // Create the highlighted region circle
      const circle = L.circle(zone.center, {
        radius: zone.radius || 1000, // Default to 1km if no radius specified
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: zone.fillOpacity,
        opacity: zone.opacity,
        weight: 2,
        className: `zone-${zone.type}`
      }).addTo(this.map!)

      // Add tooltip to show zone name and description
      circle.bindTooltip(`
        <div class="font-medium">${zone.name}</div>
        <div class="text-xs text-neutral-400 mt-1">${zone.description}</div>
        <div class="text-xs text-neutral-500 mt-1 uppercase">${zone.type}</div>
        <div class="text-xs text-neutral-500 mt-1">Radius: ${(zone.radius || 1000) / 1000}km</div>
      `, {
        permanent: false,
        direction: 'center',
        className: 'zone-tooltip',
        opacity: 0.95
      })

      // Add zone type indicator icon in center (only for restricted/emergency zones)
      if (zone.type === 'restricted' || zone.type === 'emergency') {
        const icon = this.getZoneIcon(zone.type, zone.color)
        L.marker(zone.center, { icon }).addTo(this.map!)
      }
    })
  }

  private getZoneIcon(type: DroneZone['type'], color: string): L.DivIcon {
    const isRestricted = type === 'restricted'
    const bgColor = isRestricted ? 'red' : 'orange'
    
    return L.divIcon({
      className: `zone-icon zone-icon-${type}`,
      html: `
        <div class="flex items-center justify-center w-8 h-8 bg-${bgColor}-500/80 rounded-full backdrop-blur-sm border-2 border-white shadow-lg ${isRestricted ? 'animate-pulse' : ''}">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${isRestricted 
              ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z"></path>'
              : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z"></path>'
            }
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
  }

  private createMarker(pin: MapPin, isSelected: boolean = false, isFaded: boolean = false): L.Marker {
    if (isSelected) {
      console.log('Creating selected marker for pin:', pin.id, pin.title)
    }
    if (isFaded) {
      console.log('Creating faded marker for pin:', pin.id, pin.title)
    }
    
    const marker = L.marker([pin.lat, pin.lng], {
      icon: this.getIconForPinType(pin.type, pin.status, isSelected, isFaded)
    })
    
    // Store fade state on marker for hover effects
    ;(marker as any).isFaded = isFaded

    // Store pin data on marker for easy access
    ;(marker as any).pinData = pin

    // Add popup
    const popupContent = `
      <div class="p-2">
        <h3 class="font-semibold text-sm">${pin.title}</h3>
        <p class="text-xs text-neutral-600">${pin.type} • ${pin.status}</p>
        ${pin.description ? `<p class="text-xs mt-1">${pin.description}</p>` : ''}
      </div>
    `
    marker.bindPopup(popupContent)

    // Add click handler
    marker.on('click', () => {
      if (this.onPinClickCallback) {
        this.onPinClickCallback(pin)
      }
    })

    // Add hover effects for faded markers
    if (isFaded) {
      marker.on('mouseover', () => {
        this.brightenMarker(marker)
      })
      
      marker.on('mouseout', () => {
        this.fadeMarker(marker)
      })
    }

    return marker
  }

  // Clustering methods
  private applyClustering(selectedPin: MapPin | null = null): void {
    if (!this.map) return

    const zoom = this.map.getZoom()
    console.log('applyClustering called with selectedPin:', selectedPin?.id, 'zoom:', zoom, 'clustering range:', CLUSTER_CONFIG.minZoom, '-', CLUSTER_CONFIG.maxZoom)
    console.trace('applyClustering call stack:') // This will show us what's calling it
    
    // Clear existing markers and clusters first
    this.clearMarkers()
    this.clearClusters()
    
    // Only cluster at certain zoom levels
    if (zoom >= CLUSTER_CONFIG.minZoom && zoom <= CLUSTER_CONFIG.maxZoom) {
      isClusteringActive = true
      console.log('Creating clusters - zoom level requires clustering')
      this.createClusters()
    } else {
      isClusteringActive = false
      console.log('Showing individual pins - zoom level allows individual display')
      this.showIndividualPins(selectedPin)
    }
  }

  private createClusters(): void {
    if (!this.map) return

    const clusters = this.groupPinsIntoClusters(this.allPins)
    
    clusters.forEach(cluster => {
      const clusterMarker = this.createClusterMarker(cluster)
      this.clusters.set(cluster.id, cluster)
      clusterMarker.addTo(this.map!)
    })
  }

  private showIndividualPins(selectedPin: MapPin | null = null): void {
    console.log('Showing individual pins, selected pin:', selectedPin?.id)
    
    // When not clustering, show ALL individual pins
    this.allPins.forEach(pin => {
      const isSelected = selectedPin?.id === pin.id
      const isFaded = selectedPin !== null && !isSelected // Fade all pins except the selected one
      console.log(`Pin ${pin.id}: isSelected=${isSelected}, isFaded=${isFaded}`)
      
      // Create marker for all pins
      const marker = this.createMarker(pin, false, false)
      this.markers.set(pin.id, marker)
      marker.addTo(this.map!)
      
      // Apply DOM fade effect if needed
      if (isFaded) {
        console.log(`Applying DOM fade effect to newly created marker ${pin.id}`)
        // Add a small delay to ensure the marker is fully rendered
        setTimeout(() => {
          this.fadeMarker(marker)
        }, 50)
      }
    })
  }

  private groupPinsIntoClusters(pins: MapPin[]): PinCluster[] {
    const clusters: PinCluster[] = []
    const processedPins = new Set<string>()

    // First pass: Find all potential clusters using DBSCAN-like algorithm
    const potentialClusters = this.findPotentialClusters(pins)
    
    // Second pass: Filter clusters by minimum distance and size
    potentialClusters.forEach(clusterPins => {
      if (clusterPins.length < CLUSTER_CONFIG.minPinsForCluster) {
        // Too few pins - add as individual markers
        clusterPins.forEach(pin => {
          if (!processedPins.has(pin.id)) {
            const marker = this.createMarker(pin)
            this.markers.set(pin.id, marker)
            marker.addTo(this.map!)
            processedPins.add(pin.id)
          }
        })
        return
      }

      // Check if any pins in this cluster are already processed
      const hasProcessedPins = clusterPins.some(pin => processedPins.has(pin.id))
      if (hasProcessedPins) return

      // Check if this cluster contains pins from an expanded cluster
      const hasExpandedPins = clusterPins.some(pin => {
        // Check if any of the pins belong to an expanded cluster
        return Array.from(expandedClusters).some(expandedClusterId => {
          return expandedClusterId.includes(pin.id)
        })
      })

      if (hasExpandedPins) {
        // Don't re-cluster expanded clusters - add pins as individual markers
        clusterPins.forEach(pin => {
          if (!processedPins.has(pin.id)) {
            const marker = this.createMarker(pin)
            this.markers.set(pin.id, marker)
            marker.addTo(this.map!)
            processedPins.add(pin.id)
          }
        })
        return
      }

      const cluster = this.createCluster(clusterPins)
      
      // Check if this cluster is too close to existing clusters
      const tooClose = clusters.some(existingCluster => {
        const distance = this.calculatePixelDistance(
          { lat: cluster.center[0], lng: cluster.center[1] },
          { lat: existingCluster.center[0], lng: existingCluster.center[1] }
        )
        return distance < CLUSTER_CONFIG.minClusterDistance
      })

      if (!tooClose) {
        clusters.push(cluster)
        clusterPins.forEach(pin => processedPins.add(pin.id))
      } else {
        // If too close, add pins as individual markers instead
        clusterPins.forEach(pin => {
          if (!processedPins.has(pin.id)) {
            const marker = this.createMarker(pin)
            this.markers.set(pin.id, marker)
            marker.addTo(this.map!)
            processedPins.add(pin.id)
          }
        })
      }
    })

    // Add remaining unprocessed pins as individual markers
    pins.forEach(pin => {
      if (!processedPins.has(pin.id)) {
        const marker = this.createMarker(pin)
        this.markers.set(pin.id, marker)
        marker.addTo(this.map!)
      }
    })

    return clusters
  }

  private findPotentialClusters(pins: MapPin[]): MapPin[][] {
    const clusters: MapPin[][] = []
    const visited = new Set<string>()

    pins.forEach(pin => {
      if (visited.has(pin.id)) return

      const cluster = [pin]
      visited.add(pin.id)

      // Find all pins within the cluster radius
      const toCheck = [pin]
      while (toCheck.length > 0) {
        const currentPin = toCheck.pop()!
        
        pins.forEach(otherPin => {
          if (visited.has(otherPin.id)) return
          
          const distance = this.calculatePixelDistance(currentPin, otherPin)
          if (distance <= CLUSTER_CONFIG.maxClusterRadius) {
            cluster.push(otherPin)
            visited.add(otherPin.id)
            toCheck.push(otherPin)
          }
        })
      }

      clusters.push(cluster)
    })

    return clusters
  }

  private calculatePinDensity(pin: MapPin, allPins: MapPin[]): number {
    let density = 0
    allPins.forEach(otherPin => {
      if (otherPin.id !== pin.id) {
        const distance = this.calculatePixelDistance(pin, otherPin)
        if (distance <= CLUSTER_CONFIG.maxClusterRadius) {
          density++
        }
      }
    })
    return density
  }

  private createCluster(pins: MapPin[]): PinCluster {
    // Calculate cluster center
    const totalLat = pins.reduce((sum, pin) => sum + pin.lat, 0)
    const totalLng = pins.reduce((sum, pin) => sum + pin.lng, 0)
    const center: [number, number] = [totalLat / pins.length, totalLng / pins.length]

    // Calculate bounds with padding for better cluster isolation
    const bounds = this.calculateClusterBounds(pins)
    const paddedBounds = bounds.pad(0.2) // 20% padding for cluster bounds

    const cluster: PinCluster = {
      id: `cluster-${pins[0].id}`,
      center,
      pins,
      bounds: paddedBounds,
      marker: null as any // Will be set by createClusterMarker
    }

    cluster.marker = this.createClusterMarker(cluster)
    return cluster
  }

  private createClusterMarker(cluster: PinCluster): L.Marker {
    const clusterIcon = this.createClusterIcon(cluster.pins.length)
    
    const marker = L.marker(cluster.center, {
      icon: clusterIcon,
      zIndexOffset: 1000 // Ensure clusters appear above individual pins
    })

    // Add click handler for cluster
    marker.on('click', () => {
      if (this.onClusterClickCallback) {
        this.onClusterClickCallback(cluster)
      }
    })

    return marker
  }

  private createClusterIcon(count: number): L.DivIcon {
    const size = CLUSTER_CONFIG.clusterIconSize
    const color = count > 10 ? '#ef4444' : count > 5 ? '#f59e0b' : '#10b981'
    
    return L.divIcon({
      html: `
        <div class="flex items-center justify-center w-full h-full rounded-full border-2 border-white shadow-lg" 
             style="background-color: ${color}; width: ${size}px; height: ${size}px;">
          <span class="text-white font-bold text-sm">${count}</span>
        </div>
      `,
      className: 'cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    })
  }

  private calculatePixelDistance(pin1: MapPin, pin2: MapPin): number {
    if (!this.map) return Infinity

    const point1 = this.map.latLngToContainerPoint([pin1.lat, pin1.lng])
    const point2 = this.map.latLngToContainerPoint([pin2.lat, pin2.lng])
    
    const dx = point1.x - point2.x
    const dy = point1.y - point2.y
    
    return Math.sqrt(dx * dx + dy * dy)
  }

  private clearClusters(): void {
    this.clusters.forEach(cluster => {
      if (cluster.marker && this.map) {
        this.map.removeLayer(cluster.marker)
      }
    })
    this.clusters.clear()
  }

  private getIconForPinType(type: string, status: string, isSelected: boolean = false, isFaded: boolean = false): any {
    const color = this.getColorForStatus(status)
    const isAlarm = status === 'critical'
    
    console.log(`Creating icon for ${type}: isSelected=${isSelected}`)
    
    // Create different icons based on pin type
    let iconHtml = ''
    
    if (type === 'drone') {
      // Drone icon with propellers
      iconHtml = `
        <div class="relative transition-opacity duration-200">
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" 
               style="background-color: ${color}">
            <div class="w-4 h-4 relative">
              <!-- Drone body -->
              <div class="w-3 h-3 rounded-sm bg-white mx-auto mt-0.5"></div>
              <!-- Propellers -->
              <div class="absolute -top-1 left-1 w-1 h-1 bg-white rounded-full"></div>
              <div class="absolute -top-1 right-1 w-1 h-1 bg-white rounded-full"></div>
              <div class="absolute -bottom-1 left-1 w-1 h-1 bg-white rounded-full"></div>
              <div class="absolute -bottom-1 right-1 w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
          ${isAlarm ? '<div class="absolute inset-0 w-8 h-8 rounded-full border-2 border-red-500 animate-ping"></div>' : ''}
          ${isSelected ? '<div class="absolute -inset-2 w-12 h-12 rounded-full border-4 border-blue-500 animate-pulse" style="border-color: #3b82f6; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>' : ''}
        </div>
      `
    } else {
      // Default circular icon for other types
      iconHtml = `
        <div class="relative transition-opacity duration-200">
          <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center" 
               style="background-color: ${color}">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          ${isAlarm ? '<div class="absolute inset-0 w-6 h-6 rounded-full border-2 border-red-500 animate-ping"></div>' : ''}
          ${isSelected ? '<div class="absolute -inset-1 w-8 h-8 rounded-full border-3 border-blue-500 animate-pulse" style="border-color: #3b82f6; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>' : ''}
        </div>
      `
    }
    
    return L.divIcon({
      className: 'custom-marker',
      html: iconHtml,
      iconSize: type === 'drone' ? [32, 32] : [24, 24],
      iconAnchor: type === 'drone' ? [16, 16] : [12, 12]
    } as any)
  }

  private getColorForStatus(status: string): string {
    switch (status) {
      case 'active': return '#22c55e'  // Green for active
      case 'warning': return '#f59e0b' // Yellow for warning
      case 'critical': return '#ef4444' // Red for critical/alarms
      case 'inactive': return '#3b82f6' // Blue for inactive
      default: return '#3b82f6'
    }
  }

  onPinClick(callback: PinClickCallback): void {
    this.onPinClickCallback = callback
  }

  onClusterClick(callback: ClusterClickCallback): void {
    this.onClusterClickCallback = callback
  }

  // Method to expand a cluster and show individual pins
  expandCluster(cluster: PinCluster): void {
    if (!this.map) return

    // Mark this cluster as expanded to prevent re-clustering
    expandedClusters.add(cluster.id)

    // Remove the cluster marker immediately and completely
    if (cluster.marker) {
      this.map.removeLayer(cluster.marker)
      this.clusters.delete(cluster.id)
      // Clear the marker reference to prevent re-adding
      cluster.marker = null
    }

    // Add individual pins for this cluster
    cluster.pins.forEach(pin => {
      const marker = this.createMarker(pin)
      this.markers.set(pin.id, marker)
      marker.addTo(this.map!)
    })

    // Calculate bounds for ONLY this cluster's pins
    const clusterBounds = this.calculateClusterBounds(cluster.pins)
    
    // Add padding to the bounds to ensure pins aren't at the edge
    const paddedBounds = clusterBounds.pad(0.1) // 10% padding
    
    // Fit the map to show only this cluster's pins
    this.map.fitBounds(paddedBounds, {
      padding: [20, 20], // Additional padding in pixels
      maxZoom: 16 // Don't zoom too close
    })

    // Force immediate re-clustering to ensure the marker is gone
    setTimeout(() => {
      this.applyClustering()
    }, 50)
  }

  private calculateClusterBounds(pins: MapPin[]): L.LatLngBounds {
    if (pins.length === 0) {
      return L.latLngBounds([[0, 0], [0, 0]])
    }

    let minLat = pins[0].lat
    let maxLat = pins[0].lat
    let minLng = pins[0].lng
    let maxLng = pins[0].lng

    pins.forEach(pin => {
      minLat = Math.min(minLat, pin.lat)
      maxLat = Math.max(maxLat, pin.lat)
      minLng = Math.min(minLng, pin.lng)
      maxLng = Math.max(maxLng, pin.lng)
    })

    return L.latLngBounds([[minLat, minLng], [maxLat, maxLng]])
  }

  isClustering(): boolean {
    return isClusteringActive
  }

  // Force re-clustering (useful after expanding clusters)
  forceRecluster(): void {
    this.applyClustering()
  }

  // Clear expanded clusters (useful when zooming out significantly)
  clearExpandedClusters(): void {
    expandedClusters.clear()
  }

  flyTo(lat: number, lng: number, zoom: number = 15): void {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom)
    }
  }

  fitBounds(bounds: L.LatLngBounds): void {
    if (this.map) {
      this.map.fitBounds(bounds, { padding: [20, 20] })
    }
  }

  addControl(element: HTMLElement, position: L.ControlPosition = 'topright'): L.Control {
    if (!this.map) throw new Error('Map not initialized')

    const control = (L as any).control({ position })
    
    control.onAdd = () => {
      return element
    }
    
    control.addTo(this.map)
    return control
  }

  removeControl(controlId: string): void {
    const control = this.controls.get(controlId)
    if (control && this.map) {
      this.map.removeControl(control)
      this.controls.delete(controlId)
    }
  }

  clearMarkers(): void {
    this.markers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker)
      }
    })
    this.markers.clear()
    
    // Don't clear highlight marker here - it should be managed separately
    // this.clearHighlightMarker()
  }

  getBounds(): L.LatLngBounds | null {
    return this.map ? this.map.getBounds() : null
  }

  getCenter(): L.LatLng | null {
    return this.map ? this.map.getCenter() : null
  }

  getZoom(): number {
    return this.map ? this.map.getZoom() : 1
  }

  setView(center: [number, number], zoom: number): void {
    if (this.map) {
      this.map.setView(center, zoom)
    }
  }

  private setTileLayer(type: 'dark' | 'light' | 'satellite'): void {
    if (!this.map) return

    // Remove existing tile layer
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer)
    }

    let tileUrl: string
    let attribution: string

    switch (type) {
      case 'light':
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        attribution = '© OpenStreetMap contributors © CARTO'
        break
      case 'satellite':
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        attribution = '© Esri, Maxar, Earthstar Geographics'
        break
      case 'dark':
      default:
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        attribution = '© OpenStreetMap contributors © CARTO'
        break
    }

    this.currentTileLayer = L.tileLayer(tileUrl, {
      attribution: '', // Remove attribution
      maxZoom: 18,
    }).addTo(this.map)

    this.currentLayerType = type
  }

  toggleLayer(): string {
    const layers: ('dark' | 'light' | 'satellite')[] = ['dark', 'light', 'satellite']
    const currentIndex = layers.indexOf(this.currentLayerType)
    const nextIndex = (currentIndex + 1) % layers.length
    const nextLayer = layers[nextIndex]
    
    this.setTileLayer(nextLayer)
    return nextLayer
  }

  getCurrentLayer(): string {
    return this.currentLayerType
  }

  zoomIn(): void {
    if (this.map) {
      this.map.zoomIn()
    }
  }

  zoomOut(): void {
    if (this.map) {
      this.map.zoomOut()
    }
  }

  destroy(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    this.markers.clear()
    this.controls.clear()
    this.onPinClickCallback = null
    this.currentTileLayer = null
  }
}

// Export singleton instance
export const mapService = new MapService()

// Export class for testing
export { MapService }

import L from 'leaflet'
import type { MapPin, MapViewport, MapControl } from '@/types/map'
import { getActiveZones, type DroneZone } from './droneZones'

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
  private currentTileLayer: L.TileLayer | null = null
  private currentLayerType: 'dark' | 'light' | 'satellite' = 'satellite'

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

    // Clear existing markers
    this.clearMarkers()

    pins.forEach(pin => {
      const marker = this.createMarker(pin)
      this.markers.set(pin.id, marker)
      marker.addTo(this.map!)
    })

    // Add drone operation zones
    this.addDroneZones()
  }

  private addDroneZones(): void {
    if (!this.map) return

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

  private createMarker(pin: MapPin): L.Marker {
    const marker = L.marker([pin.lat, pin.lng], {
      icon: this.getIconForPinType(pin.type, pin.status)
    })

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

    return marker
  }

  private getIconForPinType(type: string, status: string): any {
    const color = this.getColorForStatus(status)
    const isAlarm = status === 'critical'
    
    // Create different icons based on pin type
    let iconHtml = ''
    
    if (type === 'drone') {
      // Drone icon with propellers
      iconHtml = `
        <div class="relative">
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
        </div>
      `
    } else {
      // Default circular icon for other types
      iconHtml = `
        <div class="relative">
          <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center" 
               style="background-color: ${color}">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          ${isAlarm ? '<div class="absolute inset-0 w-6 h-6 rounded-full border-2 border-red-500 animate-ping"></div>' : ''}
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

  flyTo(lat: number, lng: number, zoom: number = 15): void {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom)
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

import L from 'leaflet'
import type { MapPin, MapViewport, MapControl } from '@/types/map'

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

  async init(container: HTMLElement, options: MapServiceOptions): Promise<L.Map> {
    // Lazy load Leaflet to enable code-splitting
    if (!this.map) {
      this.map = L.map(container, {
        center: options.center,
        zoom: options.zoom,
        maxZoom: options.maxZoom || 18,
        minZoom: options.minZoom || 1,
        zoomControl: false, // We'll add custom controls
      })

      // Add dark-themed map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: options.attribution || '© OpenStreetMap contributors © CARTO',
        maxZoom: 18,
      }).addTo(this.map)

      // Add custom zoom control
      this.addZoomControl()
    }

    return this.map
  }

  private addZoomControl() {
    if (!this.map) return

    const zoomControl = (L as any).control({ position: 'topright' })
    
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

    // Add restricted zone polygon (red zone from screenshot)
    this.addRestrictedZone()
  }

  private addRestrictedZone(): void {
    if (!this.map) return

    // TODO: Replace with actual coordinates from screenshot
    const restrictedZoneCoords: [number, number][] = [
      [42.7, 23.3],
      [42.75, 23.35],
      [42.8, 23.3],
      [42.75, 23.25],
      [42.7, 23.3]
    ]

    const polygon = L.polygon(restrictedZoneCoords, {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.3,
      weight: 2
    }).addTo(this.map)

    // Add drone icon in restricted zone
    const droneIcon = L.divIcon({
      className: 'drone-icon',
      html: `
        <div class="w-8 h-8 text-white">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })

    L.marker([42.75, 23.3], { icon: droneIcon }).addTo(this.map)
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
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative">
          <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center" 
               style="background-color: ${color}">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          ${isAlarm ? '<div class="absolute inset-0 w-6 h-6 rounded-full border-2 border-red-500 animate-ping"></div>' : ''}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
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

  destroy(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    this.markers.clear()
    this.controls.clear()
    this.onPinClickCallback = null
  }
}

// Export singleton instance
export const mapService = new MapService()

// Export class for testing
export { MapService }

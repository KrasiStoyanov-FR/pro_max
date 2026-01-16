import L from 'leaflet'
import type { MapPin, MapViewport, MapControl, DroneTrajectory, DroneTrajectoryPoint } from '@/types/map'
import { getActiveZones, type DroneZone } from './droneZones'
import DroneIconSvg from '@phosphor-icons/core/assets/fill/drone-fill.svg?raw'
import UserIconSvg from '@phosphor-icons/core/assets/fill/user-fill.svg?raw'
import CellTowerIconSvg from '@phosphor-icons/core/assets/fill/cell-tower-fill.svg?raw'
import CrosshairIconSvg from '@phosphor-icons/core/assets/fill/crosshair-fill.svg?raw'
import SkullIconSvg from '@phosphor-icons/core/assets/fill/skull-fill.svg?raw'
import QuestionIconSvg from '@phosphor-icons/core/assets/fill/question-fill.svg?raw'
import MapPinIconSvg from '@phosphor-icons/core/assets/fill/map-pin-fill.svg?raw'

// Clustering configuration
const CLUSTER_CONFIG = {
  maxClusterRadius: 50, // base radius in pixels (adjusted dynamically by zoom)
  minClusterDistance: 200, // base minimum distance between clusters (dynamic)
  minZoom: 1, // cluster even when fully zoomed out
  maxZoom: 14, // cluster up to near max zoom; hide clusters very close-in
  clusterIconSize: 40,
  zoomIncrement: 3, // more zoom levels to better isolate cluster
  minPinsForCluster: 2 // cluster pairs and larger groups
}

// Clustering state
let isClusteringActive = false
const expandedClusters = new Set<string>() // Track expanded cluster IDs to prevent re-clustering
const expandedClusterPins = new Map<string, Set<string>>() // Track which pins belong to expanded clusters

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
  // Spiderfy state for overlapping markers
  private spiderfiedActive: boolean = false
  private spiderfiedMembers: Map<string, { originalLatLng: L.LatLng }> = new Map()
  private spiderfiedCenterId: string | null = null
  private currentLayerType: 'dark' | 'light' | 'satellite' = 'satellite'
  private clusters: Map<string, PinCluster> = new Map()
  private allPins: MapPin[] = []
  private detectionPins: MapPin[] = []
  private highlightMarker: L.Marker | null = null
  private focusState: {
    active: boolean
    dronePinId: string | null
    droneTargetId: string | null
    droneSystemId: string | null
    detectorPinId: string | null
    detectorRangeMeters: number | null
    detectorLatLng: [number, number] | null
    mode: 'drone' | 'sensor'
    linkedDroneIds: string[]
  } = {
    active: false,
    dronePinId: null,
    droneTargetId: null,
    droneSystemId: null,
    detectorPinId: null,
    detectorRangeMeters: null,
    detectorLatLng: null,
    mode: 'drone',
    linkedDroneIds: []
  }
  private checkpointMarkers: Map<string, L.Marker[]> = new Map()
  private droneTrajectories: Map<string, L.Polyline> = new Map()
  private onTrajectoryPointClickCallback: ((point: DroneTrajectoryPoint) => void) | null = null
  private detectionsById: Map<number, { marker: L.Marker, pin: MapPin }> = new Map()
  private highlightedDetectionId: number | null = null
  private selectedClusterId: string | null = null // Track selected cluster to hide its marker
  private selectedPin: MapPin | null = null // Track selected pin to maintain selection state during zoom/pan
  private detectionRangeCircles: Map<string, L.Circle> = new Map() // Detection range visualization
  private clusteringEnabled: boolean = false
  public visibleMarkerTypes: Set<MapPin['type']> | null = null

  private getClusterRadiusForZoom(): number {
    if (!this.map) return CLUSTER_CONFIG.maxClusterRadius
    const zoom = this.map.getZoom()

    if (zoom <= 4) return 140
    if (zoom <= 6) return 120
    if (zoom <= 8) return 95
    if (zoom <= 10) return 70
    if (zoom <= 12) return 55
    return 40
  }

  private getClusterSpacingForZoom(): number {
    const radius = this.getClusterRadiusForZoom()
    return Math.max(radius * 2.2, CLUSTER_CONFIG.minClusterDistance * 0.65)
  }

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
        // Clear spiderfy when zooming
        if (this.spiderfiedActive) {
          this.unspiderfy()
        }
        // Clear existing timeout
        if (zoomTimeout) {
          clearTimeout(zoomTimeout)
        }

          // Debounce the clustering to avoid too many updates during zoom
        zoomTimeout = setTimeout(() => {
          const currentZoom = this.map!.getZoom()
          // Clear expanded clusters and selected cluster if zoomed out significantly
          // This allows clusters to reappear when zoomed out enough
          if (currentZoom < CLUSTER_CONFIG.minZoom + 2) {
            this.clearExpandedClusters()
            this.selectedClusterId = null // Clear selected cluster to allow clusters to reappear
          }
          // Use stored selectedPin to maintain selection state during zoom
          this.applyClustering(this.selectedPin)
        }, 150) // 150ms debounce
      })
      // Clear spiderfy when panning
      this.map.on('movestart', () => {
        if (this.spiderfiedActive) {
          this.unspiderfy()
        }
      })
      this.map.on('moveend', () => {
        this.updateMarkerFocusStyles()
      })
      // Clear spiderfy on general map click
      this.map.on('click', () => {
        if (this.spiderfiedActive) {
          this.unspiderfy()
        }
      })
    }

    return this.map
  }

  setClusteringEnabled(enabled: boolean): void {
    this.clusteringEnabled = enabled
    // Re-apply clustering state immediately
    if (this.map) {
      this.applyClustering(this.selectedPin)
    }
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

  addPins(pins: MapPin[], visibleTypes?: Set<MapPin['type']>): void {
    if (!this.map) return

    // Store visible marker types for Focus Mode filtering
    if (visibleTypes) {
      this.visibleMarkerTypes = visibleTypes
    }

    // Store detection pins separately so they don't appear by default
    this.detectionPins = pins.filter(pin => pin.type === 'target')
    // Remaining pins participate in clustering/normal rendering
    this.allPins = pins.filter(pin => pin.type !== 'target')

    // Apply clustering based on zoom level (this will clear and redraw everything)
    this.applyClustering()

    // Add drone operation zones
    // this.addDroneZones() // Disabled - using only real data from database

    this.updateMarkerFocusStyles()
  }
  
  // Add detection range circles around GPS units/receivers
  private addDetectionRanges(pins: MapPin[] = this.allPins): void {
    if (!this.map) return
    
    // Clear existing detection range circles
    this.clearDetectionRanges()
    
    // Detection range in meters
    const DETECTION_RANGE_METERS = 1500 // 1.5km detection range
    
    // Find GPS units (sensor type pins) - these are the detection sources
    const detectionSources = pins.filter(pin => pin.type === 'sensor' && pin.status === 'active')
    
    detectionSources.forEach(source => {
      // Create a circle to show detection range
        const rangeCircle = L.circle([source.lat, source.lng], {
          radius: DETECTION_RANGE_METERS,
          color: '#3b82f6', // Blue color for detection range
          fillColor: '#3b82f6',
        fillOpacity: 0.1, // Very transparent fill
        weight: 2,
        opacity: 1
      })
      
      // Do not bind Leaflet tooltip to circles to avoid UX disruption
      
      rangeCircle.addTo(this.map!)
      this.detectionRangeCircles.set(source.id, rangeCircle)
    })
  }
  
  // Clear detection range circles
  private clearDetectionRanges(): void {
    if (!this.map) return
    
    this.detectionRangeCircles.forEach(circle => {
      this.map!.removeLayer(circle)
    })
    this.detectionRangeCircles.clear()
  }

  applyFocusMode(params: {
    focusPinId: string | null
    droneTargetId?: string | number | null
    systemId?: string | number | null
    detectorPinId?: string | null
    mode?: 'drone' | 'sensor'
    detectorRangeMeters?: number | null
    linkedDroneIds?: string[] | null
  }): void {
    const focusPinId = params.focusPinId
    const detectorPinId = params.detectorPinId ?? null
    const detectorRange = params.detectorRangeMeters ?? (detectorPinId ? 1500 : null)
    const detectorLatLng = detectorPinId ? this.getPinLatLng(detectorPinId) : null

    this.focusState = {
      active: !!focusPinId,
      dronePinId: focusPinId,
      droneTargetId: params.droneTargetId !== null && params.droneTargetId !== undefined ? String(params.droneTargetId) : null,
      droneSystemId: params.systemId !== null && params.systemId !== undefined ? String(params.systemId) : null,
      detectorPinId,
      detectorRangeMeters: detectorRange,
      detectorLatLng,
      mode: params.mode ?? 'drone',
      linkedDroneIds: params.linkedDroneIds ? params.linkedDroneIds.map(String) : []
    }

    this.updateMarkerFocusStyles()
  }

  private updateMarkerFocusStyles(): void {
    const resetDetections = () => {
      this.detectionsById.forEach(({ marker }) => {
        const element = marker.getElement()
        if (!element) return
        element.classList.remove('marker--detection-focus')
        element.classList.remove('marker--detection-selected')
        element.classList.remove('marker--hidden')
      })
    }

    if (!this.focusState.active) {
      this.markers.forEach(marker => this.resetMarkerAppearance(marker))
      resetDetections()
      return
    }

    if (!this.isFocusContextVisible()) {
      this.markers.forEach(marker => this.resetMarkerAppearance(marker))
      resetDetections()
      return
    }

    const mode = this.focusState.mode ?? 'drone'
    const detectorCoords = this.focusState.detectorLatLng
    const detectorRange = this.focusState.detectorRangeMeters ?? 1500
    const linkedDroneIds = this.focusState.linkedDroneIds ?? []

    this.markers.forEach(marker => {
      const pinData = (marker as any).pinData as MapPin | undefined
      if (!pinData) return

      const pinSystemId = pinData.data?.system_id !== undefined && pinData.data?.system_id !== null
        ? String(pinData.data.system_id)
        : null
      const matchesFocusPin = pinData.id === this.focusState.dronePinId
      const pinDroneTargetId = pinData.data?.drone_id !== undefined && pinData.data?.drone_id !== null
        ? String(pinData.data.drone_id)
        : null
      const matchesDroneTarget = this.focusState.droneTargetId !== null && pinDroneTargetId === this.focusState.droneTargetId
      const isDetectionSelection = pinData.type === 'target' && matchesDroneTarget

      let shouldHighlight = false

      if (mode === 'drone') {
        const linkedBySystem =
          this.focusState.droneSystemId !== null &&
          pinSystemId === this.focusState.droneSystemId &&
          (pinData.type === 'sensor' || pinData.type === 'friendly')

        shouldHighlight = matchesFocusPin || matchesDroneTarget || linkedBySystem || isDetectionSelection
      } else if (mode === 'sensor') {
        const isDetector = pinData.id === this.focusState.detectorPinId
        const operatorMatches =
          this.focusState.droneSystemId !== null &&
          pinSystemId === this.focusState.droneSystemId &&
          pinData.type === 'friendly'
        let droneInRange = false
        if (pinData.type === 'drone' && detectorCoords) {
          droneInRange = this.calculateDistanceMeters(detectorCoords, [pinData.lat, pinData.lng]) <= detectorRange
        }
        shouldHighlight = isDetector || operatorMatches || droneInRange
      }

      this.applyMarkerOpacity(marker, shouldHighlight)
    })

    this.detectionsById.forEach(({ marker, pin }, key) => {
      const element = marker.getElement()
      if (!element) return

      // Check if RF detections (target type) are visible according to filter
      const isTargetTypeVisible = this.visibleMarkerTypes?.has('target') ?? true

      const pinDroneTargetId = pin.data?.drone_id !== undefined && pin.data?.drone_id !== null
        ? String(pin.data.drone_id)
        : null

      const isInFocusMode = 
        pin.id === this.focusState.dronePinId ||
        (this.focusState.droneTargetId !== null && pinDroneTargetId === this.focusState.droneTargetId) ||
        (mode === 'sensor' && pinDroneTargetId !== null && linkedDroneIds.includes(pinDroneTargetId))

      // Only show in Focus Mode if target type is visible
      if (isInFocusMode && isTargetTypeVisible) {
        element.classList.add('marker--detection-focus')
        element.classList.remove('marker--hidden')
        if (this.highlightedDetectionId !== null) {
          if (key === this.highlightedDetectionId) {
            element.classList.add('marker--detection-selected')
          } else {
            element.classList.remove('marker--detection-selected')
          }
        } else {
          element.classList.remove('marker--detection-selected')
        }
      } else {
        element.classList.remove('marker--detection-focus')
        element.classList.remove('marker--detection-selected')
        element.classList.add('marker--hidden')
      }
    })
  }

  private applyMarkerOpacity(marker: L.Marker, highlighted: boolean): void {
    const element = marker.getElement()
    if (!element) return
    ;(marker as any).__focusLock = true

    element.classList.remove('marker--hidden')
    if (highlighted) {
      element.classList.add('marker--focus')
      element.classList.remove('marker--faded')
      element.style.opacity = '1'
      ;(marker as any).isFaded = false
    } else {
      element.classList.remove('marker--focus')
      element.classList.add('marker--faded')
      element.style.opacity = '0.35'
      ;(marker as any).isFaded = true
    }
  }

  private resetMarkerAppearance(marker: L.Marker): void {
    const element = marker.getElement()
    if (!element) return
    element.classList.remove('marker--faded')
    element.classList.remove('marker--focus')
    element.classList.remove('marker--hidden')
    element.style.opacity = ''
    ;(marker as any).isFaded = false
    ;(marker as any).__focusLock = false
  }

  private getPinLatLng(pinId: string): [number, number] | null {
    const pin = this.allPins.find(p => p.id === pinId)
    return pin ? [pin.lat, pin.lng] : null
  }

  private getPinLatLngByDroneTarget(droneTargetId: string | null): [number, number] | null {
    if (!droneTargetId) return null
    const pin = this.allPins.find(p => p.type === 'drone' && String(p.data?.drone_id ?? '') === droneTargetId)
    return pin ? [pin.lat, pin.lng] : null
  }

  private isFocusContextVisible(): boolean {
    if (!this.map || !this.focusState.active) return true
    const bounds = this.map.getBounds()
    if (!bounds) return true

    const contains = (coords: [number, number] | null): boolean => {
      if (!coords) return false
      return bounds.contains(coords as L.LatLngExpression)
    }

    if (this.focusState.mode === 'sensor') {
      if (contains(this.getPinLatLng(this.focusState.detectorPinId ?? ''))) return true
      if (this.focusState.linkedDroneIds?.length) {
        return this.focusState.linkedDroneIds.some(droneId => contains(this.getPinLatLngByDroneTarget(droneId)))
      }
      return false
    }

    if (contains(this.getPinLatLng(this.focusState.dronePinId ?? ''))) return true
    if (contains(this.getPinLatLng(this.focusState.detectorPinId ?? ''))) return true
    if (contains(this.getPinLatLngByDroneTarget(this.focusState.droneTargetId))) return true

    return false
  }

  private calculateDistanceMeters(a: [number, number], b: [number, number]): number {
    const toRadians = (deg: number) => deg * (Math.PI / 180)
    const dLat = toRadians(b[0] - a[0])
    const dLng = toRadians(b[1] - a[1])
    const lat1 = toRadians(a[0])
    const lat2 = toRadians(b[0])
    const sinLat = Math.sin(dLat / 2)
    const sinLng = Math.sin(dLng / 2)
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
    return 6371000 * c
  }

  showTrajectoryCheckpoints(dronePinId: string, points: DroneTrajectoryPoint[]): void {
    if (!this.map) return

    // Trajectory checkpoints are from drone_positions (GPS coordinates), not RF detections
    // They're shown when drones are visible, independent of RF detections
    const isDroneTypeVisible = this.visibleMarkerTypes?.has('drone') ?? true
    if (!isDroneTypeVisible) {
      // Don't show trajectory checkpoints if drones filter is disabled
      this.clearTrajectoryCheckpoints(dronePinId)
      return
    }

    this.clearTrajectoryCheckpoints(dronePinId)

    const markers: L.Marker[] = points.map(point => {
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: 'trajectory-checkpoint',
          html: `
            <div class="trajectory-checkpoint__wrapper">
              <div class="trajectory-checkpoint__pulse"></div>
              <div class="trajectory-checkpoint__dot"></div>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      })

      ; (marker as any).checkpointData = point

      marker.on('click', () => {
        if (this.map) {
          const zoom = this.map.getZoom()
          console.log('[Map] trajectory checkpoint click', { zoom, lat: point.lat, lng: point.lng })
          this.map.panTo([point.lat, point.lng], { animate: false })
        }
        this.highlightTrajectoryCheckpoint(dronePinId, point.timestamp)
        this.onTrajectoryPointClickCallback?.(point)
      })

      return marker.addTo(this.map!)
    })

    this.checkpointMarkers.set(dronePinId, markers)
  }

  clearTrajectoryCheckpoints(dronePinId?: string): void {
    if (!this.map) return

    if (dronePinId) {
      const markers = this.checkpointMarkers.get(dronePinId)
      markers?.forEach(marker => this.map!.removeLayer(marker))
      this.checkpointMarkers.delete(dronePinId)
      return
    }

    this.checkpointMarkers.forEach(markers => {
      markers.forEach(marker => this.map!.removeLayer(marker))
    })
    this.checkpointMarkers.clear()
  }

  highlightTrajectoryCheckpoint(dronePinId: string, timestamp: string): void {
    const markers = this.checkpointMarkers.get(dronePinId)
    if (!markers) return

    markers.forEach(marker => {
      const element = marker.getElement()
      if (!element) return
      const data = (marker as any).checkpointData as DroneTrajectoryPoint | undefined
      if (data && data.timestamp === timestamp) {
        element.classList.add('trajectory-checkpoint--active')
      } else {
        element.classList.remove('trajectory-checkpoint--active')
        element.classList.remove('trajectory-checkpoint--detection-selected')
      }
    })
  }

  highlightDetectionCheckpoint(dronePinId: string, detectionId: number | null, detectionTimestamp?: string): void {
    const markers = this.checkpointMarkers.get(dronePinId)
    if (!markers || detectionId === null) {
      // Clear all detection highlights
      markers?.forEach(marker => {
        const element = marker.getElement()
        if (element) {
          element.classList.remove('trajectory-checkpoint--detection-selected')
        }
      })
      return
    }

    // Find the checkpoint that matches this detection by timestamp
    markers.forEach(marker => {
      const element = marker.getElement()
      if (!element) return
      const data = (marker as any).checkpointData as DroneTrajectoryPoint | undefined
      
      if (detectionTimestamp && data) {
        // Match by timestamp if provided
        const pointTime = new Date(data.timestamp).getTime()
        const detectionTime = new Date(detectionTimestamp).getTime()
        const timeDiff = Math.abs(pointTime - detectionTime)
        
        if (timeDiff < 5000) { // Within 5 seconds
          element.classList.add('trajectory-checkpoint--detection-selected')
          element.classList.add('trajectory-checkpoint--active')
        } else {
          element.classList.remove('trajectory-checkpoint--detection-selected')
        }
      } else {
        // Fallback: use active checkpoint
        if (element.classList.contains('trajectory-checkpoint--active')) {
          element.classList.add('trajectory-checkpoint--detection-selected')
        } else {
          element.classList.remove('trajectory-checkpoint--detection-selected')
        }
      }
    })
  }

  onTrajectoryPointClick(callback: (point: DroneTrajectoryPoint) => void): void {
    this.onTrajectoryPointClickCallback = callback
  }

  panToDetection(detectionId: number): void {
    const detection = this.detectionsById.get(detectionId)
    if (!detection || !this.map) return

    const { marker } = detection
    const latLng = marker.getLatLng()
    const zoom = this.map.getZoom() ?? 15
    console.log('[Map] detection pan', { detectionId, zoom })
    this.flyTo(latLng.lat, latLng.lng, zoom, { adjustForOverlays: true })
    this.highlightDetection(detectionId)
  }

  highlightDetection(detectionId: number | null): void {
    this.highlightedDetectionId = detectionId

    this.detectionsById.forEach(({ marker }, key) => {
      const element = marker.getElement()
      if (!element) return

      if (detectionId !== null && key === detectionId) {
        element.classList.add('marker--detection-selected')
        element.classList.add('marker--detection-focus')
        element.classList.remove('marker--hidden')
      } else {
        element.classList.remove('marker--detection-selected')
        if (!this.focusState.active) {
          element.classList.remove('marker--detection-focus')
          element.classList.add('marker--hidden')
        }
      }
    })
  }

  highlightSelectedPin(selectedPin: MapPin | null): void {
    if (!this.map) return

    console.log('Highlighting selected pin:', selectedPin?.id, selectedPin?.title)

    // Store the selected pin to maintain state during zoom/pan
    this.selectedPin = selectedPin

    // Remove any existing highlight marker
    this.clearHighlightMarker()

    if (selectedPin) {
      // Update the existing marker to be enlarged and pulsing
      const existingMarker = this.markers.get(selectedPin.id)
      if (existingMarker) {
        // Recreate the marker with isSelected=true to get enlarged version
        const newIcon = this.getIconForPinType(selectedPin.type, selectedPin.status, true, false, selectedPin.data)
        existingMarker.setIcon(newIcon)
        // Ensure it's on top
        existingMarker.setZIndexOffset(1000)
      } else {
        // Marker doesn't exist yet, create it as selected
        const marker = this.createMarker(selectedPin, true, false)
        this.markers.set(selectedPin.id, marker)
        marker.addTo(this.map)
        marker.setZIndexOffset(1000)
      }

      // Force individual pins to be shown with fade effect
      this.forceShowIndividualPins(selectedPin)
    } else {
      // If selectedPin is null, restore all markers to normal size
      this.markers.forEach((marker, pinId) => {
        const pin = this.allPins.find(p => p.id === pinId)
        if (pin) {
          const newIcon = this.getIconForPinType(pin.type, pin.status, false, false, pin.data)
          marker.setIcon(newIcon)
          marker.setZIndexOffset(0)
        }
      })
      // Clear the fade effect
      this.clearFadeEffect()
    }

    this.updateMarkerFocusStyles()
  }

  private clearHighlightMarker(): void {
    if (this.highlightMarker && this.map) {
      this.map.removeLayer(this.highlightMarker)
      this.highlightMarker = null
    }
    // Note: Don't clear selectedPin here - it's managed by highlightSelectedPin
    // This allows selection to persist during zoom/pan operations
  }

  // Detect overlapping markers (by pixel distance)
  private getOverlappingMarkerIds(centerPinId: string, thresholdPx: number): string[] {
    if (!this.map) return [centerPinId]
    const centerMarker = this.markers.get(centerPinId)
    if (!centerMarker) return [centerPinId]
    const centerPoint = this.map.latLngToContainerPoint(centerMarker.getLatLng())
    const result: string[] = []
    this.markers.forEach((marker, id) => {
      const pt = this.map!.latLngToContainerPoint(marker.getLatLng())
      const dx = pt.x - centerPoint.x
      const dy = pt.y - centerPoint.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= thresholdPx) {
        result.push(id)
      }
    })
    return result
  }

  // Expand overlapping markers around the center marker with small offsets (spiderfy)
  private spiderfyGroup(memberIds: string[], centerId: string): void {
    if (!this.map) return
    // Clear any existing spiderfy state
    this.unspiderfy()
    const centerMarker = this.markers.get(centerId)
    if (!centerMarker) return
    const centerLatLng = centerMarker.getLatLng()
    const centerPoint = this.map.latLngToLayerPoint(centerLatLng)

    const count = memberIds.length
    const radiusPx = 28 // ring radius in pixels
    const angleStep = (2 * Math.PI) / count
    let startAngle = -Math.PI / 2 // start at top

    // Record originals and compute new positions
    memberIds.forEach((id, idx) => {
      const marker = this.markers.get(id)
      if (!marker) return
      // Save original
      this.spiderfiedMembers.set(id, { originalLatLng: marker.getLatLng() })
      // Place at center for the centerId, or on ring for others
      if (count === 1) return
      const angle = startAngle + idx * angleStep
      const offsetX = Math.cos(angle) * radiusPx
      const offsetY = Math.sin(angle) * radiusPx
      const newPoint = L.point(centerPoint.x + offsetX, centerPoint.y + offsetY)
      const newLatLng = this.map.layerPointToLatLng(newPoint)
      marker.setLatLng(newLatLng)
      const el = marker.getElement()
      if (el) el.classList.add('marker--spiderfied')
    })

    this.spiderfiedActive = true
    this.spiderfiedCenterId = centerId
  }

  // Restore spiderfied markers to their original positions
  private unspiderfy(): void {
    if (!this.map || !this.spiderfiedActive) return
    this.spiderfiedMembers.forEach(({ originalLatLng }, id) => {
      const marker = this.markers.get(id)
      if (!marker) return
      marker.setLatLng(originalLatLng)
      const el = marker.getElement()
      if (el) el.classList.remove('marker--spiderfied')
    })
    this.spiderfiedMembers.clear()
    this.spiderfiedActive = false
    this.spiderfiedCenterId = null
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

    // Update existing markers with correct selection state
    this.markers.forEach((marker, pinId) => {
      const pin = this.allPins.find(p => p.id === pinId)
      if (!pin) return
      
      const isSelected = selectedPin?.id === pinId
      const isFaded = selectedPin !== null && !isSelected
      console.log(`Processing existing marker ${pinId}: isSelected=${isSelected}, isFaded=${isFaded}`)

      // Update marker icon to reflect selection state
      const newIcon = this.getIconForPinType(pin.type, pin.status, isSelected, isFaded, pin.data)
      marker.setIcon(newIcon)
      
      // Update z-index
      if (isSelected) {
        marker.setZIndexOffset(1000)
      } else {
        marker.setZIndexOffset(0)
      }

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
        ; (marker as any).isFaded = false
    }
  }

  private fadeMarker(marker: L.Marker): void {
    if ((marker as any).__focusLock) {
      return
    }
    const element = marker.getElement()
    console.log('fadeMarker called, element found:', !!element)
    if (element) {
      console.log('Setting opacity to 0.5 for marker')
      element.style.opacity = '0.5'
        ; (marker as any).isFaded = true

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
    // Disabled - using only real data from database
    return
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
      icon: this.getIconForPinType(pin.type, pin.status, isSelected, isFaded, pin.data)
    })

      // Store fade state on marker for hover effects
      ; (marker as any).isFaded = isFaded

      // Store pin data on marker for easy access
      ; (marker as any).pinData = pin

    // Intentionally no Leaflet popup/tooltip bound to markers (UX requirement)

    // Add click handler
    marker.on('click', () => {
      // If many markers overlap here, first click spiderfies them instead of immediate selection
      const overlappingIds = this.getOverlappingMarkerIds(pin.id, 12) // 12px threshold for overlap
      if (!this.spiderfiedActive && overlappingIds.length > 1) {
        this.spiderfyGroup(overlappingIds, pin.id)
        return
      }
      if (this.onPinClickCallback) this.onPinClickCallback(pin)
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

    // Use stored selectedPin if none provided (e.g., during zoom operations)
    const pinToUse = selectedPin !== null ? selectedPin : this.selectedPin

    const zoom = this.map.getZoom()
    const maxZoom = this.map.getMaxZoom()
    
    console.log('applyClustering called with selectedPin:', pinToUse?.id, 'zoom:', zoom, 'maxZoom:', maxZoom, 'selectedClusterId:', this.selectedClusterId, 'clustering range:', CLUSTER_CONFIG.minZoom, '-', CLUSTER_CONFIG.maxZoom)

    // Clear existing markers and clusters first
    this.clearMarkers()
    this.clearClusters()

    // Don't cluster if:
    // 1. Zoom is too high (near max zoom)
    // 2. A cluster is currently selected (show individual pins)
    // 3. Zoom is too low (below min zoom)
    const shouldCluster = this.clusteringEnabled &&
                         zoom >= CLUSTER_CONFIG.minZoom && 
                         zoom <= CLUSTER_CONFIG.maxZoom && 
                         !this.selectedClusterId &&
                         zoom < (maxZoom - 2) // Hide clusters near max zoom

    if (shouldCluster) {
      isClusteringActive = true
      // Hide detection range overlays when sensors are grouped into clusters
      this.clearDetectionRanges()
      console.log('Creating clusters - zoom level requires clustering, no cluster selected')
      this.createClusters()
    } else {
      isClusteringActive = false
      // Show detection ranges only when individual sensor markers are visible
      this.addDetectionRanges()
      const reason = !this.selectedClusterId 
        ? (zoom < CLUSTER_CONFIG.minZoom ? 'zoom too low' : zoom >= (maxZoom - 2) ? 'zoom too high' : 'zoom out of range')
        : 'cluster selected'
      console.log(`Showing individual pins - ${reason}`)
      this.showIndividualPins(pinToUse)
      
      // After showing individual pins, ensure selected pin is properly highlighted
      // Use a small delay to ensure markers are rendered first
      if (pinToUse) {
        setTimeout(() => {
          const marker = this.markers.get(pinToUse.id)
          if (marker) {
            const newIcon = this.getIconForPinType(pinToUse.type, pinToUse.status, true, false, pinToUse.data)
            marker.setIcon(newIcon)
            marker.setZIndexOffset(1000)
          }
        }, 50)
      }
    }

    // Ensure detection markers are re-added after clustering operations
    this.registerDetectionMarkers(this.detectionPins)

    // Re-apply focus styles after clustering alters markers
    requestAnimationFrame(() => {
      this.updateMarkerFocusStyles()
    })
  }

  private createClusters(): void {
    if (!this.map) return

    const clusters = this.groupPinsIntoClusters(this.allPins)

    clusters.forEach(cluster => {
      // Skip if this cluster is selected (should show individual pins instead)
      if (cluster.id === this.selectedClusterId) {
        return
      }
      
      // Check if cluster marker already exists to prevent duplication
      if (this.clusters.has(cluster.id)) {
        console.warn(`Cluster ${cluster.id} already exists, skipping duplicate`)
        return
      }
      
      const clusterMarker = this.createClusterMarker(cluster)
      cluster.marker = clusterMarker
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

      // Create marker for all pins with correct selection state
      const marker = this.createMarker(pin, isSelected, isFaded)
      this.markers.set(pin.id, marker)
      marker.addTo(this.map!)
      
      // Set z-index for selected marker
      if (isSelected) {
        marker.setZIndexOffset(1000)
      }

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
      // Only skip re-clustering if the cluster is currently selected
      if (this.selectedClusterId) {
        const expandedPins = expandedClusterPins.get(this.selectedClusterId)
        if (expandedPins) {
          // Check if any pins in this potential cluster belong to the selected expanded cluster
          const hasExpandedPins = clusterPins.some(pin => expandedPins.has(pin.id))
          
          if (hasExpandedPins) {
            // Don't re-cluster the currently selected cluster - add pins as individual markers
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
        }
      }

      const cluster = this.createCluster(clusterPins)

      // Check if this cluster is too close to existing clusters
      const clusterSpacing = this.getClusterSpacingForZoom()
      const tooClose = clusters.some(existingCluster => {
        const distance = this.calculatePixelDistance(
          { lat: cluster.center[0], lng: cluster.center[1] },
          { lat: existingCluster.center[0], lng: existingCluster.center[1] }
        )
        return distance < clusterSpacing
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
          if (distance <= this.getClusterRadiusForZoom()) {
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
        if (distance <= this.getClusterRadiusForZoom()) {
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
    const clusterIcon = this.createClusterIcon(cluster.pins.length, cluster.pins)

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

  private createClusterIcon(count: number, pins: MapPin[] = []): L.DivIcon {
    const size = CLUSTER_CONFIG.clusterIconSize
    
    // Check if cluster contains sensors with RF detections AND RF Detections filter is enabled
    const rfDetectionsFilterEnabled = this.visibleMarkerTypes?.has('target') ?? true
    const hasSensorsWithDetections = rfDetectionsFilterEnabled && pins.some(pin => 
      pin.type === 'sensor' && 
      (pin.data?.hasRFDetections === true || (Array.isArray(pin.data?.detections) && pin.data.detections.length > 0))
    )
    
    // Use orange color scheme if cluster contains sensors with RF detections AND filter is enabled
    const backgroundColor = hasSensorsWithDetections 
      ? '#f97316' // Orange-500 for sensors with detections
      : '#3b82f6' // Default blue
    const borderColor = hasSensorsWithDetections
      ? '#ea580c' // Orange-600 for border
      : '#2563eb' // Blue-600 for border
    const textColor = '#ffffff'
    
    // Add glow effect for clusters with sensors that have RF detections (only when filter is enabled)
    const glowStyle = hasSensorsWithDetections
      ? 'box-shadow: 0 0 12px rgba(249, 115, 22, 0.8), 0 0 6px rgba(249, 115, 22, 0.6);'
      : ''

    return L.divIcon({
      html: `
        <div class="flex items-center justify-center w-full h-full rounded-full border-2 shadow-lg" 
             style="background-color: ${backgroundColor}; border-color: ${borderColor}; width: ${size}px; height: ${size}px; pointer-events: auto; ${glowStyle}">
          <span class="font-bold text-sm" style="color: ${textColor};">${count}</span>
        </div>
      `,
      className: 'cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    })
  }

  private calculatePixelDistance(pointA: { lat: number; lng: number }, pointB: { lat: number; lng: number }): number {
    if (!this.map) return Infinity

    const pixelPoint1 = this.map.latLngToContainerPoint([pointA.lat, pointA.lng])
    const pixelPoint2 = this.map.latLngToContainerPoint([pointB.lat, pointB.lng])

    const dx = pixelPoint1.x - pixelPoint2.x
    const dy = pixelPoint1.y - pixelPoint2.y

    return Math.sqrt(dx * dx + dy * dy)
  }

  private clearClusters(): void {
    this.clusters.forEach(cluster => {
      if (cluster.marker && this.map) {
        this.map.removeLayer(cluster.marker)
      }
    })
    this.clusters.clear()
    // Note: Don't clear selectedClusterId here - it's managed separately
  }

  private getIconForPinType(type: string, status: string, isSelected: boolean = false, isFaded: boolean = false, pinData?: any): any {
    // RF detections are shown at sensor locations with pulse animation
    if (type === 'target') {
      const size = isSelected ? 22 : 16
      const activeClass = isSelected ? 'trajectory-checkpoint--active' : ''

      return L.divIcon({
        className: `custom-marker detection-marker ${activeClass}`,
        html: `
          <div class="trajectory-checkpoint--map">
            <div class="trajectory-checkpoint__wrapper">
              <div class="trajectory-checkpoint__pulse"></div>
              <div class="trajectory-checkpoint__dot"></div>
            </div>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      } as any)
    }

    const color = this.getColorForStatus(status, type)
    const isAlarm = status === 'critical'
    const isWarning = status === 'warning'
    // Sensors with RF detections should pulse to indicate activity
    const hasRFDetections = pinData?.hasRFDetections === true || (Array.isArray(pinData?.detections) && pinData.detections.length > 0)
    const shouldPulse = isAlarm || isWarning || (type === 'sensor' && hasRFDetections) // Pulse for critical, warning, or sensors with detections
    
    // For sensors with RF detections, use orange/red color scheme (moderate alert level)
    const sensorColor = (type === 'sensor' && hasRFDetections) 
      ? '#f97316' // Orange-500 - moderate alert, not too alarming
      : color
    const sensorBorderColor = (type === 'sensor' && hasRFDetections)
      ? '#ea580c' // Orange-600 - slightly darker for border
      : '#ffffff' // White border for normal sensors
    const sensorPulseColor = (type === 'sensor' && hasRFDetections)
      ? '#f97316' // Orange-500 for pulse
      : color

    // Determine sizes based on selection state (in pixels)
    const isSensor = type === 'sensor' || type === 'radar'
    const baseMarkerSize = type === 'drone' ? 32 : (isSensor ? 28 : 24)
    const selectedMarkerSize = type === 'drone' ? 48 : (isSensor ? 44 : 36)
    const markerSizePx = isSelected ? selectedMarkerSize : baseMarkerSize
    const iconSizePx = isSelected ? (type === 'drone' ? 26 : (isSensor ? 24 : 22)) : (type === 'drone' ? 20 : (isSensor ? 18 : 16))
    const iconSvg = this.getSizedPhosphorSvg(type, iconSizePx)
    const pulseCircleSizePx = isSelected ? (type === 'drone' ? 64 : (isSensor ? 60 : 48)) : 0
    const pulseCircleBorderWidth = isSelected ? (type === 'drone' ? 4 : (isSensor ? 4 : 3)) : 0

    // Container size needs to accommodate the pulsing circle when selected
    const containerSizePx = isSelected ? pulseCircleSizePx : markerSizePx
    const markerOffsetPx = isSelected ? (pulseCircleSizePx - markerSizePx) / 2 : 0

    // Add red/orange glow for sensors with RF detections
    const sensorGlow = (type === 'sensor' && hasRFDetections && !isSelected)
      ? `box-shadow: 0 0 12px rgba(249, 115, 22, 0.8), 0 0 6px rgba(249, 115, 22, 0.6), inset 0 0 8px rgba(249, 115, 22, 0.3);`
      : (isSelected && isSensor ? 'box-shadow: 0 0 8px rgba(34, 211, 238, 0.6), inset 0 0 8px rgba(34, 211, 238, 0.3);' : '')
    
    const iconContainer = `
      <div class="rounded-full border-2 shadow-lg flex items-center justify-center relative z-10 transition-all duration-300" 
           style="width: ${markerSizePx}px; height: ${markerSizePx}px; background-color: ${sensorColor}; border-color: ${sensorBorderColor}; left: ${markerOffsetPx}px; top: ${markerOffsetPx}px; ${sensorGlow}">
        <div style="width: ${iconSizePx}px; height: ${iconSizePx}px; color: #fff;">
          ${iconSvg}
        </div>
      </div>
    `

    // Enhanced pulse for sensors with RF detections - use orange/red colors
    const pulseMarkup = shouldPulse
      ? `
        <div class="absolute rounded-full" style="width: ${markerSizePx}px; height: ${markerSizePx}px; background-color: ${sensorPulseColor}; animation: markerPulseOuter 4s ease-in-out infinite; left: ${markerOffsetPx}px; top: ${markerOffsetPx}px; opacity: ${isSelected ? '0.3' : (type === 'sensor' && hasRFDetections ? '0.7' : '0.6')};"></div>
        <div class="absolute rounded-full" style="width: ${markerSizePx}px; height: ${markerSizePx}px; background-color: ${sensorPulseColor}; animation: markerPulseInner 4s ease-in-out infinite; animation-delay: 0.5s; left: ${markerOffsetPx}px; top: ${markerOffsetPx}px; opacity: ${isSelected ? '0.3' : (type === 'sensor' && hasRFDetections ? '0.7' : '0.6')};"></div>
      `
      : ''
    
    // Add an outer alert ring for sensors with RF detections (moderate alert level)
    const alertRing = (type === 'sensor' && hasRFDetections && !isSelected)
      ? `<div class="absolute rounded-full border-2" style="width: ${markerSizePx + 8}px; height: ${markerSizePx + 8}px; left: ${markerOffsetPx - 4}px; top: ${markerOffsetPx - 4}px; border-color: rgba(249, 115, 22, 0.6); animation: alertRingPulse 2s ease-in-out infinite; z-index: 1;"></div>`
      : ''

    const selectionPulse = isSelected
      ? `<div class="absolute rounded-full border-blue-500 animate-pulse" style="width: ${pulseCircleSizePx}px; height: ${pulseCircleSizePx}px; left: 0; top: 0; border: ${pulseCircleBorderWidth}px solid #3b82f6; opacity: ${isSensor ? '0.7' : '0.6'}; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; z-index: 5; box-shadow: 0 0 ${isSensor ? '15px' : '10px'} rgba(59, 130, 246, ${isSensor ? '0.6' : '0.5'});"></div>`
      : ''

    const iconHtml = `
      <div class="relative transition-all duration-300" style="width: ${containerSizePx}px; height: ${containerSizePx}px;">
        ${alertRing}
        ${pulseMarkup}
        ${iconContainer}
        ${selectionPulse}
      </div>
    `

    // Update icon size and anchor based on selection state
    // Icon size includes the pulsing circle, so we need to account for that
    // containerSizePx is already defined above
    const leafletIconSize = [containerSizePx, containerSizePx]
    // Anchor is always at the center of the container (which centers on the marker)
    const leafletIconAnchor = [containerSizePx / 2, containerSizePx / 2]

    return L.divIcon({
      className: 'custom-marker',
      html: iconHtml,
      iconSize: leafletIconSize,
      iconAnchor: leafletIconAnchor
    } as any)
  }

  private getPhosphorIcon(type: string): string {
    const iconMap: Record<string, string> = {
      drone: DroneIconSvg,
      friendly: UserIconSvg,
      sensor: CellTowerIconSvg,
      radar: CrosshairIconSvg,
      threat: SkullIconSvg,
      unknown: QuestionIconSvg
    }

    return iconMap[type] ?? MapPinIconSvg
  }

  private getSizedPhosphorSvg(type: string, size: number): string {
    const svgRaw = this.getPhosphorIcon(type)
    const withoutWidth = svgRaw.replace(/width="[^"]*"/g, '').replace(/height="[^"]*"/g, '')
    return withoutWidth.replace('<svg ', `<svg width="${size}" height="${size}" `).replace('<svg', '<svg style="display:block"')
  }

  private getColorForStatus(status: string, type: string): string {
    // For inactive drones, return grey regardless of type
    if (type === 'drone' && status === 'inactive') {
      return '#6b7280' // Grey for inactive drones
    }
    
    // Use type-based colors for active markers
    switch (type) {
      case 'drone': return '#22c55e'    // Green for active drones (primary color palette)
      case 'target': return '#f59e0b'   // Yellow for RF detections
      case 'friendly': return '#3b82f6' // Blue for operators
      case 'sensor': return '#22d3ee'    // Cyan for GPS/static sensors
      case 'radar': return '#8b5cf6'    // Purple for radar
      case 'threat': return '#ef4444'   // Red for threats
      case 'unknown': return '#6b7280'  // Gray for unknown
      default: return '#3b82f6'         // Default blue
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

    // Mark this cluster as selected to hide its marker
    const previousSelectedId = this.selectedClusterId
    this.selectedClusterId = cluster.id

    // Mark this cluster as expanded to prevent re-clustering
    expandedClusters.add(cluster.id)
    
    // Track which pins belong to this expanded cluster
    const pinIds = new Set(cluster.pins.map(pin => pin.id))
    expandedClusterPins.set(cluster.id, pinIds)
    
    // If there was a previous selected cluster, remove it from expanded set
    // (only keep current one expanded)
    if (previousSelectedId && previousSelectedId !== cluster.id) {
      expandedClusters.delete(previousSelectedId)
      expandedClusterPins.delete(previousSelectedId)
    }

    // Remove the cluster marker immediately and completely
    if (cluster.marker) {
      this.map.removeLayer(cluster.marker)
      this.clusters.delete(cluster.id)
      // Clear the marker reference to prevent re-adding
      cluster.marker = null
    }

    // Add individual pins for this cluster
    cluster.pins.forEach(pin => {
      // Check if marker already exists to prevent duplication
      if (!this.markers.has(pin.id)) {
        const marker = this.createMarker(pin)
        this.markers.set(pin.id, marker)
        marker.addTo(this.map!)
      }
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

    // Clear selected cluster to allow other clusters to remain interactive
    this.selectedClusterId = null
    expandedClusters.delete(cluster.id)
    expandedClusterPins.delete(cluster.id)

    // Force immediate re-clustering so other clusters remain clickable
    setTimeout(() => {
      this.applyClustering()
    }, 50)
  }
  
  // Method to clear selected cluster (when cluster panel is closed)
  clearSelectedCluster(): void {
    const clusterIdToClear = this.selectedClusterId
    this.selectedClusterId = null
    // Also clear from expanded clusters set to allow re-clustering
    if (clusterIdToClear) {
      expandedClusters.delete(clusterIdToClear)
      expandedClusterPins.delete(clusterIdToClear)
      console.log(`[MapService] Cleared selected cluster ${clusterIdToClear}, clusters can now reappear`)
    }
    // Re-apply clustering to show cluster markers again if appropriate
    if (this.map) {
      this.applyClustering()
    }
  }
  
  // Clear all expanded clusters (useful when zooming out significantly)
  clearExpandedClusters(): void {
    const previousSize = expandedClusters.size
    expandedClusters.clear()
    if (previousSize > 0) {
      console.log(`[MapService] Cleared ${previousSize} expanded clusters`)
    }
  }
  
  // Get selected cluster ID (for external access)
  getSelectedClusterId(): string | null {
    return this.selectedClusterId
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

  zoomToMapPin(selectedPin: MapPin): void {
    if (!this.map) return

    if (this.onPinClickCallback) {
      this.onPinClickCallback(selectedPin)
    }
  }

  isClustering(): boolean {
    return isClusteringActive
  }

  // Force re-clustering (useful after expanding clusters)
  forceRecluster(): void {
    this.applyClustering()
  }

  flyTo(lat: number, lng: number, zoom: number = 15, options?: { adjustForOverlays?: boolean }): void {
    if (!this.map) return

    if (!options?.adjustForOverlays) {
      this.map.flyTo([lat, lng], zoom)
      return
    }

    const offset = this.getOverlayOffset()
    if (offset.x === 0 && offset.y === 0) {
      this.map.flyTo([lat, lng], zoom)
      return
    }

    const pinPoint = this.map.latLngToContainerPoint([lat, lng])
    const adjustedPoint = pinPoint.subtract(offset)
    const adjustedLatLng = this.map.containerPointToLatLng(adjustedPoint)
    this.map.flyTo(adjustedLatLng, zoom)
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

  private getOverlayOffset(): L.Point {
    if (!this.map) {
      return L.point(0, 0)
    }

    const container: HTMLElement = this.map.getContainer()
    const rect = container.getBoundingClientRect()
    let offsetX = 0
    let offsetY = 0

    const overlays = document.querySelectorAll<HTMLElement>('[data-map-overlay]')
    overlays.forEach((overlay) => {
      if (overlay.offsetWidth === 0 || overlay.offsetHeight === 0) {
        return
      }

      const style = window.getComputedStyle(overlay)
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) {
        return
      }

      const overlayRect = overlay.getBoundingClientRect()
      const overlapWidth = Math.max(0, Math.min(rect.right, overlayRect.right) - Math.max(rect.left, overlayRect.left))
      const overlapHeight = Math.max(0, Math.min(rect.bottom, overlayRect.bottom) - Math.max(rect.top, overlayRect.top))

      if (overlapWidth === 0 && overlapHeight === 0) {
        return
      }

      const placement = overlay.dataset.mapOverlay ?? ''

      if (placement.includes('right')) {
        offsetX += overlapWidth / 2
      } else if (placement.includes('left')) {
        offsetX -= overlapWidth / 2
      }

      if (placement.includes('bottom')) {
        offsetY += overlapHeight / 2
      } else if (placement.includes('top')) {
        offsetY -= overlapHeight / 2
      }
    })

    return L.point(offsetX, offsetY)
  }


  updateDroneTrajectories(trajectories: DroneTrajectory[]): void {
    if (!this.map) return

    const activeIds = new Set<string>()

    trajectories.forEach(trajectory => {
      // Only draw polylines when we have at least two points
      if (!trajectory.points || trajectory.points.length < 2) {
        this.removeDroneTrajectory(trajectory.droneId)
        return
      }

      const latLngs: L.LatLngExpression[] = trajectory.points.map(point => [point.lat, point.lng])
      activeIds.add(trajectory.droneId)

      let polyline = this.droneTrajectories.get(trajectory.droneId)
      if (!polyline) {
        polyline = L.polyline(latLngs, {
          color: '#22c55e',
          weight: 3,
          opacity: 1,
          lineCap: 'round'
        })
        polyline.addTo(this.map)
        this.droneTrajectories.set(trajectory.droneId, polyline)
      } else {
        polyline.setLatLngs(latLngs)
        if (!this.map.hasLayer(polyline)) {
          polyline.addTo(this.map)
        }
      }
    })

    // Remove any trajectories that are no longer active
    Array.from(this.droneTrajectories.keys()).forEach(droneId => {
      if (!activeIds.has(droneId)) {
        this.removeDroneTrajectory(droneId)
      }
    })
  }

  private removeDroneTrajectory(droneId: string): void {
    const polyline = this.droneTrajectories.get(droneId)
    if (polyline && this.map) {
      this.map.removeLayer(polyline)
    }
    this.droneTrajectories.delete(droneId)
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

  // Check if a lat/lng is visible in the current map viewport considering left panel padding
  isLatLngVisible(lat: number, lng: number, leftPaddingPx: number = 0): boolean {
    if (!this.map) return false
    const point = this.map.latLngToContainerPoint([lat, lng])
    const size = this.map.getSize()
    const minX = Math.max(0, leftPaddingPx)
    const maxX = size.x
    const minY = 0
    const maxY = size.y
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
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
      this.clearTrajectoryCheckpoints()
      this.clearDetectionRanges()
      this.droneTrajectories.forEach(polyline => {
        if (polyline) {
          this.map!.removeLayer(polyline)
        }
      })
      this.droneTrajectories.clear()
      this.detectionsById.clear()
      this.map.remove()
      this.map = null
    }
    this.markers.clear()
    this.controls.clear()
    this.onPinClickCallback = null
    this.onClusterClickCallback = null
    this.onTrajectoryPointClickCallback = null
    this.currentTileLayer = null
    this.focusState = { active: false, dronePinId: null, droneTargetId: null }
    this.highlightedDetectionId = null
    this.selectedClusterId = null
  }

  private registerDetectionMarkers(pins: MapPin[]): void {
    this.detectionsById.clear()

    pins.forEach(pin => {
      // Ensure marker exists for detection pins even though they aren't part of clustering
      let marker = this.markers.get(pin.id)
      if (!marker) {
        marker = this.createMarker(pin)
        this.markers.set(pin.id, marker)
        marker.addTo(this.map!)
      }

      const element = marker.getElement()
      if (element) {
        element.classList.remove('marker--hidden')
        element.classList.remove('marker--detection-focus')
        element.classList.remove('marker--detection-selected')
      }

      const detectionId =
        typeof pin.data?.id === 'number'
          ? pin.data.id
          : Number(String(pin.id).replace('rf-detection-', ''))

      if (!Number.isNaN(detectionId)) {
        this.detectionsById.set(detectionId, { marker, pin })
      }
    })
  }

}

// Export singleton instance
export const mapService = new MapService()

// Export class for testing
export { MapService }

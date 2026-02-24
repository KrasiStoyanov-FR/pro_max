<template>
  <LayoutWrapper>
    <template #content>
      <div class="h-full relative">
        <!-- Map view -->
        <MapView
          :pins="pins"
          @pin-selected="handlePinSelected"
          @pin-deselected="handlePinDeselected"
        />

        <div class="flex items-start justify-between p-4 lg:p-6 absolute top-16 right-0 bottom-0 left-0">
          <div class="flex flex-col items-end gap-8 self-stretch">
            <!-- Map filters overlay -->
            <MapFilters />
          </div>

          <div class="flex flex-col items-end justify-between gap-8 self-stretch">
            <!-- Status summary card overlay -->
            <StatusSummaryCard
              :is-fullscreen-mode="false"
              @open-drones-panel="handleOpenDronesPanel"
              @open-detections-panel="handleOpenDetectionsPanel"
              @open-operators-panel="handleOpenOperatorsPanel"
              @open-database-status="handleOpenDatabaseStatus"
            />

            <!-- Info Panel Overlay -->
            <InfoPanel 
              class="flex-1"
              :is-open="isInfoPanelOpen" 
              :selected-pin="selectedPin"
              :has-cluster-panel="false" 
              :focus-mode-active="mapStore.focusModeActive"
              @close="closeInfoPanel" 
              @pin-deselected="handlePinDeselected"
              @exit-focus="handleExitFocusMode" 
              @focus-detection="handleFocusDetection"
              @zoom-to-map-pin="handleZoomToPin" 
            />

            <!-- Map Controls Overlay -->
            <div class="w-10 max-h-54 flex flex-col flex-wrap space-y-1 z-10">
              <!-- Toggle layers (topmost) -->
              <button @click="toggleLayers" class="map-control-button map-control-button--inverted" title="Toggle terrain layers">
                <PhStack :size="16" class="text-current" weight="fill" />
              </button>
      
              <!-- Zoom In -->
              <button @click="zoomIn" class="map-control-button" title="Zoom In">
                <PhPlus :size="16" class="text-current" weight="bold" />
              </button>
      
              <!-- Zoom Out -->
              <button @click="zoomOut" class="map-control-button" title="Zoom Out">
                <PhMinus :size="16" class="text-current" weight="bold" />
              </button>
      
              <!-- Center to user location -->
              <button @click="centerToUserLocation" class="map-control-button" title="Center to my location">
                <PhGpsFix :size="16" class="text-current" weight="fill" />
              </button>
      
              <!-- Refresh pins -->
              <button @click="handleRefreshPins" class="map-control-button" title="Refresh map data">
                <PhArrowClockwise :size="16" class="text-current" weight="bold" />
              </button>
            </div>
          </div>
        </div>

        <!-- Add Device Button (only show if user has permission) -->
        <AddDeviceButton
          v-if="hasPermission('devices.create')"
          position="bottom-left"
          @click="openDeviceModal"
        />

        <!-- Device Creation Modal -->
        <DeviceCreationModal
          :visible="isDeviceModalOpen"
          @close="closeDeviceModal"
          @device-created="handleDeviceCreated"
        />
      </div>
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMapStore } from '@/store/map'
import { useAuth } from '@/composables/useAuth'
import { usePermissions } from '@/composables/usePermissions'
import { useMapPins } from '@/composables/useMapPins'
import { databaseApi } from '@/services/api'
import { mapService } from '@/services/mapService'
import { useDataStore } from '@/store/data'
import { PhStack, PhPlus, PhMinus, PhGpsFix, PhArrowClockwise } from '@phosphor-icons/vue'
import InfoPanel from '@/components/layout/InfoPanel.vue'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import MapView from '@/components/map/MapView.vue'
import MapFilters from '@/components/map/MapFilters.vue'
import StatusSummaryCard from '@/components/map/StatusSummaryCard.vue'
import AddDeviceButton from '@/components/devices/AddDeviceButton.vue'
import DeviceCreationModal from '@/components/devices/DeviceCreationModal.vue'
import type { MapPin, DetectionCheckpoint } from '@/types/map'
import type { GpsUnitPosition, RFDetection } from '@/types/database'

// Composables
useAuth()
const { hasPermission } = usePermissions()
const route = useRoute()
const router = useRouter()
const mapStore = useMapStore()
const dataStore = useDataStore()
const { pins: mapPins, selectedPin, initializeMap, loadPins, refreshPins, isMapReady, flyToLocation } = useMapPins()

const DEFAULT_CENTER = [42.6977, 23.3219]
const DEFAULT_ZOOM = 10

// Computed properties
const pins = computed(() => mapPins.value)

// When navigating to map with ?systemId=XXX (e.g. from Detections page sensor button), zoom to and select that sensor.
// Wait for the map instance (set by MapView's useMapPins) and pins to be ready before flying.
const pendingFlyToSystemId = ref<string | null>(null)
watch(
  [() => route.query.systemId, () => mapStore.pins, () => mapStore.mapInstance],
  ([systemId, pinsList, mapInstance]) => {
    const id = typeof systemId === 'string' ? systemId : null
    const list = Array.isArray(pinsList) ? pinsList : []
    if (!id || list.length === 0 || !mapInstance) return
    if (pendingFlyToSystemId.value === id) return
    const sensorPin = list.find(
      (p: MapPin) =>
        p.type === 'sensor' &&
        (p.data?.system_id !== undefined && p.data?.system_id !== null
          ? String(p.data.system_id) === String(id)
          : false)
    )
    if (sensorPin) {
      pendingFlyToSystemId.value = id
      // Defer fly so the map has finished rendering and has valid dimensions (e.g. after route view is shown)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            mapStore.flyToPin(sensorPin)
            router.replace({ path: '/map', query: {} })
            pendingFlyToSystemId.value = null
          }, 100)
        })
      })
    }
  },
  { immediate: true }
)

// Device modal state
const isDeviceModalOpen = ref(false)

// Info Panel State
const isInfoPanelOpen = ref(false)

// Computed
const focusedDetectionId = computed(() => mapStore.focusedDetectionId)

// Get selected detection from the selected pin's detections or search all pins
const selectedDetection = computed<DetectionCheckpoint | null>(() => {
  if (!focusedDetectionId.value) {
    return null
  }
  
  // First, check if the selected pin IS a detection (type: 'target')
  if (selectedPin.value?.type === 'target' && selectedPin.value.data) {
    const pinDetectionId = typeof selectedPin.value.data.id === 'number'
      ? selectedPin.value.data.id
      : Number(String(selectedPin.value.id).replace('rf-detection-', ''))
    
    if (pinDetectionId === focusedDetectionId.value) {
      // Convert pin data to DetectionCheckpoint format
      return {
        id: pinDetectionId,
        timestamp: selectedPin.value.data.timestamp ?? selectedPin.value.timestamp,
        frequency: selectedPin.value.data.frequency ?? null,
        signalStrength: selectedPin.value.data.signal_strength ?? null,
        status: selectedPin.value.data.detection_status ?? false,
        systemId: selectedPin.value.data.system_id ?? null,
        droneId: selectedPin.value.data.drone_id ?? null
      }
    }
  }
  
  // Second, try to find in selected pin's detections array
  if (selectedPin.value) {
    const detections = selectedPin.value.data?.detections
    if (Array.isArray(detections)) {
      const detection = detections.find((d: DetectionCheckpoint) => d.id === focusedDetectionId.value)
      if (detection) {
        return detection
      }
    }
  }
  
  // If not found, search all pins for this detection
  // This handles cases where a detector is selected and shows detections from linked drones
  for (const pin of mapStore.pins) {
    if (pin.type === 'drone' && Array.isArray(pin.data?.detections)) {
      const detection = (pin.data.detections as DetectionCheckpoint[]).find(
        (d: DetectionCheckpoint) => d.id === focusedDetectionId.value
      )
      if (detection) {
        return detection
      }
    }
  }
  
  return null
})

// Methods
const toggleLayers = () => {
  mapService.toggleLayer()
}

const zoomIn = () => {
  if (isMapReady.value) {
    mapService.zoomIn()
  }
}

const zoomOut = () => {
  if (isMapReady.value) {
    mapService.zoomOut()
  }
}

const centerToUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        flyToLocation(latitude, longitude, 15)
      },
      (error) => {
        console.error('Geolocation error:', error)
        // Fallback to default center
        flyToLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1], DEFAULT_ZOOM)
      }
    )
  } else {
    // Fallback to default center
    flyToLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1], DEFAULT_ZOOM)
  }
}

const handleRefreshPins = async () => {
  await refreshPins()
}

const handleExitFocusMode = () => {
  mapStore.exitFocusMode()
}

const handleFocusDetection = (detection: DetectionCheckpoint) => {
  console.log('[Map] handleFocusDetection called with:', detection)
  if (!detection) {
    console.warn('[Map] No detection provided')
    return
  }
  
  // Ensure info panel is open
  if (!isInfoPanelOpen.value) {
    isInfoPanelOpen.value = true
  }
  
  // Set the focused detection ID first - this will trigger the panel
  mapStore.setFocusedDetectionId(detection.id)
  console.log('[Map] Set focusedDetectionId to:', detection.id)
  
  // Find the trajectory point that matches this detection's timestamp
  const pin = selectedPin.value
  console.log('[Map] Selected pin:', pin?.id, 'has trajectory:', !!pin?.data?.trajectory)
  
  if (pin && Array.isArray(pin.data?.trajectory)) {
    const trajectory = pin.data.trajectory as any[]
    const detectionTime = new Date(detection.timestamp).getTime()
    console.log('[Map] Looking for trajectory point matching detection time:', detection.timestamp, 'in', trajectory.length, 'points')
    
    // Find the closest trajectory point to this detection's timestamp
    let closestPoint: any = null
    let closestTimeDiff = Infinity
    
    trajectory.forEach((point) => {
      const pointTime = new Date(point.timestamp).getTime()
      const timeDiff = Math.abs(pointTime - detectionTime)
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff
        closestPoint = point
      }
    })
    
    console.log('[Map] Closest point found:', closestPoint, 'time diff:', closestTimeDiff, 'ms')
    
    if (closestPoint && closestTimeDiff < 5000) { // Within 5 seconds
      // Pan to the trajectory point with zoom
      const zoomLevel = Math.max(mapStore.viewport.zoom ?? 13, 16)
      console.log('[Map] Flying to checkpoint:', closestPoint.lat, closestPoint.lng, 'zoom:', zoomLevel)
      mapService.flyTo(closestPoint.lat, closestPoint.lng, zoomLevel)
      
      // Use focusedDronePinId if available, otherwise use pin.id
      const dronePinId = mapStore.focusedDronePinId || pin.id
      console.log('[Map] Drone pin ID:', dronePinId, '(focusedDronePinId:', mapStore.focusedDronePinId, ', pin.id:', pin.id, ')')
      
      if (dronePinId) {
        // Ensure trajectory checkpoints are shown
        const trajectory = pin.data.trajectory as any[]
        if (trajectory && trajectory.length > 0) {
          const service = mapService as unknown as { showTrajectoryCheckpoints?: (dronePinId: string, points: any[]) => void }
          service.showTrajectoryCheckpoints?.(dronePinId, trajectory)
        }
        
        mapService.highlightTrajectoryCheckpoint(dronePinId, closestPoint.timestamp)
        // Also add detection-selected class with timestamp for precise matching
        const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
        service.highlightDetectionCheckpoint?.(dronePinId, detection.id, detection.timestamp)
        console.log('[Map] Highlighted checkpoint for detection:', detection.id)
      } else {
        console.warn('[Map] No drone pin ID available')
      }
    } else {
      console.warn('[Map] No matching trajectory point found or time diff too large:', closestTimeDiff, 'ms')
    }
  } else {
    console.warn('[Map] No trajectory data available in selected pin')
  }
  
  // Also try the old method for target-type pins (if they exist)
  mapService.panToDetection(detection.id)
  const service = mapService as unknown as { highlightDetection?: (id: number | null) => void }
  service.highlightDetection?.(detection.id)
}

const handleZoomToPin = (pin: MapPin) => {
  if (!pin) return
  mapStore.flyToPin(pin)
}

const closeInfoPanel = () => {
  isInfoPanelOpen.value = false
  // Only clear the pin selection, keep cluster if it exists
  mapStore.selectPin(null)
}

const handlePinSelected = () => {
  // The map store will handle the selection
  // Note: we can add custom logic here if needed, but the watcher on selectedPin handles the UI
}

const handlePinDeselected = () => {
  closeInfoPanel()
}

// Watch for detection focus changes (e.g., from trajectory checkpoint clicks)
watch(focusedDetectionId, (newId) => {
  if (newId !== null) {
    // Ensure info panel is open when a detection is focused
    if (!isInfoPanelOpen.value) {
      isInfoPanelOpen.value = true
    }
    console.log('[Map] Detection focused via watch:', newId, 'selectedDetection:', selectedDetection.value?.id)
  }
})

// Watch for pin selection to open/close info panel
watch(selectedPin, (newPin: any) => {
  console.log('[Map] selectedPin changed:', { 
    type: newPin?.type, 
    id: newPin?.id, 
    dataId: newPin?.data?.id,
    isInfoPanelOpen: isInfoPanelOpen.value 
  })
  if (newPin) {
    isInfoPanelOpen.value = true
    console.log('[Map] InfoPanel opened for pin:', newPin.type, newPin.id)
  } else {
    isInfoPanelOpen.value = false
  }
})

// Watch for panel visibility changes to update available viewport
watch([() => false /* mapStore.hasSelectedCluster disabled */, isInfoPanelOpen], () => {
  // Calculate panel widths based on visibility
  const clusterWidth = 0
  const infoWidth = isInfoPanelOpen.value ? 320 : 0 // w-64 lg:w-80 = 256px + 64px = 320px

  // Update the available viewport
  mapStore.updateAvailableViewport({
    cluster: clusterWidth,
    info: infoWidth
  })
}, { immediate: true })

const openDeviceModal = () => {
  // Check permission before opening modal
  if (!hasPermission('devices.create')) {
    window.alert('You do not have permission to create devices.')
    return
  }
  isDeviceModalOpen.value = true
}

const closeDeviceModal = () => {
  isDeviceModalOpen.value = false
}

const handleDeviceCreated = async (createdDevice: GpsUnitPosition): Promise<void> => {
  try {

    // Parse coordinates - handle both standard and actual database column names
    const parseCoordinate = (value: unknown): number | null => {
      if (value === null || value === undefined) return null
      const numeric = typeof value === 'string' ? parseFloat(value) : value
      return Number.isFinite(numeric as number) ? (numeric as number) : null
    }

    // Try actual database column names first (gps_lat, gps_lon), then fallback to standard names
    const lat = parseCoordinate((createdDevice as any)?.gps_lat) ??
                parseCoordinate(createdDevice.latitude) ?? 
                parseCoordinate((createdDevice as any)?.lat) ?? 
                parseCoordinate((createdDevice as any)?.latitude_deg)
    const lng = parseCoordinate((createdDevice as any)?.gps_lon) ??
                parseCoordinate(createdDevice.longitude) ?? 
                parseCoordinate((createdDevice as any)?.lng) ?? 
                parseCoordinate((createdDevice as any)?.longitude_deg)

    if (lat === null || lng === null) {
      throw new Error('Invalid GPS coordinates for device')
    }

    // Determine status - check if backend reports it as connected/active
    const statusRaw = typeof createdDevice.status === 'string' ? createdDevice.status.toLowerCase() : null
    const isActive = statusRaw === 'active' || statusRaw === 'online' || statusRaw === 'connected' || statusRaw === 'running'

    // Get device name - try actual column name (unit_name) first, then fallback to name
    const deviceName = (createdDevice as any)?.unit_name ?? createdDevice.name ?? null
    
    // Build the same unique key as useMapPins (baseKey + lat + lng + optional time)
    const baseKey =
      (typeof createdDevice.unit_id !== 'undefined' && createdDevice.unit_id !== null ? String(createdDevice.unit_id) : null) ??
      (createdDevice.system_id ?? null) ??
      ((createdDevice as any)?.unit_name ?? null) ??
      (createdDevice.name ?? 'unknown')

    const keyParts = [String(baseKey), String(lat), String(lng)]
    if ((createdDevice as any)?.time) {
      keyParts.push(String((createdDevice as any).time))
    }
    const unitKey = keyParts.join(':')

    // Create a map pin for the new device (matching the format used in useMapPins)
    const devicePin: MapPin = {
      id: `gps-unit-${unitKey}`,
      lat,
      lng,
      title: deviceName || `RF Receiver ${unitKey}`,
      description: createdDevice.status 
        ? `Detection Source • Status: ${createdDevice.status}` 
        : 'RF Detection Receiver • Active monitoring',
      type: 'sensor',
      status: isActive ? 'active' : 'inactive',
      priority: 'medium',
      timestamp: createdDevice.time || new Date().toISOString(),
      data: {
        unit_id: createdDevice.unit_id ?? null,
        system_id: createdDevice.system_id ?? null,
        status: createdDevice.status,
        timestamp: createdDevice.time ?? null,
        detection_range_km: 1.5
        // Note: Additional fields (location, partNumber, additionalInfo) are not stored in the database schema
        // They could be stored in a separate metadata table or added to the schema if needed
      }
    }

    // Clear API cache to ensure we get fresh data
    databaseApi.clearCache()

    // Refresh sensor list in data store first to ensure we have the latest data
    // This ensures the new device appears in the sensors page without page refresh
    await dataStore.fetchGpsUnitPositions(undefined, true)

    // Small delay to ensure database has processed the insert
    await new Promise(resolve => setTimeout(resolve, 300))

    // Refresh all pins from the database to show ALL devices (including the newly created one)
    // This ensures we see all previously created devices, not just the last one
    // Pass clearCacheFirst=true to ensure we get fresh data
    await refreshPins(true)

    // Find the newly created device pin in the refreshed pins
    // Reuse the unitKey that was already declared above
    const newDevicePinId = `gps-unit-${unitKey}`
    console.log('[Map] Looking for new device pin:', newDevicePinId, 'Total pins:', mapStore.pins.length)
    const newDevicePin = mapStore.pins.find(pin => pin.id === newDevicePinId)

    if (newDevicePin) {
      console.log('[Map] Found new device pin, focusing and zooming:', newDevicePin.id, 'Map ready:', isMapReady.value)
      
      // Focus and zoom on the newly created device
      if (isMapReady.value) {
        // Use flyToPin which handles both selection and map movement
        mapStore.flyToPin(newDevicePin)
        
        // Also ensure map service flies to the location with appropriate zoom
        // This ensures the zoom level is set correctly (flyToPin might use current zoom)
        // Wait a bit to ensure map service has processed the pins
        setTimeout(() => {
          if (mapService) {
            console.log('[Map] Flying to device location:', lat, lng)
            mapService.flyTo(lat, lng, 15, { adjustForOverlays: true })
          }
        }, 300)
      } else {
        // Map not ready yet, wait for it
        console.log('[Map] Map not ready, waiting...')
        const checkMapReady = setInterval(() => {
          if (isMapReady.value) {
            clearInterval(checkMapReady)
            console.log('[Map] Map ready, focusing on device')
            mapStore.flyToPin(newDevicePin)
            setTimeout(() => {
              if (mapService) {
                mapService.flyTo(lat, lng, 15, { adjustForOverlays: true })
              }
            }, 300)
          }
        }, 100)
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkMapReady)
          console.warn('[Map] Timeout waiting for map to be ready')
        }, 5000)
      }
    } else {
      console.warn('[Map] New device pin not found after refresh, pin ID:', newDevicePinId, 'Available pins:', mapStore.pins.map(p => p.id))
      // Fallback: if pin not found after refresh, add it manually and zoom
      mapStore.addPin(devicePin)
      if (mapService && isMapReady.value) {
        mapService.addPins([devicePin], mapStore.visibleMarkerTypes)
        setTimeout(() => {
          mapService.flyTo(lat, lng, 15, { adjustForOverlays: true })
        }, 300)
      }
      mapStore.flyToPin(devicePin)
    }

    // Close modal on success
    closeDeviceModal()
  } catch (error) {
    console.error('Failed to create device:', error)
    // Re-throw error so modal can display it
    // The modal will need to handle this via a prop or we need to refactor
    throw error
  }
}

// Status card panel handlers
const handleOpenDronesPanel = () => {
  // TODO: Implement drones panel
  console.log('Open drones panel')
}

const handleOpenDetectionsPanel = () => {
  // TODO: Implement detections panel
  console.log('Open detections panel')
}

const handleOpenOperatorsPanel = () => {
  // TODO: Implement operators panel
  console.log('Open operators panel')
}

const handleOpenDatabaseStatus = () => {
  // TODO: Implement database status modal
  console.log('Open database status')
}

// Helper function to convert GpsUnitPosition to MapPin
const convertDeviceToPin = (unit: GpsUnitPosition): MapPin | null => {
  const parseCoordinate = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    const numeric = typeof value === 'string' ? parseFloat(value) : value
    return Number.isFinite(numeric as number) ? (numeric as number) : null
  }

  const lat = parseCoordinate((unit as any)?.gps_lat) ??
              parseCoordinate(unit.latitude) ?? 
              parseCoordinate((unit as any)?.lat) ?? 
              parseCoordinate((unit as any)?.latitude_deg)
  const lng = parseCoordinate((unit as any)?.gps_lon) ??
              parseCoordinate(unit.longitude) ?? 
              parseCoordinate((unit as any)?.lng) ?? 
              parseCoordinate((unit as any)?.longitude_deg)

  if (lat === null || lng === null) {
    return null
  }

  const statusRaw = typeof unit.status === 'string' ? unit.status.toLowerCase() : null
  const isActive = statusRaw === 'active' || statusRaw === 'online' || statusRaw === 'connected' || statusRaw === 'running'
  const deviceName = (unit as any)?.unit_name ?? unit.name ?? null
  const unitKey = unit.system_id ?? (typeof unit.unit_id !== 'undefined' ? String(unit.unit_id) : String((unit as any)?.id ?? 'unknown'))

  return {
    id: `gps-unit-${unitKey}`,
    lat,
    lng,
    title: deviceName || `RF Receiver ${unitKey}`,
    description: unit.status 
      ? `Detection Source • Status: ${unit.status}` 
      : 'RF Detection Receiver • Active monitoring',
    type: 'sensor',
    status: isActive ? 'active' : 'inactive',
    priority: 'medium',
    timestamp: unit.time || new Date().toISOString(),
    data: {
      unit_id: unit.unit_id ?? null,
      system_id: unit.system_id ?? null,
      status: unit.status,
      timestamp: unit.time ?? null,
      detection_range_km: 1.5
    }
  }
}

// Helper function to convert RFDetection to MapPin (simplified - detections are usually shown as part of drone pins)
const convertDetectionToPin = (detection: RFDetection): MapPin | null => {
  // Try to extract coordinates from detection
  const parseCoordinate = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    const numeric = typeof value === 'string' ? parseFloat(value) : value
    return Number.isFinite(numeric as number) ? (numeric as number) : null
  }

  const lat = parseCoordinate((detection as any)?.latitude) ??
              parseCoordinate((detection as any)?.lat) ??
              parseCoordinate((detection as any)?.latitude_deg) ??
              parseCoordinate((detection as any)?.gps_lat)
  const lng = parseCoordinate((detection as any)?.longitude) ??
              parseCoordinate((detection as any)?.lon) ??
              parseCoordinate((detection as any)?.lng) ??
              parseCoordinate((detection as any)?.longitude_deg) ??
              parseCoordinate((detection as any)?.gps_lon)

  if (lat === null || lng === null) {
    return null
  }

  const detectionId = detection.id ?? (detection as any)?._id ?? 'unknown'
  const systemId = detection.system_id ?? detection.drone_id ?? null

  return {
    id: `rf-detection-${detectionId}`,
    lat,
    lng,
    title: `RF Detection ${detectionId}`,
    description: detection.type ? `Type: ${detection.type}` : 'RF Detection',
    type: 'target',
    status: 'active',
    priority: 'high',
    timestamp: detection.time || new Date().toISOString(),
    data: {
      id: detectionId,
      system_id: systemId,
      detection: detection
    }
  }
}

// Watch for new devices in the data store
const { gpsUnitPositionsList } = storeToRefs(dataStore)
let previousDeviceIds = new Set<string>()

watch(gpsUnitPositionsList, (newDevices) => {
  if (!newDevices || newDevices.length === 0) return

  const currentDeviceIds = new Set(
    newDevices.map(unit => {
      const unitKey = unit.system_id ?? (typeof unit.unit_id !== 'undefined' ? String(unit.unit_id) : String((unit as any)?.id ?? 'unknown'))
      return `gps-unit-${unitKey}`
    })
  )

  // Find new devices that weren't in the previous set
  const newDeviceEntries = newDevices.filter(unit => {
    const unitKey = unit.system_id ?? (typeof unit.unit_id !== 'undefined' ? String(unit.unit_id) : String((unit as any)?.id ?? 'unknown'))
    const pinId = `gps-unit-${unitKey}`
    return !previousDeviceIds.has(pinId)
  })

  // Add new devices to the map
  if (newDeviceEntries.length > 0) {
    newDeviceEntries.forEach(unit => {
      const pin = convertDeviceToPin(unit)
      if (pin) {
        // Check if pin already exists to avoid duplicates
        const existingPin = mapStore.pins.find(p => p.id === pin.id)
        if (!existingPin) {
          mapStore.addPin(pin)
          if (mapService) {
            mapService.addPins([pin], mapStore.visibleMarkerTypes)
          }
          console.log('[Map] Added new device to map:', pin.id)
        }
      }
    })
  }

  // Update the previous set for next comparison
  previousDeviceIds = currentDeviceIds
}, { deep: true })

// Watch for new detections in the data store
const { rfDetectionsList } = storeToRefs(dataStore)
let previousDetectionIds = new Set<string | number>()

watch(rfDetectionsList, (newDetections) => {
  if (!newDetections || newDetections.length === 0) return

  const currentDetectionIds = new Set(
    newDetections.map(det => det.id ?? (det as any)?._id ?? 'unknown')
  )

  // Find new detections that weren't in the previous set
  const newDetectionEntries = newDetections.filter(det => {
    const detectionId = det.id ?? (det as any)?._id ?? 'unknown'
    return !previousDetectionIds.has(detectionId)
  })

  // Add new detections to the map
  if (newDetectionEntries.length > 0) {
    // Note: Most detections are shown as part of drone pins, but standalone detections with coordinates can be shown
    newDetectionEntries.forEach(detection => {
      const pin = convertDetectionToPin(detection)
      if (pin) {
        // Check if pin already exists to avoid duplicates
        const existingPin = mapStore.pins.find(p => p.id === pin.id)
        if (!existingPin) {
          mapStore.addPin(pin)
          if (mapService) {
            mapService.addPins([pin], mapStore.visibleMarkerTypes)
          }
          console.log('[Map] Added new detection to map:', pin.id)
        }
      }
    })
  }

  // Update the previous set for next comparison
  previousDetectionIds = currentDetectionIds
}, { deep: true })

// Lifecycle
onMounted(() => {
  // Show loading as soon as we're on the map page (before MapView initializes)
  if (route.path === '/map' && !mapStore.mapInstance) {
    mapStore.setLoading(true)
  }
  // Initialize previous sets with current data
  if (gpsUnitPositionsList.value) {
    previousDeviceIds = new Set(
      gpsUnitPositionsList.value.map(unit => {
        const unitKey = unit.system_id ?? (typeof unit.unit_id !== 'undefined' ? String(unit.unit_id) : String((unit as any)?.id ?? 'unknown'))
        return `gps-unit-${unitKey}`
      })
    )
  }
  if (rfDetectionsList.value) {
    previousDetectionIds = new Set(
      rfDetectionsList.value.map(det => det.id ?? (det as any)?._id ?? 'unknown')
    )
  }
  
  // Map will load real database data automatically via useMapPins composable
})

onBeforeUnmount(() => {
  // Cleanup watchers
  previousDeviceIds.clear()
  previousDetectionIds.clear()
})
</script>


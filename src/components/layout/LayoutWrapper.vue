<template>
  <div class="h-screen flex bg-neutral-900">
    <!-- Info Panel -->
    <Sidebar :is-collapsed="isSidebarCollapsed" @toggle="isSidebarCollapsed = !isSidebarCollapsed" />

    <!-- Main Content -->
    <main class="flex flex-1 flex-col items-stretch">
      <!-- Top Navigation -->
      <TopNav />

      <div class="flex-1 flex overflow-hidden relative">
        <div class="flex justify-start p-4 absolute top-0 right-0 bottom-0 left-0 z-10 pointer-events-none lg:p-6">
          <!-- Cluster info panel -->
          <ClusterInfoPanel :cluster="selectedCluster as any" @close="handleClusterClose"
            @select-pin="handlePinFromCluster" @zoom-to-cluster="handleZoomToCluster" />

          <!-- Info Panel -->
          <InfoPanel :is-open="isInfoPanelOpen" :selected-pin="selectedPin"
            :has-cluster-panel="mapStore.hasSelectedCluster" :focus-mode-active="mapStore.focusModeActive"
            @close="closeInfoPanel" @pin-deselected="handlePinDeselected"
            @exit-focus="handleExitFocusMode" @focus-detection="handleFocusDetection" />
        </div>

        <!-- Detection Details Panel (bottom panel) -->
        <div class="absolute left-0 right-0 bottom-0 z-40 pointer-events-none" style="padding: 1rem;">
          <DetectionDetailsPanel :selected-detection="selectedDetection" @close="handleDetectionClose" />
        </div>

        <!-- Map/Content Area -->
        <div class="flex-1 overflow-hidden relative z-0">
          <slot name="content" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMapStore } from '@/store/map'
import ClusterInfoPanel from '@/components/map/ClusterInfoPanel.vue'
import DetectionDetailsPanel from '@/components/map/DetectionDetailsPanel.vue'
import { mapService } from '@/services/mapService'
import InfoPanel from './InfoPanel.vue'
import Sidebar from './Sidebar.vue'
import TopNav from './TopNav.vue'
import type { DetectionCheckpoint } from '@/types/map'

// Props
interface Props {
  defaultInfoPanelOpen?: boolean
  defaultSidebarCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultInfoPanelOpen: false,
  defaultSidebarCollapsed: true, // False by design
})

// State
const isInfoPanelOpen = ref(props.defaultInfoPanelOpen)
const isSidebarCollapsed = ref(props.defaultSidebarCollapsed)

// Store
const mapStore = useMapStore()

// Computed
const selectedPin = computed(() => mapStore.selectedPin)
const selectedCluster = computed(() => mapStore.selectedCluster)
const focusedDetectionId = computed(() => mapStore.focusedDetectionId)

// Get selected detection from the selected pin's detections
const selectedDetection = computed<DetectionCheckpoint | null>(() => {
  if (!focusedDetectionId.value || !selectedPin.value) {
    console.log('[LayoutWrapper] No selectedDetection - focusedDetectionId:', focusedDetectionId.value, 'selectedPin:', selectedPin.value?.id)
    return null
  }
  
  const detections = selectedPin.value.data?.detections
  if (!Array.isArray(detections)) {
    console.log('[LayoutWrapper] No detections array in selectedPin.data')
    return null
  }
  
  const detection = detections.find((d: DetectionCheckpoint) => d.id === focusedDetectionId.value) || null
  console.log('[LayoutWrapper] selectedDetection:', detection?.id, 'from', detections.length, 'detections')
  return detection
})

// Methods

const handleClusterClose = () => {
  mapStore.clearSelection()
  // Clear selected cluster in map service to show cluster markers again
  mapService.clearSelectedCluster()
}

const handlePinFromCluster = (pin: any) => {
  // Select the individual pin but keep the cluster selection
  mapStore.selectPin(pin, true) // keepCluster = true
  // TODO: Implement the expandable side panel for individual pin details
}

const handleZoomToCluster = (cluster: any) => {
  // Use the expandCluster method to show individual pins
  mapService.expandCluster(cluster)
}

const handleExitFocusMode = () => {
  mapStore.exitFocusMode()
}

const handleFocusDetection = (detection: DetectionCheckpoint) => {
  console.log('[LayoutWrapper] handleFocusDetection called with:', detection)
  if (!detection) {
    console.warn('[LayoutWrapper] No detection provided')
    return
  }
  
  // Set the focused detection ID first - this will trigger the panel
  mapStore.setFocusedDetectionId(detection.id)
  console.log('[LayoutWrapper] Set focusedDetectionId to:', detection.id)
  
  // Find the trajectory point that matches this detection's timestamp
  const selectedPin = mapStore.selectedPin
  console.log('[LayoutWrapper] Selected pin:', selectedPin?.id, 'has trajectory:', !!selectedPin?.data?.trajectory)
  
  if (selectedPin && Array.isArray(selectedPin.data?.trajectory)) {
    const trajectory = selectedPin.data.trajectory as any[]
    const detectionTime = new Date(detection.timestamp).getTime()
    console.log('[LayoutWrapper] Looking for trajectory point matching detection time:', detection.timestamp, 'in', trajectory.length, 'points')
    
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
    
    console.log('[LayoutWrapper] Closest point found:', closestPoint, 'time diff:', closestTimeDiff, 'ms')
    
    if (closestPoint && closestTimeDiff < 5000) { // Within 5 seconds
      // Pan to the trajectory point with zoom
      const zoomLevel = Math.max(mapStore.viewport.zoom ?? 13, 16)
      console.log('[LayoutWrapper] Flying to checkpoint:', closestPoint.lat, closestPoint.lng, 'zoom:', zoomLevel)
      mapService.flyTo(closestPoint.lat, closestPoint.lng, zoomLevel)
      
      // Use focusedDronePinId if available, otherwise use selectedPin.id
      const dronePinId = mapStore.focusedDronePinId || selectedPin.id
      console.log('[LayoutWrapper] Drone pin ID:', dronePinId, '(focusedDronePinId:', mapStore.focusedDronePinId, ', selectedPin.id:', selectedPin.id, ')')
      
      if (dronePinId) {
        // Ensure trajectory checkpoints are shown
        const trajectory = selectedPin.data.trajectory as any[]
        if (trajectory && trajectory.length > 0) {
          const service = mapService as unknown as { showTrajectoryCheckpoints?: (dronePinId: string, points: any[]) => void }
          service.showTrajectoryCheckpoints?.(dronePinId, trajectory)
        }
        
        mapService.highlightTrajectoryCheckpoint(dronePinId, closestPoint.timestamp)
        // Also add detection-selected class with timestamp for precise matching
        const service = mapService as unknown as { highlightDetectionCheckpoint?: (dronePinId: string, detectionId: number | null, detectionTimestamp?: string) => void }
        service.highlightDetectionCheckpoint?.(dronePinId, detection.id, detection.timestamp)
        console.log('[LayoutWrapper] Highlighted checkpoint for detection:', detection.id)
      } else {
        console.warn('[LayoutWrapper] No drone pin ID available')
      }
    } else {
      console.warn('[LayoutWrapper] No matching trajectory point found or time diff too large:', closestTimeDiff, 'ms')
    }
  } else {
    console.warn('[LayoutWrapper] No trajectory data available in selected pin')
  }
  
  // Also try the old method for target-type pins (if they exist)
  mapService.panToDetection(detection.id)
  const service = mapService as unknown as { highlightDetection?: (id: number | null) => void }
  service.highlightDetection?.(detection.id)
}

const handleDetectionClose = () => {
  mapStore.setFocusedDetectionId(null)
  const service = mapService as unknown as { highlightDetection?: (id: number | null) => void }
  service.highlightDetection?.(null)
}

const closeInfoPanel = () => {
  isInfoPanelOpen.value = false
  // Only clear the pin selection, keep cluster if it exists
  mapStore.selectPin(null)
}

const handlePinDeselected = () => {
  closeInfoPanel()
}

// Watch for pin selection to open/close info panel
watch(() => mapStore.selectedPin, (newPin: any) => {
  if (newPin) {
    isInfoPanelOpen.value = true
  } else {
    isInfoPanelOpen.value = false
  }
})

// Watch for panel visibility changes to update available viewport
watch([() => mapStore.hasSelectedCluster, isInfoPanelOpen], () => {
  // Calculate panel widths based on visibility
  const clusterWidth = mapStore.hasSelectedCluster ? 320 : 0 // w-64 lg:w-80 = 256px + 64px = 320px
  const infoWidth = isInfoPanelOpen.value ? 320 : 0 // w-64 lg:w-80 = 256px + 64px = 320px

  // Update the available viewport
  mapStore.updateAvailableViewport({
    cluster: clusterWidth,
    info: infoWidth
  })
}, { immediate: true })
</script>

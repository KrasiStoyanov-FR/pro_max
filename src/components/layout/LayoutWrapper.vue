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
            :has-cluster-panel="mapStore.hasSelectedCluster" @close="closeInfoPanel"
            @pin-deselected="handlePinDeselected" />
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
import { useMapPins } from '@/composables/useMapPins'
import { mapService } from '@/services/mapService'
import InfoPanel from './InfoPanel.vue'
import Sidebar from './Sidebar.vue'
import TopNav from './TopNav.vue'

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

// Methods

const handleClusterClose = () => {
  mapStore.clearSelection()
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

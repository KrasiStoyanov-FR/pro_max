<template>
  <div class="h-screen flex bg-neutral-900">
    <!-- Info Panel -->
    <Sidebar :is-collapsed="isSidebarCollapsed" @toggle="isSidebarCollapsed = !isSidebarCollapsed" />

    <!-- Main Content -->
    <main class="flex flex-1 flex-col items-stretch">
      <!-- Top Navigation -->
      <TopNav />

      <div class="flex-1 flex overflow-hidden relative">
        <!-- Map/Content Area -->
        <div class="flex-1 overflow-hidden relative">
          <slot name="content" />
        </div>

        <!-- Info Panel -->
        <InfoPanel :is-open="isInfoPanelOpen" :selected-pin="selectedPin" @close="closeInfoPanel"
          @pin-deselected="handlePinDeselected" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMapStore } from '@/store/map'
import InfoPanel from './InfoPanel.vue'
import Sidebar from './Sidebar.vue'
import TopNav from './TopNav.vue'

// Props
interface Props {
  defaultInfoPanelOpen?: boolean
  defaultSidebarCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultInfoPanelOpen: true,
  defaultSidebarCollapsed: false,
})

// State
const isInfoPanelOpen = ref(props.defaultInfoPanelOpen)
const isSidebarCollapsed = ref(props.defaultSidebarCollapsed)

// Store
const mapStore = useMapStore()

// Computed
const selectedPin = computed(() => mapStore.selectedPin)

// Methods
const closeInfoPanel = () => {
  isInfoPanelOpen.value = false
  mapStore.clearSelection()
}

const handlePinDeselected = () => {
  closeInfoPanel()
}

// Watch for pin selection to open info panel
watch(() => mapStore.selectedPin, (newPin: any) => {
  if (newPin) {
    isInfoPanelOpen.value = true
  }
})
</script>

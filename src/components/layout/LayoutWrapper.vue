<template>
  <div class="h-screen flex flex-col bg-gray-900">
    <!-- Top Navigation -->
    <TopNav />
    
    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Map/Content Area -->
      <div class="flex-1 overflow-hidden relative">
        <slot name="content" />
      </div>
      
      <!-- Info Panel -->
      <InfoPanel 
        :is-open="isInfoPanelOpen"
        :selected-pin="selectedPin"
        @close="closeInfoPanel"
        @pin-deselected="handlePinDeselected"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMapStore } from '@/store/map'
import TopNav from './TopNav.vue'
import InfoPanel from './InfoPanel.vue'

// Props
interface Props {
  defaultInfoPanelOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultInfoPanelOpen: true
})

// State
const isInfoPanelOpen = ref(props.defaultInfoPanelOpen)

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

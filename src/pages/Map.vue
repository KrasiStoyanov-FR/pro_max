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

        <!-- Status summary card overlay -->
        <StatusSummaryCard
          :is-fullscreen-mode="false"
          @open-drones-panel="handleOpenDronesPanel"
          @open-detections-panel="handleOpenDetectionsPanel"
          @open-operators-panel="handleOpenOperatorsPanel"
          @open-database-status="handleOpenDatabaseStatus"
        />
      </div>
    </template>
  </LayoutWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMapStore } from '@/store/map'
import { useAuth } from '@/composables/useAuth'
import { useMapPins } from '@/composables/useMapPins'
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import MapView from '@/components/map/MapView.vue'
import StatusSummaryCard from '@/components/map/StatusSummaryCard.vue'

// Composables
useAuth()
const mapStore = useMapStore()
const { pins: mapPins, selectedPin, initializeMap, loadPins } = useMapPins()

// Computed properties
const pins = computed(() => mapPins.value)

// Methods
const handlePinSelected = () => {
  // The map store will handle the selection
}

const handlePinDeselected = () => {
  // The map store will handle the deselection
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

// Lifecycle
onMounted(() => {
  // Map will load real database data automatically via useMapPins composable
})
</script>


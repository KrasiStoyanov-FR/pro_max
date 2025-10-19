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
        <StatusSummaryCard />
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

// Lifecycle
onMounted(() => {
  // Map will load real database data automatically via useMapPins composable
})
</script>


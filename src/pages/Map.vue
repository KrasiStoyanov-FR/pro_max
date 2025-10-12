<template>
  <LayoutWrapper>
    <template #content>
      <div class="h-full relative">
        <!-- Map view -->
        <MapView
          :pins="pins"
          :center="[39.8283, -98.5795]"
          :zoom="4"
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
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue'
import MapView from '@/components/map/MapView.vue'
import StatusSummaryCard from '@/components/map/StatusSummaryCard.vue'

// Composables
const { user } = useAuth()
const mapStore = useMapStore()

// Computed properties
const pins = computed(() => mapStore.pins)
const totalPins = computed(() => mapStore.pinsCount)
const activePins = computed(() => 
  mapStore.pins.filter(pin => pin.status === 'active').length
)
const criticalPins = computed(() => 
  mapStore.pins.filter(pin => pin.status === 'critical').length
)

// Methods
const handlePinSelected = (pin: any) => {
  console.log('Pin selected:', pin)
  // The map store will handle the selection
}

const handlePinDeselected = () => {
  console.log('Pin deselected')
  // The map store will handle the deselection
}

// Lifecycle
onMounted(() => {
  // Initialize the map store with mock data
  // This will be replaced with real API calls
  console.log('Map mounted, user:', user.value)
})
</script>


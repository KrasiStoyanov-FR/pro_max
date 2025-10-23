<template>
  <div
    class="h-full flex flex-col rounded-2xl bg-neutral-900/40 backdrop-blur-3xl transition-all duration-300 ease-out z-10 overflow-hidden"
    :class="[
      cluster ? 'w-64 lg:w-80 opacity-100 visible translate-x-0 pointer-events-auto' : 'w-0 opacity-0 invisible -translate-x-4 pointer-events-none'
    ]" :style="{ transitionDelay: cluster ? '0ms' : '0ms' }">

    <!-- Content wrapper with proper visibility control -->
    <div v-if="cluster" class="flex flex-col h-full min-w-0 transition-opacity duration-200 ease-out"
      :class="[cluster ? 'opacity-100' : 'opacity-0 pointer-events-none']"
      :style="{ transitionDelay: cluster ? '100ms' : '0ms' }">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral-700/50">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
            <span class="text-neutral-900 font-bold text-sm">{{ cluster.pins.length }}</span>
          </div>
          <div>
            <h3 class="text-white font-semibold">Pin Cluster</h3>
            <!-- <p class="text-neutral-400 text-xs">{{ cluster.pins.length }} items grouped</p> -->
          </div>
        </div>
        <button @click="closePanel" class="text-neutral-400 hover:text-white transition-colors">
          <PhX :size="20" weight="bold" />
        </button>
      </div>

      <!-- Filter Controls -->
      <div class="p-4 border-b border-neutral-700/50">
        <div class="flex items-center space-x-2 mb-3">
          <PhFunnelSimple :size="16" class="text-neutral-400" />
          <span class="text-neutral-300 text-sm font-medium">Filter by type</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="type in availableTypes" :key="type" @click="toggleTypeFilter(type)" :class="[
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            selectedTypes.includes(type)
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          ]">
            {{ type }} ({{ getTypeCount(type) }})
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="p-4 border-b border-neutral-700/50">
        <div class="relative">
          <PhMagnifyingGlass :size="16" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
          <input v-model="searchQuery" type="text" placeholder="Search pins..."
            class="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white text-sm placeholder-neutral-400 focus:outline-none focus:border-primary-500" />
        </div>
      </div>

      <!-- Pin List -->
      <div ref="pinListContainer" class="flex-1 overflow-y-auto">
        <div v-if="filteredPins.length === 0" class="p-4 text-center text-neutral-400 text-sm">
          No pins match your filters
        </div>
        <div v-else class="divide-y divide-neutral-700/50">
          <div v-for="pin in filteredPins" :key="pin.id" @click="selectPin(pin)" :data-pin-id="pin.id" :class="[
            'p-3 cursor-pointer transition-colors',
            isSelectedPin(pin)
              ? 'bg-neutral-800'
              : 'hover:bg-neutral-800/50'
          ]">
            <div class="flex items-center space-x-3">
              <!-- Pin Icon -->
              <div class="flex-shrink-0">
                <div :class="[
                  'w-6 h-6 rounded-full border-2 border-white flex items-center justify-center',
                  getPinColor(pin.status)
                ]">
                  <PhMapPin :size="12" class="text-white" weight="fill" />
                </div>
              </div>

              <!-- Pin Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h4 class="text-white font-medium text-sm truncate">{{ pin.title }}</h4>
                  <span class="text-xs text-neutral-400">{{ pin.type }}</span>
                </div>
                <p class="text-neutral-400 text-xs truncate">{{ pin.description }}</p>
                <div class="flex items-center space-x-2 mt-1">
                  <span class="text-xs text-neutral-500">{{ pin.status }}</span>
                  <span class="text-xs text-neutral-500">•</span>
                  <span class="text-xs text-neutral-500">{{ formatTimestamp(pin.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-neutral-700/50">
        <div class="flex items-center justify-between text-xs text-neutral-400">
          <span>{{ filteredPins.length }} of {{ cluster.pins.length }} pins</span>
          <button @click="zoomToCluster" class="text-primary-400 hover:text-primary-300 transition-colors">
            Zoom to cluster
          </button>
        </div>
      </div>
    </div> <!-- Close content wrapper -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { PhX, PhFunnelSimple, PhMagnifyingGlass, PhMapPin } from '@phosphor-icons/vue'
import type { MapPin } from '@/types/map'
import type { PinCluster } from '@/services/mapService'
import { useMapStore } from '@/store/map'

// Props
interface Props {
  cluster: PinCluster | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'close': []
  'select-pin': [pin: MapPin]
  'zoom-to-cluster': [cluster: PinCluster]
}>()

// State
const searchQuery = ref('')
const selectedTypes = ref<string[]>([])
const pinListContainer = ref<HTMLElement>()

// Store
const mapStore = useMapStore()

// Computed
const availableTypes = computed(() => {
  if (!props.cluster) return []
  const types = new Set(props.cluster.pins.map(pin => pin.type))
  return Array.from(types).sort()
})

const filteredPins = computed(() => {
  if (!props.cluster) return []

  let pins = props.cluster.pins

  // Filter by type
  if (selectedTypes.value.length > 0) {
    pins = pins.filter(pin => selectedTypes.value.includes(pin.type))
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    pins = pins.filter(pin =>
      pin.title.toLowerCase().includes(query) ||
      pin.description?.toLowerCase().includes(query) ||
      pin.type.toLowerCase().includes(query)
    )
  }

  return pins
})

// Computed for selected pin
const selectedPin = computed(() => mapStore.selectedPin)

// Methods
const isSelectedPin = (pin: MapPin) => {
  return selectedPin.value?.id === pin.id
}

const scrollToSelectedPin = async () => {
  if (!selectedPin.value || !pinListContainer.value) return

  await nextTick()

  // Find the selected pin element
  const selectedElement = pinListContainer.value.querySelector(`[data-pin-id="${selectedPin.value.id}"]`)
  if (selectedElement) {
    selectedElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }
}
const closePanel = () => {
  emit('close')
}

const selectPin = (pin: MapPin) => {
  // Zoom to the pin on the map
  mapStore.flyToPin(pin)
  // Emit the select-pin event to update the info panel
  emit('select-pin', pin)
}

const zoomToCluster = () => {
  if (props.cluster) {
    emit('zoom-to-cluster', props.cluster)
  }
}

const toggleTypeFilter = (type: string) => {
  const index = selectedTypes.value.indexOf(type)
  if (index > -1) {
    selectedTypes.value.splice(index, 1)
  } else {
    selectedTypes.value.push(type)
  }
}

const getTypeCount = (type: string) => {
  if (!props.cluster) return 0
  return props.cluster.pins.filter(pin => pin.type === type).length
}

const getPinColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-500'
    case 'critical': return 'bg-red-500'
    case 'warning': return 'bg-yellow-500'
    case 'inactive': return 'bg-blue-500'
    default: return 'bg-gray-500'
  }
}

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'Unknown'
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  } catch {
    return 'Invalid'
  }
}

// Watch for selected pin changes to scroll to it
watch(selectedPin, () => {
  if (selectedPin.value && props.cluster) {
    scrollToSelectedPin()
  }
}, { immediate: true })

// Watch for cluster changes to reset filters
watch(() => props.cluster, () => {
  searchQuery.value = ''
  selectedTypes.value = []
})
</script>

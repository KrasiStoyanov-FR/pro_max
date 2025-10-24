<template>
  <div
    class="h-full flex flex-col rounded-2xl bg-neutral-900/40 backdrop-blur-3xl transition-all duration-300 ease-out z-10 overflow-hidden"
    :class="[
      cluster ? 'w-64 lg:w-80 opacity-100 visible translate-x-0 pointer-events-auto' : 'w-0 opacity-0 invisible -translate-x-4 pointer-events-none'
    ]" :style="{ transitionDelay: cluster ? '0ms' : '0ms' }">

    <!-- Content wrapper with proper visibility control -->
    <div v-if="cluster" class="h-full min-w-0 flex flex-col transition-opacity duration-200 ease-out"
      :class="[cluster ? 'opacity-100' : 'opacity-0 pointer-events-none']"
      :style="{ transitionDelay: cluster ? '100ms' : '0ms' }">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 pb-0">
        <div class="flex items-center space-x-3">
          <div>
            <h2 class="font-semibold text-white">Pin Cluster</h2>
            <!-- <p class="text-neutral-200 text-xs">{{ cluster.pins.length }} items grouped</p> -->
          </div>
        </div>

        <button @click="closePanel" class="p-1 text-neutral-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded-md">
          <PhX :size="20" weight="bold" />
        </button>
      </div>

      <div class="flex flex-col px-4 py-3 space-y-3 border-b border-white/10">
        <!-- Search -->
        <div class="input-field">
          <input v-model="searchQuery" type="text" placeholder="Search pins..." />

          <div class="input-field__icon input-field__icon--right">
            <PhMagnifyingGlass aria-hidden="true" weight="bold" class="icon" />
          </div>
        </div>

        <!-- Filter Controls -->
        <!-- TODO: Make this functional - this button should open/close the filters view in this panel. -->
        <button class="flex items-center">
          <div class="flex flex-1 items-center space-x-2">
            <PhFunnelSimple class="size-4 text-neutral-200" weight="bold" />
            <span class="text-neutral-300 text-sm font-medium">Applied filters</span>

            <!-- TODO: Get the @click method from here once I build a filter list where the user can choose by what to filter the map view. -->
            <!-- <button v-for="type in availableTypes" :key="type" @click="toggleTypeFilter(type)" :class="[
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              selectedTypes.includes(type)
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            ]">
              {{ type }} ({{ getTypeCount(type) }})
            </button> -->

            <!-- TODO: This <span /> element should show the total number of applied filters - this is a badge element. -->
            <span
              class="px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors bg-neutral-700 text-neutral-300">
              {{ getTypeCount(type) }}
            </span>
          </div>

          <PhCaretDown class="size-4 text-neutral-200" weight="bold" />
        </button>
      </div>

      <!-- Pin List -->
      <div ref="pinListContainer" class="flex-1 overflow-y-auto bg-neutral-900/30">
        <div v-if="filteredPins.length === 0" class="p-4 text-center text-neutral-200 text-sm">
          No pins match your filters
        </div>
        <div v-else class="divide-y divide-neutral-700/50">
          <div v-for="pin in filteredPins" :key="pin.id" @click="selectPin(pin)" :data-pin-id="pin.id" :class="[
            'px-4 py-3 cursor-pointer transition-colors',
            isSelectedPin(pin)
              ? 'bg-neutral-800'
              : 'hover:bg-neutral-800/50'
          ]">
            <div class="flex items-center space-x-2">
              <!-- Pin Icon -->
              <div class="flex-shrink-0">
                <PhDrone class="size-4 text-primary-500" weight="fill" />
              </div>

              <!-- Pin Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h4 class="text-white font-medium text-sm truncate">{{ pin.title }}</h4>
                  <span :class="['text-xs', getPinColor(pin.status)]">{{ pin.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-white/10">
        <div class="flex items-center justify-between text-xs text-neutral-200">
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
import { PhX, PhFunnelSimple, PhMagnifyingGlass, PhMapPin, PhCaretDown, PhDrone } from '@phosphor-icons/vue'
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
    case 'active': return 'text-green-500'
    case 'critical': return 'text-red-500'
    case 'warning': return 'text-yellow-500'
    case 'inactive': return 'text-blue-500'
    default: return 'text-neutral-500'
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

<template>
  <form class="flex flex-col gap-4 lg:flex-row lg:items-end" @submit.prevent>
    <div class="flex-1">
      <label class="block text-xs font-semibold uppercase tracking-wide text-neutral-400" for="drones-search">
        Search
      </label>
      <div class="mt-1 input-field">
        <input
          id="drones-search"
          v-model="localSearch"
          type="search"
          name="search"
          placeholder="Search by ID, MAC address, serial number, sensor..."
          :disabled="isLoading"
          @input="emit('update:search', localSearch)"
        />
        <div class="input-field__icon input-field__icon--right">
          <PhMagnifyingGlass aria-hidden="true" weight="bold" class="icon" />
        </div>
      </div>
    </div>

    <div class="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
      <div class="flex flex-col">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-type">
          Detection type
        </label>
        <select
          id="filter-type"
          class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          :value="typeValue"
          @change="emit('update:type', ($event.target as HTMLSelectElement).value as DetectionTypeFilter)"
        >
          <option class="text-neutral-900" value="all">All types</option>
          <option class="text-neutral-900" value="position">Position</option>
          <option class="text-neutral-900" value="rf">RF</option>
        </select>
      </div>

      <div class="flex flex-col">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-status">
          Drone status
        </label>
        <select
          id="filter-status"
          class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          :value="statusValue"
          @change="emit('update:status', ($event.target as HTMLSelectElement).value as 'all' | 'active' | 'inactive')"
        >
          <option class="text-neutral-900" value="all">All statuses</option>
          <option class="text-neutral-900" value="active">Active</option>
          <option class="text-neutral-900" value="inactive">Inactive</option>
        </select>
      </div>

      <div class="flex flex-col">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-time-window">
          Time window
        </label>
        <select
          id="filter-time-window"
          class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          :value="timeWindowValue ?? ''"
          @change="emit('update:timeWindow', parseTimeWindow(($event.target as HTMLSelectElement).value))"
        >
          <option class="text-neutral-900" value="">Any time</option>
          <option class="text-neutral-900" value="5">Last 5 min</option>
          <option class="text-neutral-900" value="15">Last 15 min</option>
          <option class="text-neutral-900" value="30">Last 30 min</option>
          <option class="text-neutral-900" value="1440">Last 24 hours</option>
        </select>
      </div>

      <div v-if="hasSensors" class="flex flex-col">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-sensor">
          Sensor
        </label>
        <select
          id="filter-sensor"
          class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          :value="sensorValue"
          @change="handleSensorChange(($event.target as HTMLSelectElement).value)"
        >
          <option class="text-neutral-900" value="all">All sensors</option>
          <option
            class="text-neutral-900"
            v-for="sensorId in sensorsList"
            :key="sensorId"
            :value="sensorId"
          >
            {{ sensorId }}
          </option>
        </select>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch, toValue } from 'vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

export type DetectionTypeFilter = 'all' | 'position' | 'rf'

const props = defineProps({
  search: {
    type: [String, Object] as any,
    default: ''
  },
  type: {
    type: String as () => DetectionTypeFilter,
    default: 'all'
  },
  status: {
    type: [String, Object] as any,
    default: 'all'
  },
  timeWindow: {
    type: [Number, Object] as any,
    default: null
  },
  systemId: {
    type: [String, Number, Object] as any,
    default: null
  },
  sensors: {
    type: Array as () => string[],
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:type', value: DetectionTypeFilter): void
  (e: 'update:status', value: 'all' | 'active' | 'inactive'): void
  (e: 'update:timeWindow', value: number | null): void
  (e: 'update:systemId', value: string | null): void
}>()

const localSearch = ref(toValue(props.search) ?? '')

watch(
  () => toValue(props.search),
  value => {
    if (value !== localSearch.value) {
      localSearch.value = value ?? ''
    }
  }
)

const typeValue = computed(() => (toValue(props.type) ?? 'all') as DetectionTypeFilter)
const statusValue = computed(() => (toValue(props.status) ?? 'all') as 'all' | 'active' | 'inactive')
const timeWindowValue = computed<number | null>(() => {
  const v = toValue(props.timeWindow)
  return typeof v === 'number' ? v : v ?? null
})
const sensorValue = computed(() => {
  const v = toValue(props.systemId)
  return v !== null && v !== undefined ? String(v) : 'all'
})
const sensorsList = computed(() => props.sensors ?? [])
const hasSensors = computed(() => sensorsList.value.length > 0)

const parseTimeWindow = (value: string): number | null => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const handleSensorChange = (value: string) => {
  emit('update:systemId', value === 'all' ? null : value)
}
</script>




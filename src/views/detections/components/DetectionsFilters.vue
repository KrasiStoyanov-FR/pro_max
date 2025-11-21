<template>
  <form class="flex flex-col gap-4 lg:flex-row lg:items-end" @submit.prevent>
    <div class="flex-1">
      <label class="block text-xs font-semibold uppercase tracking-wide text-neutral-400" for="detections-search">
        Search
      </label>
      <div class="mt-1">
        <input
          id="detections-search"
          v-model="localSearch"
          type="search"
          name="search"
          placeholder="Search by ID, type, sensor..."
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          @input="emit('update:search', localSearch)"
        />
      </div>
    </div>

    <div class="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
      <div class="flex flex-col">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-type">
          Type
        </label>
        <select
          id="filter-type"
          class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          :value="typeValue"
          @change="emit('update:type', ($event.target as HTMLSelectElement).value as DetectionType | 'all')"
        >
          <option class="text-neutral-900" value="all">All types</option>
          <option class="text-neutral-900" v-for="option in detectionTypes" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>

      <div class="flex flex-col">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-status">
          Status
        </label>
        <select
          id="filter-status"
          class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          :value="statusValue"
          @change="emit('update:status', ($event.target as HTMLSelectElement).value as DetectionStatus | 'all')"
        >
          <option class="text-neutral-900" value="all">All statuses</option>
          <option class="text-neutral-900" v-for="option in detectionStatuses" :key="option" :value="option">
            {{ option }}
          </option>
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

      <div v-if="hasZones" class="flex flex-col">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-400" for="filter-zone">
          Zone
        </label>
        <select
          id="filter-zone"
          class="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary-400 focus:outline-none"
          :disabled="isLoading"
          :value="zoneValue"
          @change="emit('update:zone', ($event.target as HTMLSelectElement).value)"
        >
          <option class="text-neutral-900" value="all">All zones</option>
          <option class="text-neutral-900" v-for="option in zonesList" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch, toValue, type PropType, type Ref } from 'vue'
import type { DetectionStatus, DetectionType } from '@/types/detections'

const detectionTypes: DetectionType[] = ['UAV', 'RC', 'Unknown', 'Interference']
const detectionStatuses: DetectionStatus[] = ['Detect', 'Track', 'Alarm', 'Whitelisted']

const props = defineProps({
  search: {
    type: [String, Object] as PropType<string | Ref<string>>,
    default: ''
  },
  type: {
    type: [String, Object] as PropType<DetectionType | 'all' | Ref<DetectionType | 'all'>>,
    default: 'all'
  },
  status: {
    type: [String, Object] as PropType<DetectionStatus | 'all' | Ref<DetectionStatus | 'all'>>,
    default: 'all'
  },
  timeWindow: {
    type: [Number, Object] as PropType<number | null | Ref<number | null>>,
    default: null
  },
  zone: {
    type: [String, Object] as PropType<string | 'all' | Ref<string | 'all'>>,
    default: 'all'
  },
  zones: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:type', value: DetectionType | 'all'): void
  (e: 'update:status', value: DetectionStatus | 'all'): void
  (e: 'update:timeWindow', value: number | null): void
  (e: 'update:zone', value: string | 'all'): void
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

const isLoading = computed(() => !!props.isLoading)
const typeValue = computed<DetectionType | 'all'>(() => (toValue(props.type) ?? 'all') as DetectionType | 'all')
const statusValue = computed<DetectionStatus | 'all'>(() => (toValue(props.status) ?? 'all') as DetectionStatus | 'all')
const timeWindowValue = computed<number | null>(() => {
  const value = toValue(props.timeWindow)
  return typeof value === 'number' ? value : value ?? null
})
const zoneValue = computed<string>(() => (toValue(props.zone) ?? 'all') as string)
const zonesList = computed(() => props.zones)
const hasZones = computed(() => zonesList.value.length > 0)

const parseTimeWindow = (value: string): number | null => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
</script>



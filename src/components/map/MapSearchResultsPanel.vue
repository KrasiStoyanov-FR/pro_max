<template>
  <div
    class="bg-neutral-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-700/50 overflow-hidden max-h-80 flex flex-col"
    role="region"
    aria-label="Search results"
  >
    <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-700/50">
      <span class="text-sm font-medium text-white">Results</span>
      <div class="flex items-center gap-1.5">
        <button
          v-if="canZoomToSelection"
          type="button"
          class="rounded border border-neutral-600 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 transition-colors shrink-0"
          title="Fit all results on map"
          @click="$emit('fit-to-selection')"
        >
          Zoom to selection
        </button>
        <button
          type="button"
          class="text-xs text-neutral-400 hover:text-white transition-colors shrink-0"
          @click="$emit('clear')"
        >
          Clear
        </button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-2">
      <p v-if="isSearching" class="text-xs text-neutral-400 py-2">Searching...</p>
      <p v-if="error" class="text-xs text-rose-400 py-2">{{ error }}</p>

      <template v-if="placeResults.length > 0 || markerResults.length > 0 || placeSearchError || (!isSearching && !error)">
        <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500 px-1">Places (cities, countries, addresses)</p>
        <p v-if="placeSearchError" class="text-xs text-amber-400/90 px-1 py-1">{{ placeSearchError }}</p>
        <ul v-else-if="placeResults.length > 0" class="space-y-1">
          <li
            v-for="(place, i) in placeResults"
            :key="`place-${i}`"
            class="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-neutral-800/80 transition-colors group"
          >
            <span class="text-sm text-white truncate flex-1" :title="place.displayName">{{ place.displayName }}</span>
            <button
              type="button"
              class="rounded border border-neutral-600 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 shrink-0"
              @click="$emit('zoom-to-place', place)"
            >
              Zoom to
            </button>
          </li>
        </ul>
        <p v-else class="text-xs text-neutral-500 px-1 py-1">No places found. Try a city or country name.</p>
      </template>

      <template v-if="markerResults.length > 0">
        <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500 px-1 pt-1">Markers</p>
        <ul class="space-y-1">
          <li
            v-for="(pin, i) in markerResults"
            :key="`marker-result-${i}`"
            class="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-neutral-800/80 transition-colors cursor-pointer"
            @click="$emit('select-marker', pin)"
          >
            <span class="text-sm text-white truncate flex-1" :title="pin.title">{{ pin.title }}</span>
            <span class="text-xs text-neutral-400 shrink-0">{{ pin.type }}</span>
          </li>
        </ul>
      </template>

      <p
        v-if="!isSearching && !error && placeResults.length === 0 && markerResults.length === 0"
        class="text-xs text-neutral-500 py-2"
      >
        No results.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MapPin } from '@/types/map'
import type { GeocodingResult } from '@/services/geocodingService'

defineProps<{
  markerResults: MapPin[]
  placeResults: GeocodingResult[]
  isSearching: boolean
  error: string | null
  placeSearchError?: string | null
  canZoomToSelection?: boolean
}>()

defineEmits<{
  'zoom-to-place': [place: GeocodingResult]
  'select-marker': [pin: MapPin]
  'fit-to-selection': []
  clear: []
}>()
</script>

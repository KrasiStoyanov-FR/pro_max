<template>
  <nav class="flex flex-1 items-center px-4 py-3 gap-4 bg-neutral-900/40 shadow-sm backdrop-blur-3xl">
    <span class="max-w-xs flex-1">Map</span>
    <div class="flex flex-1 items-center justify-stretch text-center">
      <!-- Per-page search lives on each page (Map, Detections, Sensors) -->
       <span class="flex-1">{{ formattedDate }}</span>
    </div>
    <div class="max-w-xs flex flex-1 items-end gap-1.5 relative">
        <div class="min-w-0 max-h-10 flex-1 input-field bg-neutral-900/40 border-white/10">
          <input
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            placeholder="Places, sensors, targets..."
            class="!border-0 !bg-transparent"
            aria-label="Search map"
            @input="scheduleSearch"
            @keydown.enter.prevent="runSearchNow"
          />
          <div class="input-field__icon input-field__icon--right">
            <button
              v-if="hasSearchResults || searchQuery"
              type="button"
              class="shrink-0 rounded p-1.5 mr-1 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
              title="Clear search"
              aria-label="Clear search"
              @click="clearSearchNow"
            >  
              <PhX :size="14" weight="bold" />
            </button>
            <PhMagnifyingGlass v-else aria-hidden="true" weight="bold" class="icon" />
          </div>
        </div>
        
        <!-- Search Results Panel -->
        <div v-if="showSearchPanel" class="absolute top-full right-0 left-0 mt-2 z-50 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-[60vh] flex flex-col">
          <MapSearchResultsPanel
            :marker-results="markerResults"
            :place-results="placeResults"
            :is-searching="isSearching"
            :error="searchError"
            :place-search-error="placeSearchError"
            :can-zoom-to-selection="canZoomToSelection"
            @zoom-to-place="zoomToPlace"
            @select-marker="selectMarker"
            @fit-to-selection="fitOrFlyToResults"
            @clear="clearSearchNow"
          />
        </div>
      </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted, onMounted } from 'vue'
import { PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import { storeToRefs } from 'pinia'
import { useMapSearch } from '@/composables/useMapSearch'
import { useMapStore } from '@/store/map'
import MapSearchResultsPanel from '@/components/map/MapSearchResultsPanel.vue'

const mapStore = useMapStore()
const { timeWindowMs, dateRange } = storeToRefs(mapStore)

const currentDate = ref(new Date())

const formattedDate = computed(() => {
  // If we have a custom date range (historical view)
  if (dateRange.value) {
    const start = new Date(dateRange.value.start)
    const end = new Date(dateRange.value.end)
    
    // Format: "Historical view: DD.MM.YYYY HH:MM - DD.MM.YYYY HH:MM"
    const format = (d: Date) => d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return `Historical view: ${format(start)} - ${format(end)}`
  }
  
  // If we have a time window set (e.g. "Last 15 minutes", "Last 1 hour")
  if (timeWindowMs.value !== null) {
    // Format: "Past [window] view, DD.MM.YYYY, HH:MM"
    // We'll calculate the human readable string for the window
    const ms = timeWindowMs.value
    let windowText = ''
    
    if (ms >= 24 * 60 * 60 * 1000) {
      const days = Math.round(ms / (24 * 60 * 60 * 1000))
      windowText = `${days} ${days === 1 ? 'day' : 'days'}`
    } else if (ms >= 60 * 60 * 1000) {
      const hours = Math.round(ms / (60 * 60 * 1000))
      windowText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    } else {
      const minutes = Math.round(ms / (60 * 1000))
      windowText = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
    }
    
    return `Past ${windowText} view, ${currentDate.value.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })}, ${currentDate.value.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })}`
  }

  // Default: Live view (timeWindowMs is null)
  return `Real time view, ${currentDate.value.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })}, ${currentDate.value.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  })}`
})

let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    currentDate.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const {
  query: searchQuery,
  markerResults,
  placeResults,
  isSearching,
  error: searchError,
  placeSearchError,
  hasResults: hasSearchResults,
  canZoomToSelection,
  runSearch,
  clearSearch,
  fitOrFlyToResults,
  zoomToPlace,
  selectMarker
} = useMapSearch()

const SEARCH_DEBOUNCE_MS = 400
let searchDebounceId: ReturnType<typeof setTimeout> | null = null

/** Show panel when we have results, any error, or a completed search (so "No results" or place error is visible). */
const showSearchPanel = computed(
  () =>
    hasSearchResults.value ||
    searchError.value != null ||
    placeSearchError.value != null ||
    (searchQuery.value.trim() !== '' && !isSearching.value)
)

function scheduleSearch() {
  if (searchDebounceId != null) {
    clearTimeout(searchDebounceId)
    searchDebounceId = null
  }
  if (!searchQuery.value.trim()) {
    clearSearch()
    return
  }
  searchDebounceId = setTimeout(() => {
    searchDebounceId = null
    runSearch()
  }, SEARCH_DEBOUNCE_MS)
}

async function runSearchNow() {
  if (searchDebounceId != null) {
    clearTimeout(searchDebounceId)
    searchDebounceId = null
  }
  if (!searchQuery.value.trim()) {
    clearSearch()
    return
  }
  await runSearch()
  fitOrFlyToResults()
}

function clearSearchNow() {
  if (searchDebounceId != null) {
    clearTimeout(searchDebounceId)
    searchDebounceId = null
  }
  clearSearch()
}

onUnmounted(() => {
  if (searchDebounceId != null) clearTimeout(searchDebounceId)
  clearSearch()
})
</script>

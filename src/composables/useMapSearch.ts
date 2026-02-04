import { ref, computed } from 'vue'
import { useMapStore } from '@/store/map'
import { mapService } from '@/services/mapService'
import { geocode, type GeocodingResult } from '@/services/geocodingService'
import type { MapPin } from '@/types/map'

export function useMapSearch() {
  const mapStore = useMapStore()
  const query = ref('')
  const markerResults = ref<MapPin[]>([])
  const placeResults = ref<GeocodingResult[]>([])
  const isSearching = ref(false)
  const error = ref<string | null>(null)
  /** Place (geocode) search only – do not treat as global search failure so marker results still show. */
  const placeSearchError = ref<string | null>(null)

  const hasResults = computed(
    () => markerResults.value.length > 0 || placeResults.value.length > 0
  )
  const hasMarkerResults = computed(() => markerResults.value.length > 0)
  const hasPlaceResults = computed(() => placeResults.value.length > 0)

  function setSearchResultIds(ids: Set<string> | null) {
    mapStore.setMapSearchResultIds(ids)
    mapService.setSearchResultPinIds(ids)
  }

  async function runSearch() {
    const q = query.value.trim()
    if (!q) {
      clearSearch()
      return
    }

    isSearching.value = true
    error.value = null
    placeSearchError.value = null
    markerResults.value = []
    placeResults.value = []

    const pinResults = mapStore.searchPins(q)
    markerResults.value = pinResults

    try {
      const places = await geocode(q)
      placeResults.value = places
    } catch (e) {
      placeResults.value = []
      placeSearchError.value = e instanceof Error ? e.message : 'Place search unavailable'
    }

    const ids = new Set(pinResults.map((p) => p.id))
    setSearchResultIds(ids)
    isSearching.value = false

    // Do not auto-focus or fit: wait for user to press Enter or select an item from results
  }

  /**
   * Zoom so all search results are visible.
   * - Markers (from DB): shown as teardrops; included in bounds.
   * - Places (cities, countries): no marker on map; their area is included in bounds so the viewport shows them.
   * - Single marker: fly to that marker.
   * - Single place: zoom to that place (suggested zoom).
   * - Multiple markers and/or places: fit bounds to include all points.
   */
  function fitOrFlyToResults() {
    const pins = markerResults.value
    const places = placeResults.value
    const totalCount = pins.length + places.length

    if (totalCount === 0) return

    if (totalCount === 1) {
      if (pins.length === 1) {
        mapStore.flyToPin(pins[0])
        return
      }
      const place = places[0]
      const zoom = place.suggestedZoom ?? 12
      mapStore.flyToLocation(place.lat, place.lng, zoom)
      if (mapStore.mapInstance) {
        mapService.flyTo(place.lat, place.lng, zoom, { adjustForOverlays: true })
      }
      return
    }

    const points: Array<{ lat: number; lng: number }> = [
      ...pins.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...places.map((p) => ({ lat: p.lat, lng: p.lng }))
    ]
    const bounds = mapService.getBoundsFromPoints(points)
    if (bounds) mapService.fitBounds(bounds)
  }

  const canZoomToSelection = computed(
    () => markerResults.value.length + placeResults.value.length > 1
  )

  function clearSearch() {
    query.value = ''
    markerResults.value = []
    placeResults.value = []
    error.value = null
    placeSearchError.value = null
    setSearchResultIds(null)
  }

  function zoomToPlace(place: GeocodingResult) {
    const zoom = place.suggestedZoom ?? 12
    mapStore.flyToLocation(place.lat, place.lng, zoom)
    if (mapStore.mapInstance) {
      mapService.flyTo(place.lat, place.lng, zoom, { adjustForOverlays: true })
    }
  }

  function selectMarker(pin: MapPin) {
    mapStore.flyToPin(pin)
  }

  return {
    query,
    markerResults,
    placeResults,
    isSearching,
    error,
    placeSearchError,
    hasResults,
    hasMarkerResults,
    hasPlaceResults,
    canZoomToSelection,
    runSearch,
    clearSearch,
    fitOrFlyToResults,
    zoomToPlace,
    selectMarker,
    setSearchResultIds
  }
}

/**
 * Geocoding service: resolve place names (city, country, zipcode, address) to coordinates.
 * Supports Nominatim (OpenStreetMap) and optional Google Geocoding via env.
 */

export interface GeocodingResult {
  lat: number
  lng: number
  displayName: string
  type?: string
  /** Suggested zoom: country ~5, city ~11, address ~15 */
  suggestedZoom?: number
}

const NOMINATIM_LIMIT = 10

/** Backend geocode proxy URL (same origin as API, avoids CORS/418 from Nominatim). */
function getGeocodeProxyBase(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/db'
  return apiBase.replace(/\/api\/db\/?$/, '')
}

function getProvider(): 'nominatim' | 'google' {
  const v = import.meta.env.VITE_GEOCODING_PROVIDER
  if (v === 'google') return 'google'
  return 'nominatim'
}

function getGoogleApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_GEOCODING_KEY
}

/**
 * Map Nominatim type/class to suggested zoom (country/city/address).
 */
function suggestedZoomFromNominatim(type?: string, class_?: string): number {
  const t = (type ?? '').toLowerCase()
  const c = (class_ ?? '').toLowerCase()
  if (t === 'country' || c === 'boundary') return 5
  if (t === 'state' || t === 'province' || c === 'place' && t !== 'city') return 8
  if (t === 'city' || t === 'town' || t === 'village' || t === 'municipality') return 11
  if (t === 'suburb' || t === 'neighbourhood') return 13
  if (t === 'road' || t === 'building' || t === 'house') return 16
  return 12
}

/**
 * Geocode via backend proxy (Nominatim). Browser cannot call Nominatim directly (CORS/418).
 */
async function geocodeNominatim(query: string): Promise<GeocodingResult[]> {
  const base = getGeocodeProxyBase()
  const params = new URLSearchParams({
    q: query,
    limit: String(NOMINATIM_LIMIT)
  })
  const url = `${base}/api/geocode?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    let msg = `Geocoding failed: ${res.status}`
    try {
      const body = JSON.parse(text) as { message?: string; error?: string }
      if (body?.message ?? body?.error) msg = String(body.message ?? body.error)
    } catch {
      /* non-JSON response (e.g. HTML error page) */
    }
    throw new Error(msg)
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error('Geocoding returned invalid response')
  }
  if (!Array.isArray(data)) {
    const err = data && typeof data === 'object' && 'error' in data ? (data as { error?: string }).error : undefined
    throw new Error(err ?? 'Geocoding returned invalid response')
  }
  return (data as Array<{
    lat: string
    lon: string
    display_name: string
    type?: string
    class?: string
  }>).map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
    type: item.type,
    suggestedZoom: suggestedZoomFromNominatim(item.type, item.class)
  }))
}

/**
 * Geocode a query using Google Geocoding API.
 */
async function geocodeGoogle(query: string): Promise<GeocodingResult[]> {
  const key = getGoogleApiKey()
  if (!key) {
    console.warn('[Geocoding] VITE_GOOGLE_GEOCODING_KEY not set; falling back to empty results')
    return []
  }
  const params = new URLSearchParams({
    address: query,
    key
  })
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  const data = await res.json() as { status: string; results?: Array<{
    geometry: { location: { lat: number; lng: number } }
    formatted_address: string
    types: string[]
  }> }
  if (data.status !== 'OK' || !data.results) return []
  return data.results.map((r) => {
    const types = r.types ?? []
    let suggestedZoom = 12
    if (types.includes('country')) suggestedZoom = 5
    else if (types.includes('administrative_area_level_1')) suggestedZoom = 8
    else if (types.some((t) => t.includes('locality') || t.includes('sublocality'))) suggestedZoom = 11
    else if (types.includes('street_address') || types.includes('premise')) suggestedZoom = 16
    return {
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      displayName: r.formatted_address,
      type: types[0],
      suggestedZoom
    }
  })
}

/**
 * Geocode a place query (city, country, zipcode, address) to coordinates.
 * Provider is chosen via VITE_GEOCODING_PROVIDER (nominatim | google).
 */
export async function geocode(query: string): Promise<GeocodingResult[]> {
  const q = query.trim()
  if (!q) return []
  const provider = getProvider()
  if (provider === 'google') return geocodeGoogle(q)
  return geocodeNominatim(q)
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_MAP_PROVIDER: string
  readonly VITE_MAPBOX_KEY: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_BRAND?: string
  readonly VITE_TEST_MODE?: string
  readonly VITE_ACTIVE_POSITION_WINDOW_MS?: string
  readonly VITE_DETECTION_WINDOW_MS?: string
  readonly VITE_MAX_POSITION_AGE_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}



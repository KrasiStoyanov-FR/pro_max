// Live-view performance mode
// In the `live-view-performance` branch this is always true so that
// simulation, extra logging and perf-specific behavior are enabled
// without needing any environment variable switches.

export const IS_LIVE_VIEW_PERF_MODE = true as const

// Test drone ID from environment variable (default: 9999)
// This is the drone_id used for performance testing simulations
// Frontend uses VITE_PERF_DRONE_ID (Vite requires VITE_ prefix), backend scripts use PERF_DRONE_ID
// We check both to support both naming conventions
export const PERF_TEST_DRONE_ID = parseInt(
  import.meta.env.VITE_PERF_DRONE_ID || 
  import.meta.env.PERF_DRONE_ID || 
  '9999',
  10
)

// Log the configured test drone ID in development
if (import.meta.env.DEV) {
  console.log(`[Perf Config] Test drone ID: ${PERF_TEST_DRONE_ID} (from env: ${import.meta.env.VITE_PERF_DRONE_ID || import.meta.env.PERF_DRONE_ID || 'default'})`)
}


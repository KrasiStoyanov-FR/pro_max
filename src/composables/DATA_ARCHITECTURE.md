# Data Architecture Guide

This document explains the centralized data management system for the Defense Radar Dashboard.

## Overview

The application uses a **centralized data store** (`src/store/data.ts`) that manages all database entities with:
- **Automatic caching** (30-second cache duration)
- **Request deduplication** (prevents duplicate API calls)
- **Indexed lookups** (O(1) access by ID, system_id, etc.)
- **Type-safe access** throughout the application
- **On-demand fetching** for individual items

## Quick Start

### Using the `useData` Composable

```vue
<script setup lang="ts">
import { useData } from '@/composables/useData'

const {
  // Reactive data arrays
  drones,
  detectors,
  rfDetections,
  operatorPositions,
  
  // Loading states
  isLoading,
  
  // Fetch methods
  fetchDrones,
  fetchDetectors,
  fetchDetectorById,
  
  // Get by ID (from cache)
  getDrone,
  getDetector,
  
  // Get by relationship
  getDronesBySystemId,
  getRFDetectionsByDroneId,
  getDetectorsBySystemId
} = useData()

// Fetch all detectors on mount
onMounted(async () => {
  await fetchDetectors()
})

// Access a specific detector (from cache or fetch on-demand)
const detector = computed(() => {
  const detectorId = props.detectorId
  return getDetector(detectorId) || await fetchDetectorById(detectorId)
})
</script>
```

## Use Cases

### 1. Displaying a List of Detectors

```vue
<template>
  <div>
    <div v-if="isLoading.detectors">Loading...</div>
    <div v-else>
      <div v-for="detector in detectors" :key="detector.id">
        {{ detector.name || `Detector ${detector.unit_id}` }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useData } from '@/composables/useData'

const { detectors, isLoading, fetchDetectors } = useData()

onMounted(async () => {
  await fetchDetectors()
})
</script>
```

### 2. Fetching a Single Detector On-Demand (Deep in User Flow)

```vue
<script setup lang="ts">
import { useData } from '@/composables/useData'

const props = defineProps<{
  detectorId: string | number
}>()

const { getDetector, fetchDetectorById, isLoading } = useData()

// Try cache first, then fetch if needed
const detector = ref(null)

const loadDetector = async () => {
  // Check cache
  const cached = getDetector(props.detectorId)
  if (cached) {
    detector.value = cached
    return
  }
  
  // Fetch on-demand
  detector.value = await fetchDetectorById(props.detectorId)
}

watch(() => props.detectorId, loadDetector, { immediate: true })
</script>
```

### 3. Getting Related Data (e.g., All Drones for a Detector)

```vue
<script setup lang="ts">
import { useData } from '@/composables/useData'

const props = defineProps<{
  systemId: string
}>()

const {
  getDronesBySystemId,
  getRFDetectionsBySystemId,
  getOperatorPositionsBySystemId
} = useData()

// Get all related data for a system
const relatedDrones = computed(() => getDronesBySystemId(props.systemId))
const relatedDetections = computed(() => getRFDetectionsBySystemId(props.systemId))
const relatedOperators = computed(() => getOperatorPositionsBySystemId(props.systemId))
</script>
```

### 4. Status Summary Panel - Click to View All Detectors

```vue
<template>
  <div>
    <button @click="showDetectors = true">
      View All Detectors ({{ detectors.length }})
    </button>
    
    <DetectorListModal 
      v-if="showDetectors"
      :detectors="detectors"
      @close="showDetectors = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useData } from '@/composables/useData'

const { detectors, fetchDetectors, isLoading } = useData()
const showDetectors = ref(false)

onMounted(async () => {
  // Pre-fetch detectors for quick access
  await fetchDetectors()
})
</script>
```

## API Methods

### Collection Fetching
- `fetchDrones(forceRefresh?: boolean)` - Fetch all drones
- `fetchDronePositions(limit?: number, forceRefresh?: boolean)` - Fetch drone positions
- `fetchRFDetections(limit?: number, forceRefresh?: boolean)` - Fetch RF detections
- `fetchOperatorPositions(limit?: number, forceRefresh?: boolean)` - Fetch operator positions
- `fetchDetectors(limit?: number, forceRefresh?: boolean)` - Fetch all detectors
- `fetchReceiverLogs(limit?: number, forceRefresh?: boolean)` - Fetch receiver logs
- `fetchFlightSessions(limit?: number, forceRefresh?: boolean)` - Fetch flight sessions

### Individual Item Fetching (On-Demand)
- `fetchDroneById(id: number | string, forceRefresh?: boolean)` - Fetch single drone
- `fetchDetectorById(id: number | string, forceRefresh?: boolean)` - Fetch single detector
- `fetchRFDetectionById(id: number, forceRefresh?: boolean)` - Fetch single detection

### Get from Cache
- `getDrone(id: number | string)` - Get drone from cache
- `getDetector(id: number | string)` - Get detector from cache
- `getRFDetection(id: number)` - Get detection from cache
- `getDronePosition(id: number)` - Get position from cache
- `getOperatorPosition(id: number)` - Get operator position from cache

### Get by Relationship
- `getDronesBySystemId(systemId: string)` - Get all drones for a system
- `getDronePositionsByDroneId(droneId: number)` - Get all positions for a drone
- `getRFDetectionsByDroneId(droneId: number)` - Get all detections for a drone
- `getRFDetectionsBySystemId(systemId: string)` - Get all detections for a system
- `getOperatorPositionsBySystemId(systemId: string)` - Get all operators for a system
- `getDetectorsBySystemId(systemId: string)` - Get all detectors for a system
- `getDetectorByUnitId(unitId: number | string)` - Get detector by unit_id

## Benefits

1. **No Prop Drilling** - Access data from any component
2. **Automatic Caching** - Reduces API calls
3. **Type Safety** - Full TypeScript support
4. **On-Demand Fetching** - Fetch individual items when needed
5. **Indexed Lookups** - Fast access by relationships
6. **Loading States** - Built-in loading indicators
7. **Error Handling** - Centralized error management

## Migration from Old System

### Before (useMapPins.ts)
```typescript
const [dronesResponse, ...] = await Promise.all([
  databaseApi.getDrones(),
  databaseApi.getDronePositions(100),
  // ...
])
```

### After (useData composable)
```typescript
const { fetchDrones, fetchDronePositions } = useData()
await fetchDrones()
await fetchDronePositions(100)

// Or fetch individually when needed
const detector = await fetchDetectorById(detectorId)
```

## Best Practices

1. **Pre-fetch common data** on app initialization
2. **Use cache first** - Check `getX()` before `fetchXById()`
3. **Fetch on-demand** for deep navigation flows
4. **Use relationships** - Leverage `getXByY()` methods for related data
5. **Handle loading states** - Use `isLoading` for UI feedback
6. **Clear cache** when needed - Use `clearCache()` for fresh data


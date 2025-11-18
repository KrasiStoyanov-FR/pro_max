# Status Summary Card Integration

## Integration in MapView.vue

Add the `StatusSummaryCard` component to your Map view:

```vue
<template>
  <div class="h-full flex-1 relative">
    <!-- Map container -->
    <div ref="mapContainer" class="h-full w-full relative z-10"></div>

    <!-- Status Summary Card -->
    <StatusSummaryCard
      :is-fullscreen-mode="isFullscreenMode"
      @open-drones-panel="handleOpenDronesPanel"
      @open-detections-panel="handleOpenDetectionsPanel"
      @open-operators-panel="handleOpenOperatorsPanel"
      @open-database-status="handleOpenDatabaseStatus"
    />

    <!-- ... rest of your map view ... -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StatusSummaryCard from '@/components/map/StatusSummaryCard.vue'
// ... other imports

const isFullscreenMode = ref(false)

// Handle panel opens
const handleOpenDronesPanel = () => {
  // TODO: Open drones list panel
  console.log('Open drones panel')
}

const handleOpenDetectionsPanel = () => {
  // TODO: Open RF detections list panel
  console.log('Open detections panel')
}

const handleOpenOperatorsPanel = () => {
  // TODO: Open operators list panel
  console.log('Open operators panel')
}

const handleOpenDatabaseStatus = () => {
  // TODO: Open database status modal/panel
  console.log('Open database status')
}
</script>
```

## Integration in LayoutWrapper.vue (Alternative)

If you prefer to have the status card at the layout level:

```vue
<template>
  <div class="h-screen flex bg-neutral-900">
    <!-- ... existing layout ... -->
    
    <!-- Map/Content Area -->
    <div class="flex-1 overflow-hidden relative z-0">
      <slot name="content" />
      
      <!-- Status Summary Card -->
      <StatusSummaryCard
        :is-fullscreen-mode="isFullscreenMode"
        @open-drones-panel="handleOpenDronesPanel"
        @open-detections-panel="handleOpenDetectionsPanel"
        @open-operators-panel="handleOpenOperatorsPanel"
        @open-database-status="handleOpenDatabaseStatus"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import StatusSummaryCard from '@/components/map/StatusSummaryCard.vue'
// ... other imports

const isFullscreenMode = ref(false)

// Handle panel opens (same as above)
</script>
```

## WebSocket Support (Optional)

To enable real-time updates via WebSocket, add this to your `server.js`:

```javascript
const WebSocket = require('ws')

// WebSocket server for status updates
const wss = new WebSocket.Server({ port: 3002 })

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')
  
  // Send status updates every 5 seconds
  const interval = setInterval(async () => {
    try {
      // Fetch latest status (reuse /status logic)
      const status = await getSystemStatus()
      
      // Send delta updates
      ws.send(JSON.stringify({
        type: 'metric',
        metric: {
          activeDrones: status.metrics.activeDrones,
          rfDetections: status.metrics.rfDetections,
          operatorsOnline: status.metrics.operatorsOnline
        },
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      console.error('[WebSocket] Error sending status update:', error)
    }
  }, 5000)
  
  ws.on('close', () => {
    clearInterval(interval)
    console.log('WebSocket client disconnected')
  })
})
```

Then update the WebSocket URL in `useSystemStatus.ts` to match your server configuration.


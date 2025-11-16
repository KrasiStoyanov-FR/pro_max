# Cluster Marker and Detection System Fixes

## Issues Fixed

### 1. Cluster Markers Not Reappearing

**Problem**: Once a cluster marker was clicked and hidden, it would never reappear even when zooming out or closing the cluster panel.

**Solution**:
- **Clear selected cluster on zoom out**: When zooming out below `minZoom + 2`, both `expandedClusters` and `selectedClusterId` are cleared
- **Clear selected cluster on panel close**: When cluster panel closes, `selectedClusterId` is cleared and the cluster is removed from `expandedClusters`
- **Fixed expanded clusters logic**: Only prevent re-clustering if cluster is currently selected; once deselected, clusters can reappear
- **Improved logging**: Added console logs to track cluster state changes

**Changes Made**:
- `mapService.ts`: Updated `applyClustering()` to check `selectedClusterId`
- `mapService.ts`: Updated `clearExpandedClusters()` to also clear `selectedClusterId`
- `mapService.ts`: Updated `clearSelectedCluster()` to properly clear from `expandedClusters`
- `mapService.ts`: Fixed `groupPinsIntoClusters()` to only skip re-clustering if cluster is currently selected
- `LayoutWrapper.vue`: Calls `mapService.clearSelectedCluster()` when cluster panel closes

### 2. Drones with Detections but No Nearby Detectors

**Problem**: Some drones had RF detections in their data but no visible receiver/detector was nearby, making it unclear what was detecting them.

**Solution**:
- **Range-based detection generation**: RF detections are now only created for drone positions that are within 3km of a receiver
- **Receiver positioning**: Updated mock data to position receivers near drone trajectories
- **Detection range visualization**: Added blue dashed circles (3km radius) around receivers showing detection coverage
- **Clear labeling**: GPS units are now labeled as "RF Receiver" / "Detection Source"

**Changes Made**:
- `mockData.ts`: Added `calculateDistanceKm()` helper function
- `mockData.ts`: Updated `mockRFDetections()` to only create detections within receiver range
- `mockData.ts`: Updated `mockGpsUnitPositions()` with 3 receivers positioned near drones
- `mapService.ts`: Added `addDetectionRanges()` method to show detection range circles
- `mapService.ts`: Detection range circles are automatically added when pins are loaded
- `useMapPins.ts`: Updated GPS unit pin labels to show "RF Receiver" / "Detection Source"

## How It Works Now

### Cluster Behavior

1. **Normal State**: Clusters appear at zoom levels 8-12
2. **Cluster Selected**: 
   - Cluster marker hides immediately
   - Individual pins are shown
   - Cluster panel opens
3. **Panel Closed**: 
   - `selectedClusterId` cleared
   - Cluster removed from `expandedClusters`
   - Clusters can reappear if zoom level is appropriate
4. **Zoom Out**: 
   - Below zoom 10: All expanded clusters and selected cluster cleared
   - Clusters can reappear when zooming back in

### Detection System

1. **RF Receivers** (GPS Units):
   - Shown as cyan markers with "RF Receiver" label
   - Display 3km detection range circles (blue dashed)
   - Tooltip shows receiver name and range

2. **RF Detections**:
   - Only created for drone positions within 3km of a receiver
   - Linked to specific receivers via `system_id`
   - Shown in drone info panels when drone is selected

3. **Visual Connection**:
   - Detection range circles make it clear which receivers can detect which drones
   - Drones within blue circles can be detected
   - Drones outside circles won't have detections

## Mock Data Structure

### Receivers (Detection Sources)
- **RF Receiver Sofia-1**: 42.6927, 23.3169 (covers Sofia center)
- **RF Receiver Airport**: 42.6855, 23.4075 (covers airport area)
- **RF Receiver Plovdiv**: 42.1304, 24.7403 (covers Plovdiv area)

### Drones and Their Detections
- **Drone 1** (Sofia): Detected by RF Receiver Sofia-1 (within 3km)
- **Drone 2** (Airport): Detected by RF Receiver Airport (within 3km)
- **Drone 3** (Plovdiv): Detected by RF Receiver Plovdiv (within 3km)

All detections are now logically connected to nearby receivers.

## Testing

To verify the fixes:

1. **Cluster Reappearing**:
   - Click on a cluster marker
   - Close the cluster panel
   - Zoom out to level 8-10
   - Cluster marker should reappear

2. **Detection Sources**:
   - Look for blue dashed circles around cyan receiver markers
   - Verify drones with detections are within receiver range circles
   - Click on a drone to see its detections in the info panel

## Configuration

- **Detection Range**: 3km (3000 meters) - defined in `mapService.ts` and `mockData.ts`
- **Cluster Zoom Range**: 8-12 (clusters hidden above zoom 12 and near max zoom)
- **Cluster Reappear Threshold**: Zoom below 10 clears selected clusters


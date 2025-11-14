# Mock Data System for Documentation Screenshots

## Overview

This mock data system provides curated, presentational data for taking documentation screenshots. It's designed to showcase the platform's features with clean, logical data focused on Bulgaria.

## Configuration

To enable/disable mock data mode, edit `src/services/mockData.ts`:

```typescript
export const USE_MOCK_DATA = true  // Set to true for screenshots
```

**Important**: When `USE_MOCK_DATA = true`, real API calls are bypassed and mock data is returned instead. This prevents breaking the working version while taking screenshots.

## What's Included

### Mock Data Features

- **3 Drones** with realistic trajectories:
  - Drone 1: Delivery drone in Sofia center (20 trajectory points)
  - Drone 2: Patrol drone near Sofia Airport (18 trajectory points)
  - Drone 3: Surveillance drone in Plovdiv (12 trajectory points)

- **RF Detections**: 19 detections linked to the 3 drones
- **Operator Positions**: 3 operator positions (one per drone)
- **GPS Units**: 2 GPS tracking units (Sofia and Airport)
- **Receiver Logs**: 2 operational status logs

### Data Characteristics

- **Locations**: All data is focused on Bulgaria (Sofia, Plovdiv, Airport)
- **Realistic Trajectories**: Drones have proper flight paths with timestamps
- **Proper Associations**: RF detections, operators, and GPS units are correctly linked
- **Clean Data**: No broken coordinates or invalid data
- **Presentational**: Minimal, logical data perfect for screenshots

## How It Works

1. **API Service** (`src/services/api.ts`):
   - Checks `USE_MOCK_DATA` flag
   - If `true`: Returns mock data immediately (no API calls)
   - If `false`: Makes real API calls as normal

2. **Mock Data Service** (`src/services/mockData.ts`):
   - Generates realistic Bulgarian location data
   - Creates proper data structures matching database schema
   - Includes trajectories, detections, and associations

3. **Existing Code**: 
   - All existing code continues to work unchanged
   - Data processing in `useMapPins.ts` works with mock data
   - Map rendering, pin selection, focus mode all function normally

## Usage for Screenshots

1. **Enable Mock Data**:
   ```typescript
   // In src/services/mockData.ts
   export const USE_MOCK_DATA = true
   ```

2. **Start the Application**:
   ```bash
   npm start
   ```

3. **Take Screenshots**:
   - Map will show 3 drones with trajectories
   - Click on drones to see detailed information
   - RF detections appear in info panels
   - All features work as expected

4. **Disable Mock Data** (when done):
   ```typescript
   // In src/services/mockData.ts
   export const USE_MOCK_DATA = false
   ```

## Data Locations

- **Sofia Center**: 42.6977, 23.3219
- **Sofia Airport**: 42.6905, 23.4125
- **Plovdiv**: 42.1354, 24.7453

All drones and related data are positioned in these areas for logical, presentational screenshots.

## Customization

To modify the mock data:

1. Edit `src/services/mockData.ts`
2. Adjust locations, trajectories, or data counts
3. Ensure data structures match the TypeScript interfaces
4. Keep it simple and presentational

## Notes

- Mock data is **only for documentation screenshots**
- Real API calls are preserved and commented when mock mode is active
- All existing functionality works with mock data
- No breaking changes to the working version
- Easy to toggle on/off with a single flag

## Troubleshooting

**Mock data not showing?**
- Check that `USE_MOCK_DATA = true` in `mockData.ts`
- Check browser console for mock data logs
- Refresh the page

**Want to use real data again?**
- Set `USE_MOCK_DATA = false` in `mockData.ts`
- Restart the application
- Real API calls will resume


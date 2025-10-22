# How to Add Drone Operation Zones

This guide explains how to create highlighted regions (zones) on the map where drones operate.

## Understanding Zone Highlighting

The highlighted regions you see on the map are created using **Leaflet polygons** with:
- **Low fill opacity** (0.15-0.25) - creates the semi-transparent fill
- **Stroke/border** with higher opacity (0.8-0.9) - creates the visible outline
- **Color coding** - different colors for different zone types

## Zone Structure

Each zone is defined in `src/services/droneZones.ts`:

```typescript
{
  id: 'unique-zone-id',              // Unique identifier
  name: 'Zone Display Name',          // Shown in tooltips
  type: 'patrol',                     // Zone type (see types below)
  coords: [                           // Polygon coordinates
    [lat1, lng1],
    [lat2, lng2],
    [lat3, lng3],
    [lat1, lng1]                      // Close the polygon
  ],
  color: '#22c55e',                   // Zone border/fill color
  center: [centerLat, centerLng],     // Center point for icons
  opacity: 0.8,                       // Border opacity (0-1)
  fillOpacity: 0.15,                  // Fill opacity (0-1)
  active: true,                       // Show/hide zone
  description: 'Zone description'     // Tooltip description
}
```

## Zone Types

Different zone types use different colors:

| Type | Color | Hex Code | Use Case |
|------|-------|----------|----------|
| `patrol` | Green | `#22c55e` | Police/security patrol areas |
| `delivery` | Blue | `#3b82f6` | Commercial delivery routes |
| `restricted` | Red | `#ef4444` | No-fly zones |
| `emergency` | Orange | `#f59e0b` | Medical/rescue operations |
| `training` | Cyan | `#06b6d4` | Pilot training areas |
| `surveillance` | Purple | `#8b5cf6` | Monitoring/surveillance zones |

## Adding a New Zone

### Step 1: Define Coordinates

Use an online tool like [geojson.io](https://geojson.io/) to draw your polygon and get coordinates.

### Step 2: Add to `droneZones.ts`

```typescript
{
  id: 'barcelona-delivery',           // Unique ID
  name: 'Barcelona Delivery Zone',
  type: 'delivery',
  coords: [
    [41.38, 2.17],                    // Top-left
    [41.40, 2.20],                    // Top-right
    [41.38, 2.22],                    // Bottom-right
    [41.36, 2.19],                    // Bottom-left
    [41.38, 2.17]                     // Close polygon (same as first)
  ],
  color: '#3b82f6',                   // Blue for delivery
  center: [41.38, 2.195],             // Center of polygon
  opacity: 0.8,
  fillOpacity: 0.15,
  active: true,
  description: 'Commercial drone deliveries in Barcelona metro area'
}
```

### Step 3: Position Drones in Zone

In `src/services/mockData.ts`, add drones with coordinates inside your zone:

```typescript
{
  id: 'drone-123',
  lat: 41.385,                        // Inside the zone
  lng: 2.195,
  title: 'Delivery Drone ES-BCN-45',
  description: 'Package delivery in progress',
  type: 'drone',
  status: 'active',
  priority: 'medium',
  data: {
    zone: 'Barcelona Delivery Zone',  // Reference zone name
    // ... other drone data
  }
}
```

## Customizing Zone Appearance

### Change Opacity

```typescript
opacity: 0.8,        // Border opacity (higher = more visible)
fillOpacity: 0.15,   // Fill opacity (lower = more transparent)
```

- **Border opacity**: 0.7-0.9 for good visibility
- **Fill opacity**: 0.10-0.25 for subtle highlighting

### Change Colors

Use any hex color:
```typescript
color: '#ff6b9d',    // Pink
color: '#10b981',    // Emerald green
color: '#f43f5e',    // Rose
```

### Add Custom Icons

Icons automatically appear for `restricted` and `emergency` zones. To add icons for other types, modify `getZoneIcon()` in `mapService.ts`.

## Showing/Hiding Zones

Toggle zones on/off:

```typescript
{
  active: true,   // Zone visible
  active: false,  // Zone hidden
}
```

Or filter programmatically:
```typescript
import { getActiveZones, getZonesByType } from './droneZones'

const activeZones = getActiveZones()              // All active zones
const patrolZones = getZonesByType('patrol')      // Only patrol zones
```

## Advanced: Dynamic Zones

To create zones at runtime:

```typescript
const newZone: DroneZone = {
  id: `zone-${Date.now()}`,
  name: 'Dynamic Zone',
  type: 'patrol',
  coords: [...],
  // ... rest of properties
}

// Add to zones array
droneZones.push(newZone)
```

## Tips

1. **Keep polygons simple**: 4-6 points usually sufficient
2. **Close the polygon**: Last coordinate = first coordinate
3. **Use low fill opacity**: 0.10-0.20 for subtle highlighting
4. **Test visibility**: Darker map themes need higher opacity
5. **Position drones inside**: Lat/lng must be within zone boundaries
6. **Name zones clearly**: Helps with drone data association

## Example: Complete Zone Setup

```typescript
// 1. Define zone in droneZones.ts
{
  id: 'munich-emergency',
  name: 'Munich Emergency Response Zone',
  type: 'emergency',
  coords: [
    [48.13, 11.55],
    [48.15, 11.60],
    [48.13, 11.62],
    [48.11, 11.57],
    [48.13, 11.55]
  ],
  color: '#f59e0b',
  center: [48.13, 11.585],
  opacity: 0.8,
  fillOpacity: 0.2,
  active: true,
  description: 'Emergency medical drone operations'
}

// 2. Add drone in mockData.ts
{
  id: 'munich-med-1',
  lat: 48.13,
  lng: 11.59,
  title: 'Air Ambulance DE-MED-12',
  type: 'drone',
  status: 'active',
  data: {
    zone: 'Munich Emergency Response Zone',
    mission: 'Emergency medical supplies',
    // ...
  }
}
```

## Questions?

- Zone not showing? Check `active: true` and coordinates are valid
- Wrong position? Verify lat/lng order: `[latitude, longitude]`
- Opacity issues? Adjust based on map theme (dark/light/satellite)







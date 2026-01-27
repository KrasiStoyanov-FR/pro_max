# Test Drone Troubleshooting Guide

## Current Issue: Test Drone Not Appearing on Map

### Root Cause
The frontend is looking for `drone_id=9999` (default) but your simulation script is inserting `drone_id=7601` (from `PERF_DRONE_ID=7601` in `.env`).

### Why This Happens
**Vite only exposes environment variables with the `VITE_` prefix to the frontend.**

Your `.env` file has:
- ✅ `PERF_DRONE_ID=7601` (works for backend scripts like `simulate-drone-flight.js`)
- ❌ Missing `VITE_PERF_DRONE_ID=7601` (frontend can't see it)

### Solution

Add this line to your `.env` file:

```bash
VITE_PERF_DRONE_ID=7601
```

Then **restart your dev server** (`npm run dev`) for the change to take effect.

### Verification Steps

1. **Check the console on page load:**
   - You should see: `[Perf Config] Test drone ID: 7601 (from env: VITE_PERF_DRONE_ID)`
   - If you see `9999` or `default`, the env variable isn't being read

2. **Run the simulation:**
   ```bash
   npm run sim:drone-flight
   ```
   - Should insert data with `drone_id=7601`

3. **Check browser console for logs:**
   - `[RealtimeService] Received drone_position insert:` - SSE event received
   - `[MapPins] 🚀 TEST DRONE Position received via SSE:` - Position handler triggered
   - `[DataStore] ✅ Upserting TEST DRONE position to store:` - Store updated
   - `[MapPins] 🔄 Incremental refresh: Building TEST DRONE pin:` - Pin being built
   - `[MapPins] ✅ Incremental refresh: TEST DRONE pin ready for map:` - Pin ready

4. **Verify data exists:**
   ```bash
   npm run verify:test-drone
   ```
   - Should show data for `drone_id=7601`

### Expected Console Output (After Fix)

When the simulation runs and SSE events are received, you should see:

```
[RealtimeService] Received drone_position insert: { type: 'drone_position', action: 'insert', dataId: 12345, droneId: 7601, ... }
[MapPins] 🚀 TEST DRONE Position received via SSE: { positionId: 12345, droneId: 7601, ... }
[DataStore] ✅ Upserting TEST DRONE position to store: { positionId: 12345, droneId: 7601, ... }
[MapPins] 🔄 Incremental refresh: Store has 1 TEST DRONE positions, metadata: found
[MapPins] 🔄 Incremental refresh: Building TEST DRONE pin: { droneId: 7601, ... }
[MapPins] ✅ Incremental refresh: TEST DRONE pin ready for map: { id: 'drone-7601', ... }
```

### If Still Not Working

1. **Check SSE connection:**
   - Look for `[RealtimeService] Connected` in console
   - If you see 404 errors, the SSE endpoint might not be running

2. **Check data insertion:**
   - Run `npm run verify:test-drone` to confirm data exists in DB
   - Check that `drone_id=7601` matches your `VITE_PERF_DRONE_ID`

3. **Check time windows:**
   - In perf mode, time windows are set to 1 year
   - Old test drone data should still appear

4. **Check map visibility:**
   - Ensure drone markers are visible in map settings
   - Check if the test drone is outside the current map viewport

### About the "Disconnected" Messages

The "Disconnected" then "Connected" messages happen because:
- When SSE connection fails (404), it closes the connection
- The reconnection logic then tries to connect again
- This is expected behavior - the app will continue to work with periodic polling if SSE isn't available

The improved error handling now only logs "Disconnected" when actually disconnecting an active connection, not on failed attempts.

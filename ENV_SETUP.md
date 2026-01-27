# Environment Variable Setup for Performance Testing

## Important: Vite Environment Variables

**Vite only exposes environment variables with the `VITE_` prefix to the frontend.**

For the test drone ID to work in the frontend, you need to add this to your `.env` file:

```bash
# Frontend (Vite) - REQUIRED for frontend to see the value
VITE_PERF_DRONE_ID=7601

# Backend scripts - used by Node.js scripts (simulate-drone-flight.js, verify-test-drone.js)
PERF_DRONE_ID=7601
```

## Current Issue

Your `.env` file has:
- ✅ `PERF_DRONE_ID=7601` (works for backend scripts)
- ❌ Missing `VITE_PERF_DRONE_ID=7601` (frontend can't see it)

## Solution

Add this line to your `.env` file:

```bash
VITE_PERF_DRONE_ID=7601
```

Then **restart your dev server** (`npm run dev`) for the change to take effect.

## Why Both?

- `VITE_PERF_DRONE_ID` - Used by the frontend (Vue/Vite)
- `PERF_DRONE_ID` - Used by backend Node.js scripts

The frontend code will check `VITE_PERF_DRONE_ID` first, then fall back to `PERF_DRONE_ID` if needed, but Vite won't expose `PERF_DRONE_ID` to the frontend without the `VITE_` prefix.

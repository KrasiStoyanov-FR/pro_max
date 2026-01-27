# SSE (Server-Sent Events) Configuration

## Problem

When you switch `VITE_API_BASE_URL` to `localhost` to test the SSE endpoint, **all API calls** (including data fetching) go to localhost, which may have different or minimal data.

## Solution

We've added a separate environment variable `VITE_SSE_BASE_URL` that allows you to configure the SSE endpoint independently from the main API.

## Configuration

### Option 1: Use Remote Server for Both Data and SSE (Recommended)

```bash
# Main API (for data) - use remote server
VITE_API_BASE_URL=http://dds.pm99.site:3001/api/db

# SSE endpoint - same as main API (or omit VITE_SSE_BASE_URL)
# VITE_SSE_BASE_URL=http://dds.pm99.site:3001/api/db
```

### Option 2: Use Remote Server for Data, Localhost for SSE Testing

```bash
# Main API (for data) - use remote server with real data
VITE_API_BASE_URL=http://dds.pm99.site:3001/api/db

# SSE endpoint - use localhost for testing
VITE_SSE_BASE_URL=http://localhost:3001/api/db
```

**Note:** For this to work, your localhost server must:
1. Be running (`npm run server`)
2. Have the `/api/realtime/events` endpoint registered
3. Connect to the same database (or you'll get different data)

### Option 3: Use Localhost for Both (Development Only)

```bash
# Main API (for data) - localhost
VITE_API_BASE_URL=http://localhost:3001/api/db

# SSE endpoint - same as main API (or omit VITE_SSE_BASE_URL)
# VITE_SSE_BASE_URL=http://localhost:3001/api/db
```

## Priority Order

The SSE service uses URLs in this priority:
1. `VITE_SSE_BASE_URL` (if set) - dedicated SSE endpoint
2. `VITE_API_BASE_URL` (if set) - fallback to main API URL
3. `http://localhost:3001/api/db` (default)

## Why This Matters

- **Data consistency**: Always use the same database/server for data
- **SSE testing**: Test SSE endpoint independently without affecting data sources
- **No fake data**: Avoid accidentally using localhost data when you want remote data

## Current Issue Fix

If you're seeing "fake" or minimal data when switching to localhost:

1. **Keep `VITE_API_BASE_URL` pointing to your remote server:**
   ```bash
   VITE_API_BASE_URL=http://dds.pm99.site:3001/api/db
   ```

2. **Only set `VITE_SSE_BASE_URL` if you want to test SSE on localhost:**
   ```bash
   VITE_SSE_BASE_URL=http://localhost:3001/api/db
   ```

3. **Restart your dev server** after changing env variables

This way, you'll always get real data from `dds.pm99.site`, but can test SSE on localhost if needed.

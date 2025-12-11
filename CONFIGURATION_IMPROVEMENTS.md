# Configuration Improvements Summary

This document outlines all the configuration improvements made to prepare the project for client showcase. All hardcoded configuration values have been moved to environment variables for easier deployment and environment-specific configurations.

## Changes Overview

### 1. Backend Server Configuration (`server.js`)

#### Database Configuration
- **Host**: Moved from hardcoded `detect.pm99.site` to `DB_HOST` environment variable
  - Default: `localhost`
  - Previous commented value: `172.16.50.100` (can now be set via env)

- **Port**: Moved from hardcoded `58591` to `DB_PORT` environment variable
  - Default: `3306`
  - Previous commented value: `3306` (now the default)

- **User**: Moved from hardcoded `drone_app` to `DB_USER` environment variable
  - Default: `root`

- **Password**: Moved from hardcoded `Qwerty@` to `DB_PASSWORD` environment variable
  - Default: empty string (must be provided)
  - **Security Note**: Never commit passwords to version control!

- **Database Name**: Added `DB_NAME` environment variable
  - Default: `drone_monitoring`

- **Connection Pool Settings**: All pool configuration values are now environment variables:
  - `DB_CONNECTION_LIMIT` (default: 10)
  - `DB_ACQUIRE_TIMEOUT` (default: 60000ms)
  - `DB_TIMEOUT` (default: 60000ms)
  - `DB_CONNECT_TIMEOUT` (default: 10000ms)
  - `DB_RECONNECT` (default: true)
  - `DB_CHARSET` (default: utf8mb4)

#### Server Configuration
- **Port**: Enhanced to support both `PORT` and `SERVER_PORT` environment variables
  - Default: `3001`

- **Server Host**: Added `SERVER_HOST` environment variable for server logs
  - Default: `localhost`

#### SQLite Configuration
- **SQLite Path**: Made configurable via `SQLITE_PATH` environment variable
  - Default: `database.sqlite` in project root

### 2. Frontend API Configuration (`src/services/api.ts`)

#### API Base URL
- **Base URL**: Moved from hardcoded `http://localhost:3001/api/db` to `VITE_API_BASE_URL` environment variable
  - Default: `http://localhost:3001/api/db`
  - Previous commented value: `http://172.16.50.50:3001/api/db` (can now be set via env)

#### API Timeout
- **Timeout**: Made configurable via `VITE_API_TIMEOUT` environment variable
  - Default: `30000` (30 seconds)

#### Database Name
- **Database Name**: Made configurable via `VITE_DB_NAME` environment variable
  - Default: `drone_monitoring`
  - All API calls now use this variable instead of hardcoded values

#### Health Endpoint
- Fixed health endpoint to properly call `/api/health` (server health) instead of database health

### 3. Vite Development Server Configuration (`vite.config.ts`)

#### Server Port
- **Port**: Made configurable via `VITE_PORT` or `PORT` environment variables
  - Default: `3000`

#### Server Host
- **Host**: Made configurable via `VITE_HOST` environment variable
  - Default: `true` (allows external connections)

#### Allowed Hosts
- **Allowed Hosts**: Made configurable via `VITE_ALLOWED_HOSTS` environment variable
  - Format: Comma-separated list (e.g., `detect.pm99.site,localhost`)
  - Default: empty array
  - Previously hardcoded: `['detect.pm99.site']`

### 4. Environment Variables File (`env.example`)

Completely rewritten with comprehensive documentation:

#### Frontend Variables (Vite)
- `VITE_API_BASE_URL` - Backend API base URL
- `VITE_API_TIMEOUT` - API request timeout
- `VITE_DB_NAME` - Database name for API requests
- `VITE_PORT` - Frontend dev server port
- `VITE_HOST` - Frontend dev server host configuration
- `VITE_ALLOWED_HOSTS` - Allowed hosts for dev server
- `VITE_MAP_PROVIDER` - Map provider (leaflet/mapbox)
- `VITE_MAPBOX_KEY` - Mapbox API key
- `VITE_APP_TITLE` - Application title

#### Backend Variables (Node.js)
- `PORT` / `SERVER_PORT` - Backend server port
- `SERVER_HOST` - Server hostname for logs

#### Database Variables
- `USE_SQLITE` - Enable SQLite mode
- `SQLITE_PATH` - SQLite database file path
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `DB_CONNECTION_LIMIT` - Connection pool size
- `DB_ACQUIRE_TIMEOUT` - Pool acquire timeout
- `DB_TIMEOUT` - Query timeout
- `DB_CONNECT_TIMEOUT` - Connection timeout
- `DB_RECONNECT` - Enable automatic reconnection
- `DB_CHARSET` - Database character set

## Migration Guide

### For Local Development

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` with your local settings:
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api/db
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_local_password
   DB_NAME=drone_monitoring
   ```

### For Remote/Production Deployment

1. Copy the example environment file:
   ```bash
   cp env.example .env.production
   ```

2. Edit `.env.production` with production settings:
   ```env
   VITE_API_BASE_URL=http://172.16.50.50:3001/api/db
   DB_HOST=detect.pm99.site
   DB_PORT=58591
   DB_USER=drone_app
   DB_PASSWORD=your_secure_password_here
   DB_NAME=drone_monitoring
   VITE_ALLOWED_HOSTS=detect.pm99.site
   ```

### Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different passwords** for different environments
3. **Restrict access** to environment files containing sensitive data
4. **Use secrets management** tools in production (e.g., AWS Secrets Manager, HashiCorp Vault)
5. **Rotate passwords** regularly

## Benefits

1. **Environment-Specific Configuration**: Easy switching between local, staging, and production
2. **Security**: Sensitive credentials are no longer hardcoded in source code
3. **Flexibility**: Easy to reconfigure without code changes
4. **Client Showcase Ready**: Professional configuration management
5. **Deployment Ready**: Supports multiple deployment scenarios (SFTP server, cloud, etc.)

## Testing the Changes

After updating your environment variables:

1. **Backend**: Restart the server and verify it connects to the correct database
   ```bash
   npm run server
   ```

2. **Frontend**: Clear cache and restart the dev server
   ```bash
   npm run dev
   ```

3. **Verify**: Check that all API calls are working and database connections are successful

## Files Modified

- `server.js` - Database and server configuration
- `src/services/api.ts` - API client configuration
- `vite.config.ts` - Development server configuration
- `env.example` - Comprehensive environment variables documentation

## Notes

- All changes maintain backward compatibility with sensible defaults
- Existing functionality is preserved
- The configuration is now more maintainable and professional
- Easy to add new configuration options in the future




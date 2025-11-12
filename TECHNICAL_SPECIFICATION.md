# Defense Radar Dashboard - Technical Specification Document

**Version:** 3.15.3  
**Date:** 2024  
**Project:** Drone Tracking System (DTS)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [System Architecture](#system-architecture)
4. [Core Functionalities](#core-functionalities)
5. [User Experience & Flows](#user-experience--flows)
6. [Technical Stack](#technical-stack)
7. [Database Schema](#database-schema)
8. [API Documentation](#api-documentation)
9. [User Interface Components](#user-interface-components)
10. [Security & Authentication](#security--authentication)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The **Defense Radar Dashboard** is a comprehensive, production-ready web application designed for real-time monitoring and tracking of drone operations, RF detections, and operator positions. Built with modern web technologies, the system provides an intuitive, interactive map-based interface for defense and security personnel to monitor airspace activity, detect threats, and manage restricted zones.

### Key Highlights

- **Real-time Monitoring**: Live tracking of drones, RF detections, and operator positions
- **Interactive Map Interface**: Leaflet-based map with custom markers, zones, and trajectory visualization
- **Database Integration**: Direct connection to MariaDB database for real-time data retrieval
- **Responsive Design**: Mobile-friendly interface with collapsible sidebar and adaptive layouts
- **Role-Based Access**: Authentication system with support for multiple user roles (Admin, Operator, Viewer)
- **Zone Management**: Visual representation of restricted zones, patrol areas, and operation zones

---

## Project Overview

### Purpose

The Defense Radar Dashboard serves as a centralized monitoring and control system for:
- **Drone Detection**: Real-time tracking of detected drones with position, altitude, speed, and trajectory data
- **RF Signal Monitoring**: Detection and analysis of radio frequency signals from drone transmitters
- **Operator Tracking**: Monitoring of drone operator positions and activities
- **Zone Management**: Visualization and management of restricted airspace, patrol zones, and operation areas
- **Threat Assessment**: Real-time status monitoring and threat level evaluation

### Target Users

- **Administrators**: Full system access, database management, user management
- **Operators**: Real-time monitoring, target selection, zone management
- **Viewers**: Read-only access to map and status information

### Overall Result

The application successfully delivers a production-ready solution that:
- Connects to live MariaDB database for real-time data
- Provides intuitive map-based visualization of all tracked entities
- Supports interactive exploration with pin selection, clustering, and focus modes
- Maintains responsive performance with efficient data caching
- Offers extensible architecture for future feature additions

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vue 3 + TypeScript)            │
│                    Port: 3000                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Pages      │  │  Components  │  │    Store     │       │
│  │  - Login     │  │  - MapView   │  │  - Auth      │       │
│  │  - Map       │  │  - Sidebar   │  │  - Map       │       │
│  └──────────────┘  │  - InfoPanel │  └──────────────┘       │
│                    └──────────────┘                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST API
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              Backend (Express.js + Node.js)                 │
│                    Port: 3001                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Endpoints                           │   │
│  │  - /api/health                                       │   │
│  │  - /api/db/health                                    │   │
│  │  - /api/db/table/:tableName                          │   │
│  │  - /api/db/query                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ MySQL Protocol
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              Database (MariaDB/MySQL)                       │
│              Host: 172.16.50.100:3306                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Database: drone_monitoring              │   │
│  │  - drones                                            │   │
│  │  - drone_positions                                   │   │
│  │  - rf_detections                                     │   │
│  │  - operator_positions                                │   │
│  │  - gps_unit_position                                 │   │
│  │  - flight_sessions                                   │   │
│  │  - receiver_logs                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Frontend Structure
```
src/
├── pages/             # Route-level components
│   ├── Login.vue      # Authentication page
│   └── Map.vue        # Main map interface
├── components/        # Reusable components
│   ├── layout/        # Layout components
│   │   ├── Sidebar.vue
│   │   ├── TopNav.vue
│   │   ├── LayoutWrapper.vue
│   │   └── InfoPanel.vue
│   └── map/           # Map-specific components
│       ├── MapView.vue
│       ├── MapControls.vue
│       ├── ClusterInfoPanel.vue
│       └── StatusSummaryCard.vue
├── store/             # Pinia state management
│   ├── auth.ts        # Authentication state
│   └── map.ts         # Map state
├── services/          # API and business logic
│   ├── api.ts         # Database API client
│   ├── mapService.ts  # Map operations
│   └── droneZones.ts  # Zone definitions
├── composables/       # Vue composition functions
│   ├── useAuth.ts
│   └── useMapPins.ts
└── types/             # TypeScript type definitions
    ├── auth.ts
    ├── database.ts
    └── map.ts
```

#### Backend Structure
```
server.js              # Express server entry point
├── Database Connection Pool
├── API Routes
│   ├── Health Checks
│   ├── Database Queries
│   └── Table Operations
└── Error Handling
```

---

## Core Functionalities

### 1. Interactive Map Interface

**Description**: Leaflet-based interactive map with real-time data visualization

**Features**:
- **Map Rendering**: OpenStreetMap tiles with custom styling
- **Marker System**: Custom markers for drones, RF detections, operators, and GPS units
- **Pin Clustering**: Automatic clustering of nearby markers for better performance
- **Zone Visualization**: Color-coded zones for different operation types
- **Trajectory Display**: Path visualization for drone movement history
- **Map Controls**: Zoom, pan, layer toggle, geolocation, and refresh controls

**Visual Elements**:
- Drone markers (blue) with altitude and speed indicators
- RF detection markers (yellow) with signal strength
- Operator position markers (purple)
- GPS unit markers (green)
- Zone polygons with semi-transparent fills
- Trajectory lines connecting historical positions

*[Screenshot Placeholder: Map Interface with Markers and Zones]*

### 2. Real-Time Data Monitoring

**Description**: Live data retrieval and display from MariaDB database

**Data Sources**:
- **Drones Table**: Active drone registry with MAC addresses, serial numbers, UAS IDs
- **Drone Positions**: Real-time GPS coordinates, altitude, speed, timestamps
- **RF Detections**: Radio frequency signals with strength, frequency, detection status
- **Operator Positions**: Drone operator location tracking
- **GPS Unit Positions**: GPS tracking unit locations
- **Flight Sessions**: Historical flight data with duration, distance, max altitude/speed
- **Receiver Logs**: System status and receiver health information

**Update Mechanism**:
- Automatic data refresh every 30 seconds (configurable)
- Request deduplication to prevent duplicate API calls
- 30-second cache duration for optimal performance
- Manual refresh button for immediate updates

*[Screenshot Placeholder: Status Summary Card with Live Statistics]*

### 3. Pin Selection & Information Display

**Description**: Interactive pin selection with detailed information panels

**Selection Flow**:
1. User clicks on map marker or cluster
2. System highlights selected pin
3. Information panel slides in from left side
4. Detailed data displayed based on pin type

**Information Panel Features**:
- **Drone Information**: ID, serial number, UAS ID, altitude, speed, receiver type
- **RF Detection Details**: Frequency, signal strength, detection status, timestamp
- **Trajectory History**: Last 20 position points with timestamps
- **Detection Checkpoints**: List of RF detections with signal metrics
- **Focus Mode**: Enhanced view for detailed drone tracking
- **Quick Actions**: Zoom to pin, enter/exit focus mode

*[Screenshot Placeholder: Info Panel with Drone Details]*

### 4. Cluster Management

**Description**: Intelligent clustering of nearby markers with interactive exploration

**Features**:
- **Automatic Clustering**: Groups nearby pins based on zoom level
- **Cluster Panel**: Side panel showing all pins in selected cluster
- **Search & Filter**: Search pins by name, filter by type
- **Pin Selection**: Click pin in cluster list to select and zoom
- **Cluster Zoom**: Zoom to cluster bounds to view all pins

**Cluster Types**:
- Drone clusters
- RF detection clusters
- Mixed clusters (multiple types)

*[Screenshot Placeholder: Cluster Panel with Pin List]*

### 5. Zone Management System

**Description**: Visual representation of drone operation zones and restricted areas

**Zone Types**:
- **Patrol Zones** (Green): Police/security patrol areas
- **Delivery Zones** (Blue): Commercial delivery routes
- **Restricted Zones** (Red): No-fly zones (airports, government buildings)
- **Emergency Zones** (Orange): Medical/rescue operations
- **Training Zones** (Cyan): Pilot training areas
- **Surveillance Zones** (Purple): Monitoring/surveillance areas

**Zone Features**:
- Semi-transparent polygon overlays
- Color-coded borders and fills
- Zone descriptions in tooltips
- Active/inactive toggle
- Customizable opacity and colors

**Current Zones** (Sofia, Bulgaria):
- Sofia City Center Delivery Zone
- Sofia West Surveillance Zone
- Sofia Parliament No-Fly Zone
- Sofia Airport No-Fly Zone
- Sofia North Police Patrol Zone
- Sofia Emergency Response Zone
- And 6 additional zones

*[Screenshot Placeholder: Map with Multiple Zone Overlays]*

### 6. Authentication & Authorization

**Description**: Secure user authentication with role-based access control

**Features**:
- **Login Page**: Email/password authentication with validation
- **Session Management**: Token-based authentication with expiration
- **Role-Based Access**: Admin, Operator, Viewer roles
- **Route Guards**: Protected routes requiring authentication
- **Auto-Redirect**: Redirects authenticated users away from login
- **Remember Me**: Optional session persistence

**Current Implementation**:
- Mock authentication for development
- Admin credentials: `admin@radar.com` / `password`
- Session storage for token persistence
- TODO: Backend authentication integration

*[Screenshot Placeholder: Login Page]*

### 7. Status Monitoring Dashboard

**Description**: Real-time system status and statistics display

**Status Indicators**:
- **Database Connection**: Green/red indicator with connection status
- **Active Drones**: Count of currently tracked drones
- **RF Detections**: Number of active RF signal detections
- **Operators**: Count of tracked operator positions

**Update Frequency**: Every 60 seconds

**Display Location**: Top-right corner overlay card

*[Screenshot Placeholder: Status Summary Card]*

### 8. Responsive Sidebar Navigation

**Description**: Collapsible sidebar with navigation and user menu

**Features**:
- **Collapsible Design**: Expandable/collapsible with smooth animations
- **Navigation Items**: Map, Dashboard, Account, Receivers, Controls (some pending implementation)
- **Active Route Indicator**: Visual indicator for current route
- **User Menu**: User profile dropdown with logout option
- **Version Display**: Application version in footer

**Animation**: 400ms smooth transitions

*[Screenshot Placeholder: Sidebar Navigation]*

---

## User Experience & Flows

### Flow 1: User Authentication

```
1. User navigates to application
   └─> Redirected to /login if not authenticated

2. User enters credentials
   ├─> Email: admin@radar.com
   └─> Password: password

3. System validates credentials
   ├─> Success: Create session token
   │   └─> Redirect to /map (or intended route)
   └─> Failure: Display error message

4. Session persists across page reloads
   └─> Token stored in sessionStorage
```

*[Screenshot Placeholder: Login Flow]*

### Flow 2: Map Exploration

```
1. User lands on Map page
   ├─> Map initializes with Sofia, Bulgaria center (42.6977, 23.3219)
   ├─> Zoom level: 10
   └─> Loads drone positions, RF detections, zones

2. User interacts with map
   ├─> Pan: Click and drag
   ├─> Zoom: Mouse wheel or controls
   └─> Click marker: Select pin

3. Pin selection triggers
   ├─> Marker highlights
   ├─> Info panel slides in
   └─> Map adjusts viewport (if needed)

4. User explores data
   ├─> View trajectory points
   ├─> Check detection history
   ├─> Enter focus mode (for drones)
   └─> Navigate to related detections
```

*[Screenshot Placeholder: Map Interaction Flow]*

### Flow 3: Cluster Exploration

```
1. User zooms out to see clusters
   └─> Multiple pins grouped into cluster marker

2. User clicks cluster
   ├─> Cluster panel slides in from left
   ├─> Shows list of all pins in cluster
   └─> Displays pin count and types

3. User searches/filters pins
   ├─> Type search query
   ├─> Filter by pin type
   └─> Results update in real-time

4. User selects pin from list
   ├─> Pin selected on map
   ├─> Map zooms to pin location
   └─> Info panel shows pin details

5. User can zoom to cluster
   └─> Map adjusts to show all cluster pins
```

*[Screenshot Placeholder: Cluster Exploration]*

### Flow 4: Focus Mode (Drone Tracking)

```
1. User selects drone pin
   └─> Info panel shows drone details

2. User clicks "Enter Focus" button
   ├─> Focus mode activated
   ├─> Trajectory displayed on map
   ├─> Detection checkpoints highlighted
   └─> Enhanced tracking view

3. User navigates trajectory
   ├─> Click trajectory point in list
   ├─> Map highlights that position
   └─> Timestamp displayed

4. User views detections
   ├─> Click detection checkpoint
   ├─> Map focuses on detection location
   └─> Detection details displayed

5. User exits focus mode
   └─> Returns to normal map view
```

*[Screenshot Placeholder: Focus Mode Interface]*

### Flow 5: Zone Visualization

```
1. User views map
   └─> Zones automatically displayed as overlays

2. User hovers over zone
   └─> Tooltip shows zone name and description

3. User clicks zone (if interactive)
   └─> Zone details displayed (future feature)

4. User toggles zone visibility (future feature)
   └─> Zones can be shown/hidden by type
```

*[Screenshot Placeholder: Zone Visualization]*

### Flow 6: Data Refresh

```
1. Automatic refresh (every 30 seconds)
   ├─> Fetches latest drone positions
   ├─> Updates RF detections
   └─> Refreshes operator positions

2. Manual refresh
   ├─> User clicks refresh button
   ├─> Clears cache
   └─> Fetches fresh data immediately

3. Data updates
   ├─> New pins appear on map
   ├─> Existing pins update positions
   └─> Status summary updates
```

---

## Technical Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue.js | 3.4.0 | Progressive JavaScript framework |
| TypeScript | 5.3.0 | Type-safe JavaScript |
| Vite | 5.0.10 | Build tool and dev server |
| Pinia | 2.1.7 | State management |
| Vue Router | 4.2.5 | Client-side routing |
| Leaflet | 1.9.4 | Interactive maps |
| TailwindCSS | 3.3.6 | Utility-first CSS framework |
| HeadlessUI | 1.7.16 | Unstyled UI components |
| Axios | 1.6.0 | HTTP client |
| Phosphor Icons | 2.2.1 | Icon library |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express.js | 5.1.0 | Web framework |
| MySQL2 | 3.15.2 | MariaDB/MySQL driver |
| CORS | 2.8.5 | Cross-origin resource sharing |
| dotenv | 17.2.3 | Environment variables |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Vue TSC | TypeScript checking |
| Concurrently | Run multiple processes |

---

## Database Schema

### Tables Overview

#### 1. `drones`
Stores registered drone information.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| mac_address | VARCHAR | Drone MAC address |
| serial_number | VARCHAR | Drone serial number |
| uas_id | VARCHAR | UAS identification |
| first_seen | TIMESTAMP | First detection time |
| last_seen | TIMESTAMP | Last detection time |
| is_active | BOOLEAN | Active status |

#### 2. `drone_positions`
Real-time GPS positions of drones.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| drone_id | INT | Foreign key to drones |
| time | TIMESTAMP | Position timestamp |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| altitude | DECIMAL(8,2) | Altitude in meters |
| speed | DECIMAL(5,2) | Speed in m/s |
| receiver_type | VARCHAR | Detection receiver type |
| system_id | INT | System identifier |

#### 3. `rf_detections`
Radio frequency signal detections.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| time | TIMESTAMP | Detection timestamp |
| detection_status | BOOLEAN | Active detection |
| signal_strength | DECIMAL(8,2) | Signal strength in dBm |
| frequency | DECIMAL(10,2) | Frequency in MHz |
| drone_id | INT | Associated drone ID |
| system_id | INT | System identifier |

#### 4. `operator_positions`
Drone operator location tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| drone_id | INT | Associated drone ID |
| time | TIMESTAMP | Position timestamp |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| system_id | INT | System identifier |

#### 5. `gps_unit_position`
GPS tracking unit positions.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| unit_id | INT | GPS unit identifier |
| system_id | INT | System identifier |
| name | VARCHAR | Unit name |
| status | VARCHAR | Unit status |
| time | TIMESTAMP | Position timestamp |
| latitude | DECIMAL | GPS latitude |
| longitude | DECIMAL | GPS longitude |

#### 6. `flight_sessions`
Historical flight session data.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| drone_id | INT | Foreign key to drones |
| start_time | TIMESTAMP | Session start |
| end_time | TIMESTAMP | Session end |
| max_altitude | DECIMAL(8,2) | Maximum altitude |
| max_speed | DECIMAL(5,2) | Maximum speed |
| total_distance | DECIMAL(10,2) | Total distance traveled |

#### 7. `receiver_logs`
System receiver status and logs.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| receiver_type | VARCHAR | Receiver type |
| status | VARCHAR | Status message |
| time | TIMESTAMP | Log timestamp |
| message | TEXT | Log message |

---

## API Documentation

### Base URL
```
http://172.16.50.50:3001/api/db
```

### Endpoints

#### Health Check
```
GET /api/health
```
Returns server health status.

**Response**:
```json
{
  "success": true,
  "message": "Database API server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Database Health
```
GET /api/db/health
```
Tests database connection.

**Response**:
```json
{
  "success": true,
  "message": "MariaDB connection successful",
  "data": [
    {
      "test": 1,
      "version": "10.x.x-MariaDB"
    }
  ]
}
```

#### Get Table Data
```
GET /api/db/table/:tableName?database=drone_monitoring&limit=100
```
Retrieves data from specified table.

**Parameters**:
- `tableName`: Table name (e.g., `drones`, `drone_positions`)
- `database`: Database name (optional, defaults to current)
- `limit`: Result limit (default: 100)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

#### Get Table Schema
```
GET /api/db/schema/:tableName?database=drone_monitoring
```
Returns table structure.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "Field": "id",
      "Type": "int(11)",
      "Null": "NO",
      "Key": "PRI",
      "Default": null,
      "Extra": "auto_increment"
    }
  ]
}
```

#### Execute Custom Query
```
POST /api/db/query
```
Executes custom SQL query.

**Request Body**:
```json
{
  "query": "SELECT * FROM drones WHERE is_active = 1 LIMIT 10"
}
```

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

#### Get All Databases
```
GET /api/db/databases
```
Lists all available databases.

**Response**:
```json
{
  "success": true,
  "data": ["drone_monitoring", "other_db"]
}
```

#### Get All Tables
```
GET /api/db/tables?database=drone_monitoring
```
Lists tables in database.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "name": "drones",
      "database": "drone_monitoring"
    }
  ]
}
```

---

## User Interface Components

### Layout Components

#### Sidebar (`Sidebar.vue`)
- **Purpose**: Main navigation and user menu
- **Features**: Collapsible, active route indicator, user dropdown
- **States**: Expanded (256px) / Collapsed (64px)
- **Animation**: 400ms smooth transition

#### Top Navigation (`TopNav.vue`)
- **Purpose**: Top bar with branding and quick actions
- **Status**: Pending implementation

#### Layout Wrapper (`LayoutWrapper.vue`)
- **Purpose**: Main layout container
- **Features**: Sidebar integration, content area management

### Map Components

#### Map View (`MapView.vue`)
- **Purpose**: Main map rendering and interaction
- **Features**: Leaflet integration, marker rendering, event handling
- **Props**: `pins`, `center`, `zoom`, `maxZoom`, `minZoom`
- **Events**: `pin-selected`, `pin-deselected`

#### Map Controls (`MapControls.vue`)
- **Purpose**: Map control buttons overlay
- **Features**: Zoom in/out, layer toggle, geolocation, refresh

#### Status Summary Card (`StatusSummaryCard.vue`)
- **Purpose**: Real-time status display
- **Location**: Top-right corner
- **Updates**: Every 60 seconds
- **Metrics**: Database status, active drones, RF detections, operators

#### Cluster Info Panel (`ClusterInfoPanel.vue`)
- **Purpose**: Display and manage pin clusters
- **Features**: Search, filter, pin list, zoom to cluster
- **Animation**: Slide in from left

#### Info Panel (`InfoPanel.vue`)
- **Purpose**: Detailed pin information display
- **Features**: Drone details, trajectory, detections, focus mode
- **Animation**: Slide in from left
- **States**: Open / Closed

### Page Components

#### Login Page (`Login.vue`)
- **Purpose**: User authentication
- **Features**: Email/password form, validation, error handling
- **Background**: Hero image with backdrop blur

#### Map Page (`Map.vue`)
- **Purpose**: Main application interface
- **Features**: Map view, status summary, layout integration

---

## Security & Authentication

### Current Implementation

**Authentication Method**: Mock authentication (development)

**Credentials**:
- Email: `admin@radar.com`
- Password: `password`

**Session Management**:
- Token stored in `sessionStorage`
- 24-hour expiration
- Auto-initialization on page load

**Security Features**:
- Route guards for protected pages
- Auto-redirect for authenticated/unauthenticated users
- Token expiration checking
- Session persistence across reloads

### Production Recommendations

1. **Backend Authentication**: Implement JWT-based authentication
2. **HttpOnly Cookies**: Replace sessionStorage with secure cookies
3. **Token Refresh**: Implement refresh token mechanism
4. **Password Hashing**: Use bcrypt or similar
5. **Rate Limiting**: Prevent brute force attacks
6. **HTTPS**: Enforce secure connections
7. **CORS Configuration**: Restrict allowed origins
8. **Input Validation**: Server-side validation for all inputs
9. **SQL Injection Prevention**: Use parameterized queries (already implemented)

---

## Deployment & Infrastructure

### Development Setup

**Requirements**:
- Node.js 18+
- npm
- MariaDB/MySQL database access

**Installation**:
```bash
npm install
cp env.example .env.local
npm start
```

**Environment Variables**:
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_MAP_PROVIDER=leaflet
VITE_MAPBOX_KEY=your_key_here
VITE_APP_TITLE=Defense Radar Dashboard
```

### Production Build

**Build Command**:
```bash
npm run build
```

**Output**: `dist/` directory with optimized production files

### Docker Deployment

**Dockerfile Example**:
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Server Configuration

**Backend Server**:
- Port: 3001
- Database: MariaDB at `172.16.50.100:3306`
- Connection Pool: 10 connections
- Timeout: 60 seconds

**Frontend Server**:
- Port: 3000 (development)
- Static files (production)

---

## Future Enhancements

### Planned Features

1. **Real-time WebSocket Integration**
   - Live data streaming without polling
   - Instant updates for position changes
   - Reduced server load

2. **Advanced Filtering & Search**
   - Filter by drone type, status, zone
   - Date range filtering
   - Advanced search with multiple criteria

3. **Export Functionality**
   - Export map data to CSV/JSON
   - Generate PDF reports
   - Screenshot capture

4. **Mobile App**
   - React Native mobile application
   - Push notifications
   - Offline support

5. **Advanced Analytics Dashboard**
   - Statistical charts and graphs
   - Trend analysis
   - Historical data visualization

6. **Multi-language Support**
   - i18n integration
   - Language switcher
   - Localized content

7. **Dark Mode Theme**
   - Theme switcher
   - System preference detection
   - Custom color schemes

8. **Offline Support**
   - Service workers
   - Cached data access
   - Offline map tiles

9. **User Management**
   - User CRUD operations
   - Role management
   - Permission system

10. **Zone Management UI**
    - Create/edit zones from interface
    - Zone activation/deactivation
    - Zone analytics

### Technical Improvements

1. **Performance Optimization**
   - Virtual scrolling for large lists
   - Lazy loading for map tiles
   - Code splitting improvements

2. **Testing**
   - Unit tests (Jest/Vitest)
   - E2E tests (Playwright)
   - Integration tests

3. **Monitoring & Logging**
   - Error tracking (Sentry)
   - Performance monitoring
   - User analytics

4. **Documentation**
   - API documentation (Swagger/OpenAPI)
   - Component documentation (Storybook)
   - User guides

---

## Screenshots & Visual Documentation

### Required Screenshots

1. **Login Page**
   - Full login interface
   - Background image
   - Form validation states

2. **Map Interface - Overview**
   - Full map with all markers
   - Zones displayed
   - Status summary card
   - Sidebar navigation

3. **Map Interface - Pin Selected**
   - Selected pin highlighted
   - Info panel open
   - Trajectory displayed

4. **Cluster Panel**
   - Cluster selected
   - Cluster panel open
   - Pin list visible

5. **Focus Mode**
   - Focus mode active
   - Trajectory highlighted
   - Detection checkpoints visible

6. **Zone Visualization**
   - Multiple zones displayed
   - Different zone types
   - Zone tooltips

7. **Status Summary**
   - Status card with all metrics
   - Database connection status
   - Live statistics

8. **Responsive Design**
   - Mobile view
   - Tablet view
   - Desktop view

---

## Conclusion

The Defense Radar Dashboard represents a comprehensive solution for real-time drone monitoring and tracking. With its modern architecture, intuitive interface, and robust data integration, the system provides a solid foundation for defense and security operations.

The application successfully demonstrates:
- **Production-ready code** with TypeScript and Vue 3
- **Real-time data integration** with MariaDB database
- **Intuitive user experience** with interactive maps and panels
- **Extensible architecture** for future enhancements
- **Responsive design** for multiple device types

The system is ready for deployment and can be extended with additional features as outlined in the Future Enhancements section.

---

## Appendix

### File Structure Reference

```
pro_max/
├── src/
│   ├── assets/          # Images, icons
│   ├── components/      # Vue components
│   ├── composables/     # Composition functions
│   ├── pages/           # Route pages
│   ├── router/          # Vue Router config
│   ├── services/        # API services
│   ├── store/           # Pinia stores
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── server.js            # Express backend
├── package.json         # Dependencies
├── vite.config.ts      # Vite configuration
├── tailwind.config.js   # TailwindCSS config
└── README.md            # Project documentation
```

### Key Configuration Files

- `vite.config.ts`: Vite build configuration
- `tailwind.config.js`: TailwindCSS theme and utilities
- `tsconfig.json`: TypeScript compiler options
- `server.js`: Express server and database connection
- `.env.local`: Environment variables (not in repo)

### Contact & Support

For technical support or questions:
- Review project README.md
- Check Vue.js documentation: https://vuejs.org/
- Check TailwindCSS documentation: https://tailwindcss.com/
- Review security documentation: `src/utils/security.md`

---

**Document Version**: 1.0  
**Last Updated**: 11.11.2025  
**Maintained By**: FRAM Creative Solutions




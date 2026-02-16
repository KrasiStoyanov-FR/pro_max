# Defense Radar Dashboard - User Guide

## Overview

The Defense Radar Dashboard is a real-time surveillance and monitoring system designed to track drones, targets, and various sensors across a geographical area. It provides operators with situational awareness through an interactive map and detailed data visualizations.

## Key Features

### 🗺️ Interactive Map

The core of the application is the interactive map, which displays real-time data from connected sensors and drones.

- **Real-Time Tracking:** Visualize moving targets (drones, vehicles) as they are detected.
- **Clustering:** Automatically groups nearby markers to prevent clutter when zoomed out.
- **Filtering:** Show or hide specific types of targets or sensors using the map controls.
- **Zoom & Pan:** Navigate the map freely to focus on specific regions.
- **Device Status:** View the operational status of all sensors (Active, Inactive, Maintenance).

### 🛰️ Sensor Management

Manage and monitor the network of sensors deployed in the field.

- **Status Monitoring:** Quickly identify offline or malfunctioning sensors.
- **Detailed Information:** Click on any sensor marker to view its specifications, location, and current readings.
- **Remote Configuration:** Adjust sensor parameters directly from the dashboard (if supported).

### 🚁 Drone Detection

Track unauthorized or friendly drones entering the monitored airspace.

- **Alerts:** Visual indicators for detected drones.
- **Flight Path:** View the trajectory and history of drone movements.
- **Identification:** Access detailed information about the drone model and classification.

### 📊 Data Tables & Reports

View comprehensive lists of all detections and sensor data.

- **Sort & Filter:** Organize data by time, type, status, or location.
- **Export:** Download reports for analysis or record-keeping.
- **Search:** Quickly find specific devices or events.

## User Roles

The system supports different levels of access:

1. **Viewer:** Can view the map and data tables but cannot make changes.
2. **Operator:** Can acknowledge alerts and update basic settings.
3. **Admin:** Full access to system configuration, user management, and advanced features.

## Getting Started

### Accessing the Dashboard

1. Open your web browser (Chrome, Firefox, or Edge recommended).
2. Navigate to the provided URL (e.g., `http://localhost:3000` or your organization's domain).
3. Log in using your assigned credentials.

### Navigation

- **Sidebar:** The main navigation menu on the left allows you to switch between the Map, Sensors list, Drones list, and Settings.
- **Top Bar:** Displays system status, notifications, and your user profile.
- **Map Controls:** Located on the map itself (usually top-right or bottom-right) for layers and zoom.

## Troubleshooting

- **Map Not Loading:** Check your internet connection. If the issue persists, contact IT support.
- **Login Issues:** Ensure you are using the correct email and password. If you forgot your password, use the "Forgot Password" link or contact an administrator.
- **Data Not Updating:** The system relies on a backend connection. If data appears stale, try refreshing the page. If the problem continues, the server might be down.

## Support

For technical assistance or to report a bug, please contact the system administrator or refer to the internal help desk.

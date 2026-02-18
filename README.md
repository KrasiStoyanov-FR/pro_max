# Defense Radar Dashboard

A production-ready Vue 3 + TypeScript frontend application for monitoring radar targets and threats with an interactive map interface.

## 📚 Documentation

- **[Developer Onboarding Guide](ONBOARDING.md)**: Detailed instructions for setting up the development environment, project structure, and workflow.
- **[User Guide](USER_GUIDE.md)**: Functional overview of the application, key features, and user roles.
- **[Pakistan Local Setup](PAKISTAN_LOCAL_SETUP.md)**: Specific instructions for the Pakistan local deployment with SQLite.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pro_max
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```bash
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_MAP_PROVIDER=leaflet
   VITE_MAPBOX_KEY=your_mapbox_key_here
   VITE_APP_TITLE=Defense Radar Dashboard
   ```

4. **Start the application**
   
   **Option 1: Frontend only (for UI testing)**
   ```bash
   npm run dev
   ```
   
   **Option 2: Full stack (Frontend + Backend + Database)**
   ```bash
   npm run start
   ```

5. **Access the application**
   - Open your browser and navigate to: **http://localhost:3000**

## 🔐 Admin Access

### Master Account Credentials
Use these credentials for master admin access:

- **Email**: `master@promax.com`
- **Password**: `DroneTrackingSystem`

### Demo Account Credentials (Legacy)
For backward compatibility, the following demo account is also available:

- **Email**: `admin@radar.com`
- **Password**: `password`

- **Email**: `user@radar.com`
- **Password**: `password`

### What You Can Access
- Interactive radar map with real-time target monitoring
- Database connection status and health checks
- User management and authentication system
- Responsive dashboard with mobile support

## 🏗️ Architecture Overview

This application consists of three main components:

### Frontend (Vue 3 + TypeScript)
- **Port**: 3000
- **Framework**: Vue 3 with Composition API
- **Styling**: TailwindCSS + HeadlessUI
- **State Management**: Pinia
- **Maps**: Leaflet with OpenStreetMap

### Backend (Express.js + Node.js)
- **Port**: 3001
- **Framework**: Express.js with TypeScript
- **Database**: MariaDB/MySQL connection
- **API Endpoints**: Database health checks, table queries, custom SQL execution

### Database (MariaDB)
- **Host**: `dds.pm99.site:58591`
- **Database**: `drone_app`
- **Connection**: Configured in `server.js`

## 📋 Available Scripts

### Development
- `npm run dev` - Start frontend development server only (original brand)
- `npm run dev:original` - Start frontend with original brand
- `npm run dev:pakistan` - Start frontend with Pakistan brand
- `npm run server` - Start backend server only  
- `npm run start` - Start both frontend and backend concurrently (original brand)
- `npm run start:original` - Start full stack with original brand
- `npm run start:pakistan` - Start full stack with Pakistan brand

### Build
- `npm run build` - Build frontend for production (original brand)
- `npm run build:original` - Build with original brand
- `npm run build:pakistan` - Build with Pakistan brand
- `npm run preview` - Preview production build

### Utilities
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `node scripts/init-sqlite.js` - Initialize SQLite database (Pakistan local)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3001/api` | Yes |
| `VITE_MAP_PROVIDER` | Map provider (`leaflet` or `mapbox`) | `leaflet` | No |
| `VITE_MAPBOX_KEY` | Mapbox API key (if using Mapbox) | - | No |
| `VITE_APP_TITLE` | Application title | `Defense Radar Dashboard` | No |

### Database Configuration

The application supports two database modes:

**1. Remote MariaDB/MySQL (Default):**
- Configured via environment variables in `.env`
- Requires a remote database server
- See `env.example` for configuration

**2. Local SQLite (Pakistan Local Deployment):**
- File-based database (no server required)
- Perfect for local deployment
- Configured via `USE_SQLITE=true` in `.env`
- Database file: `database.sqlite` in project root
- See `env.pakistan.local.example` for configuration
- See [PAKISTAN_LOCAL_SETUP.md](PAKISTAN_LOCAL_SETUP.md) for setup guide

## 🌐 API Endpoints

The backend provides the following endpoints:

- `GET /api/health` - Server health check
- `GET /api/db/health` - Database connection health check
- `GET /api/db/databases` - List all available databases
- `GET /api/db/tables` - List tables in current database
- `GET /api/db/tables/:database` - List tables in specific database
- `GET /api/db/table/:tableName` - Get data from specific table
- `GET /api/db/schema/:tableName` - Get table schema
- `POST /api/db/query` - Execute custom SQL query
- `GET /api/db/all-data` - Get all data from all tables

## 🗺️ Map Features

- **Interactive Map**: Leaflet-based with custom markers and controls
- **Real-time Data**: Live target monitoring with status indicators
- **Responsive Design**: Mobile-friendly layout with collapsible sidebar
- **Custom Markers**: Drone detection zones and radar targets
- **Map Controls**: Zoom, pan, and layer controls

## 🔒 Authentication System

### Current Implementation
- **Mock Authentication**: Hardcoded credentials for development
- **Session Storage**: Tokens stored in browser sessionStorage
- **Route Guards**: Protected routes with authentication checks
- **User Roles**: Admin, Operator, and Viewer roles supported

### Admin Features
- Full access to all dashboard features
- Database management capabilities
- User management (when backend integration is complete)
- System configuration access

## 🚀 Deployment

### Development

**Original Brand (Default):**
```bash
npm run start  # Starts both frontend and backend
# or explicitly
npm run start:original
```

**Pakistan Brand:**
```bash
npm run start:pakistan
```

### Pakistan Local Deployment (SQLite)

For Pakistan client's **local deployment** with a **local SQLite database** (no remote database server required):

1. **Copy the Pakistan local configuration:**
   ```bash
   cp env.pakistan.local.example .env
   ```

2. **Initialize the SQLite database (first time only):**
   ```bash
   node scripts/init-sqlite.js
   ```

3. **Start the application:**
   ```bash
   npm run start:pakistan
   ```

4. **Access the application:**
   - Localhost: `http://localhost:3000`
   - IP Address: `http://YOUR_IP:3000` (see network configuration)
   - Custom URL: If configured

📖 **See [PAKISTAN_LOCAL_SETUP.md](PAKISTAN_LOCAL_SETUP.md) for complete setup instructions.**

### Production Build

**Original Brand:**
```bash
npm run build
# or explicitly
npm run build:original
```

**Pakistan Brand:**
```bash
npm run build:pakistan
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

### Docker Deployment
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

## 🛠️ Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **HeadlessUI** - Unstyled UI components
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Leaflet** - Interactive maps
- **Axios** - HTTP client

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime environment
- **MariaDB/MySQL** - Database
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📱 Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## 🔍 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Kill process using port 3000
   npx kill-port 3000
   ```

2. **Database connection issues**
   
   **For Remote MariaDB/MySQL:**
   - Check if the MariaDB server is accessible
   - Verify network connectivity to the database host
   - Check backend logs for connection errors
   - Verify `USE_SQLITE=false` in `.env`
   
   **For Local SQLite (Pakistan):**
   - Verify `USE_SQLITE=true` in `.env`
   - Check that `database.sqlite` file exists
   - Run `node scripts/init-sqlite.js` to initialize database
   - Check file permissions (ensure app can read/write)
   - See [PAKISTAN_LOCAL_SETUP.md](PAKISTAN_LOCAL_SETUP.md) for troubleshooting

3. **Build failures**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Environment variables not loading**
   - Ensure `.env.local` file exists in project root
   - Restart the development server after changes

## 📞 Support

For technical support or questions:

1. **Pakistan Local Deployment**: See [PAKISTAN_LOCAL_SETUP.md](PAKISTAN_LOCAL_SETUP.md)
2. **Multi-Brand Setup**: See [MULTI_BRAND_SETUP.md](MULTI_BRAND_SETUP.md)
3. **Configuration**: See [CONFIGURATION_IMPROVEMENTS.md](CONFIGURATION_IMPROVEMENTS.md)
4. **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
5. Check the [security documentation](src/utils/security.md)
6. Review the [Vue.js documentation](https://vuejs.org/)
7. Check [TailwindCSS documentation](https://tailwindcss.com/)
8. Open an issue in the repository

## 🔮 Roadmap

- [ ] Real-time WebSocket integration
- [ ] Advanced filtering and search
- [ ] Export functionality for reports
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Offline support with service workers

---

## 🎯 Quick Reference

**Start the application**: `npm run start`  
**Access URL**: http://localhost:3000  
**Master Email**: master@promax.com  
**Master Password**: DroneTrackingSystem  
**Backend API**: http://localhost:3001/api  

**Ready to use!** 🚀
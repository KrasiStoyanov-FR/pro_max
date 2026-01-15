# Pakistan Local Deployment Guide

This guide explains how to set up the project for **local deployment** in Pakistan with a **local SQLite database**. This means the database runs on the same machine as the application - no remote database server is required.

## 🎯 Key Differences

| Feature | Remote Version | Local Version (Pakistan) |
|---------|---------------|-------------------------|
| Database | Remote MariaDB/MySQL | Local SQLite file |
| Database Server | Required (separate server) | Not required |
| Network Dependency | Requires network to DB server | No network dependency |
| Setup Complexity | Higher (DB server setup) | Lower (file-based) |
| Data Location | Remote server | Local file (`database.sqlite`) |

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- No database server installation required! (SQLite is included)

## 🚀 Quick Setup Steps

### Step 1: Install Dependencies

```bash
# Navigate to project directory
cd pro_max

# Install all dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy the Pakistan local configuration template
cp env.pakistan.local.example .env

# Edit the .env file if needed (usually default settings work)
# On Windows: notepad .env
# On Linux/Mac: nano .env
```

**Important settings in `.env`:**
- `USE_SQLITE=true` - Enables local SQLite database
- `VITE_APP_BRAND=pakistan` - Sets Pakistan brand
- `VITE_API_BASE_URL=http://localhost:3001/api/db` - Backend API URL

### Step 3: Initialize Database (First Time Only)

The SQLite database will be created automatically when you first run the application. However, if you want to initialize it with the schema manually:

```bash
# On Windows (PowerShell)
node scripts/init-sqlite.js

# On Linux/Mac
node scripts/init-sqlite.js
```

This will create `database.sqlite` with all required tables.

### Step 4: Start the Application

```bash
# Start both frontend and backend
npm start:pakistan

# Or start them separately:
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend (Pakistan brand)
npm run dev:pakistan
```

### Step 5: Access the Application

Once started, you can access the application via:

1. **Localhost**: `http://localhost:3000`
2. **IP Address**: `http://YOUR_IP:3000` (see Network Access section)
3. **Custom URL**: If configured (see Network Access section)

## 🌐 Network Access Configuration

To access the application from other devices on your network (via IP address or URL):

### Step 1: Find Your IP Address

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Linux/Mac:**
```bash
ifconfig
# or
ip addr
```

### Step 2: Update Environment Variables

Edit your `.env` file:

```env
# Replace YOUR_IP with your actual IP address
VITE_API_BASE_URL=http://YOUR_IP:3001/api/db
VITE_ALLOWED_HOSTS=YOUR_IP,localhost,127.0.0.1
SERVER_HOST=0.0.0.0
```

**Example:**
```env
VITE_API_BASE_URL=http://192.168.1.100:3001/api/db
VITE_ALLOWED_HOSTS=192.168.1.100,localhost,127.0.0.1
SERVER_HOST=0.0.0.0
```

### Step 3: Configure Firewall

**Windows:**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Allow Node.js or add ports 3000 and 3001

**Linux:**
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# CentOS/RHEL
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

### Step 4: Restart Application

After changing `.env`, restart the application:

```bash
# Stop the application (Ctrl+C)
# Then start again
npm start:pakistan
```

## 🔐 Login Credentials

Use these accounts to log in:

- **Master Account**: 
  - Email: `master@promax.com`
  - Password: `DroneTrackingSystem`

- **BlueSurge Master Account**:
  - Email: `master@bluesurge.com`
  - Password: `DroneTrakingSystem`

- **Admin Account**:
  - Email: `admin@radar.com`
  - Password: `password`

## 📁 Database File Location

The SQLite database is stored as a single file:

- **Location**: `database.sqlite` (in project root)
- **Backup**: Simply copy this file to backup your data
- **Size**: Grows as data is added (typically small for this application)

### Backing Up the Database

```bash
# Simple backup (copy the file)
cp database.sqlite database.sqlite.backup

# Or with timestamp
cp database.sqlite database.sqlite.$(date +%Y%m%d_%H%M%S)
```

### Restoring the Database

```bash
# Stop the application first
# Then replace the database file
cp database.sqlite.backup database.sqlite

# Restart the application
npm start:pakistan
```

## 🛠️ Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Check that `USE_SQLITE=true` in `.env`
2. Verify `database.sqlite` exists (or let it be created automatically)
3. Check file permissions (ensure the app can read/write the file)

### Issue: "Port already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
# Kill the process using the PID shown

# Linux/Mac
sudo lsof -ti:3000 | xargs kill
sudo lsof -ti:3001 | xargs kill
```

### Issue: "Cannot access via IP address"

**Solution:**
1. Verify `VITE_API_BASE_URL` uses your IP (not localhost)
2. Check `VITE_ALLOWED_HOSTS` includes your IP
3. Ensure firewall allows ports 3000 and 3001
4. Verify `SERVER_HOST=0.0.0.0` in `.env`
5. Restart the application after changing `.env`

### Issue: "Database is empty or missing tables"

**Solution:**
```bash
# Initialize the database schema
node scripts/init-sqlite.js

# Then restart the application
npm start:pakistan
```

### Issue: "Application shows wrong brand"

**Solution:**
1. Check `VITE_APP_BRAND=pakistan` in `.env`
2. Clear browser cache
3. Restart the application
4. Use `npm start:pakistan` instead of `npm start`

## 📊 Database Management

### View Database Contents

You can use SQLite command-line tools or GUI tools:

**Command Line:**
```bash
# Install SQLite CLI (if not already installed)
# Windows: Download from sqlite.org
# Linux: sudo apt-get install sqlite3
# Mac: brew install sqlite3

# Open database
sqlite3 database.sqlite

# View tables
.tables

# View data from a table
SELECT * FROM drones LIMIT 10;

# Exit
.quit
```

**GUI Tools:**
- **DB Browser for SQLite** (Free, cross-platform)
- **SQLiteStudio** (Free, cross-platform)
- **DBeaver** (Free, supports SQLite)

### Database Schema

The database includes these tables:
- `drones` - Drone information
- `drone_positions` - Drone location history
- `rf_detections` - RF signal detections
- `operator_positions` - Operator locations
- `receiver_logs` - Receiver system logs
- `gps_unit_position` - GPS unit/detector positions

## 🔄 Updating the Application

When updating the application:

1. **Backup your database:**
   ```bash
   cp database.sqlite database.sqlite.backup
   ```

2. **Pull latest code:**
   ```bash
   git pull
   ```

3. **Update dependencies:**
   ```bash
   npm install
   ```

4. **Restart application:**
   ```bash
   npm start:pakistan
   ```

## 📝 Production Deployment

For production deployment:

1. **Build the application:**
   ```bash
   npm run build:pakistan
   ```

2. **Use a process manager** (PM2, systemd, etc.) to keep it running

3. **Set up automatic backups** of `database.sqlite`

4. **Configure reverse proxy** (nginx, Apache) if using a custom domain

## ✅ Verification Checklist

Before considering setup complete, verify:

- [ ] `.env` file exists with `USE_SQLITE=true`
- [ ] `VITE_APP_BRAND=pakistan` is set
- [ ] Application starts without errors (`npm start:pakistan`)
- [ ] Can access via `http://localhost:3000`
- [ ] Can log in with provided credentials
- [ ] Database file `database.sqlite` exists
- [ ] Can access via IP address (if configured)
- [ ] Data persists after restart

## 🆘 Getting Help

If you encounter issues:

1. Check the `TROUBLESHOOTING.md` file
2. Review server logs in the terminal
3. Check browser console (F12) for errors
4. Verify all environment variables are set correctly
5. Ensure all prerequisites are installed

## 📚 Additional Resources

- **Main README**: `README.md`
- **Multi-Brand Setup**: `MULTI_BRAND_SETUP.md`
- **Configuration Guide**: `CONFIGURATION_IMPROVEMENTS.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`

---

**Note**: This setup uses SQLite, which is perfect for local deployment. The database is a single file that can be easily backed up, moved, or restored. No database server installation or configuration is required!

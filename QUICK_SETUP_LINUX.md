# Quick Setup Guide for Linux - Database Connection Fix

## Immediate Steps to Fix Connection Issues

### Step 1: Create/Update `.env` File

```bash
# Navigate to project directory
cd /path/to/pro_max

# Copy example file
cp env.example .env

# Edit .env file
nano .env
```

**Add/Update these lines in `.env`:**

```bash
# Database Configuration
USE_SQLITE=false
DB_HOST=localhost
DB_PORT=3306
DB_USER=drone_app
DB_PASSWORD=Qwerty@
DB_NAME=drone_monitoring

# Frontend API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/db
VITE_DB_NAME=drone_monitoring
```

**Save and exit** (Ctrl+X, then Y, then Enter in nano)

### Step 2: Verify Database Service is Running

```bash
# Check MySQL/MariaDB status
sudo systemctl status mysql
# OR
sudo systemctl status mariadb

# If not running, start it:
sudo systemctl start mysql
# OR
sudo systemctl start mariadb
```

### Step 3: Test Database Connection

```bash
# Test if you can connect to the database
mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"
```

**If connection fails:**
- Check if database exists: `mysql -h localhost -u root -p -e "SHOW DATABASES;"`
- Check if user exists: `mysql -h localhost -u root -p -e "SELECT User FROM mysql.user;"`
- Create database if needed: `mysql -h localhost -u root -p -e "CREATE DATABASE IF NOT EXISTS drone_monitoring;"`
- Grant permissions: `mysql -h localhost -u root -p -e "GRANT ALL PRIVILEGES ON drone_monitoring.* TO 'drone_app'@'localhost'; FLUSH PRIVILEGES;"`

### Step 4: Stop Any Running Servers

```bash
# Find and kill any processes on ports 3000 and 3001
sudo fuser -k 3000/tcp
sudo fuser -k 3001/tcp
```

### Step 5: Start the Application

```bash
# Start both frontend and backend
npm start
```

**You should see output like:**
```
[API] Database server running on port 3001
[API] Health check: http://localhost:3001/api/health
[MariaDB] Testing connection...
[MariaDB] Test connection successful
[MariaDB] Connection pool created successfully
```

### Step 6: Verify Backend is Working

**In a new terminal:**
```bash
# Test backend health
curl http://localhost:3001/api/health

# Test database health
curl http://localhost:3001/api/db/health
```

Both should return JSON responses.

### Step 7: Access the Application

1. Open browser and go to: `http://localhost:3000`
2. **If you see ERR_BLOCKED_BY_CLIENT errors:**
   - Try `http://127.0.0.1:3000` instead
   - Disable browser extensions (ad blockers)
   - Try incognito/private browsing mode

### Step 8: Login

Use one of these accounts:
- Email: `master@promax.com` / Password: `DroneTrackingSystem`
- Email: `master@bluesurge.com` / Password: `DroneTrakingSystem`
- Email: `admin@radar.com` / Password: `password`

## Common Issues

### "Port already in use"
```bash
sudo fuser -k 3000/tcp
sudo fuser -k 3001/tcp
npm start
```

### "Cannot connect to database"
1. Check MySQL/MariaDB is running: `sudo systemctl status mysql`
2. Verify credentials in `.env` file
3. Test connection: `mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring`

### "ERR_BLOCKED_BY_CLIENT"
1. Disable browser extensions
2. Try `http://127.0.0.1:3000` instead of `http://localhost:3000`
3. Check backend is running: `curl http://localhost:3001/api/health`

### Backend shows connection errors
- Verify `.env` file exists and has correct credentials
- Restart backend after changing `.env`
- Check database service is running

## Verification Checklist

Before reporting issues, verify:

- [ ] `.env` file exists in project root
- [ ] Database credentials in `.env` are correct (drone_app / Qwerty@)
- [ ] MySQL/MariaDB service is running
- [ ] Backend server starts without errors (`npm start`)
- [ ] `curl http://localhost:3001/api/health` returns JSON
- [ ] `curl http://localhost:3001/api/db/health` returns success
- [ ] Browser can access `http://localhost:3000` or `http://127.0.0.1:3000`

## Still Having Issues?

1. Check backend terminal for error messages
2. Check browser console (F12) for specific errors
3. See `TROUBLESHOOTING.md` for detailed troubleshooting steps



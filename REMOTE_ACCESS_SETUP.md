# Remote Access Setup Guide

## Overview
This guide helps you configure the application for remote access at `http://10.80.10.223:3000` while using a local database on the server.

## Key Configuration Points

### Frontend (Browser → Backend)
- **Frontend URL**: `http://10.80.10.223:3000` (accessed from remote browser)
- **Backend API URL**: `http://10.80.10.223:3001/api/db` (frontend connects to backend on server IP)

### Backend (Server → Database)
- **Backend listens on**: All interfaces (0.0.0.0:3001) to accept remote connections
- **Database connection**: `localhost` (database is on the same server)

## Step-by-Step Setup

### Step 1: Create .env File on Server

**On the server (where the application runs):**

```bash
# Copy the remote access template
cp env.remote.example .env

# Edit if needed
nano .env
```

### Step 2: Verify Configuration

**The `.env` file should have:**

```bash
# Frontend connects to backend using server IP
VITE_API_BASE_URL=http://10.80.10.223:3001/api/db

# Backend connects to database using localhost (database is on server)
DB_HOST=localhost
DB_PORT=3306
DB_USER=drone_app
DB_PASSWORD=Qwerty@
DB_NAME=drone_monitoring

# Allow remote connections
VITE_HOST=true
VITE_ALLOWED_HOSTS=10.80.10.223,localhost,127.0.0.1
```

### Step 3: Verify Backend Listens on All Interfaces

**The backend server should listen on all interfaces (0.0.0.0), not just localhost.**

Check `server.js` line 838:
```javascript
app.listen(PORT, () => {
```

This should work, but if you need to explicitly bind to all interfaces:
```javascript
app.listen(PORT, '0.0.0.0', () => {
```

**Note:** By default, `app.listen(PORT)` binds to all interfaces, so this should already work.

### Step 4: Verify CORS is Enabled

**Check `server.js` line 17:**
```javascript
app.use(cors())
```

This allows all origins. For production, you might want to restrict it:
```javascript
app.use(cors({
  origin: ['http://10.80.10.223:3000', 'http://localhost:3000']
}))
```

### Step 5: Check Firewall

**On the server, ensure ports 3000 and 3001 are open:**

```bash
# Check firewall status
sudo ufw status

# If firewall is active, allow ports
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# Or for specific IP only (more secure)
sudo ufw allow from 10.80.10.0/24 to any port 3000
sudo ufw allow from 10.80.10.0/24 to any port 3001
```

### Step 6: Restart Application

**After updating `.env`:**

```bash
# Stop current server (Ctrl+C)
# Then restart
npm start
```

### Step 7: Test from Remote Browser

**From a remote machine, test:**

1. **Frontend**: `http://10.80.10.223:3000`
2. **Backend Health**: `http://10.80.10.223:3001/api/health`
3. **Database Health**: `http://10.80.10.223:3001/api/db/health`

## Troubleshooting

### Issue: Can't access from remote browser

**Check:**
1. **Firewall**: Ports 3000 and 3001 must be open
2. **Server binding**: Backend must listen on 0.0.0.0 (all interfaces)
3. **VITE_HOST**: Must be `true` in `.env`
4. **Network**: Server must be reachable from your network

**Test from server:**
```bash
# Test if backend is accessible
curl http://10.80.10.223:3001/api/health
```

**Test from remote machine:**
```bash
# From your local machine
curl http://10.80.10.223:3001/api/health
```

### Issue: Frontend can't connect to backend

**Check:**
1. **VITE_API_BASE_URL** in `.env` must use server IP: `http://10.80.10.223:3001/api/db`
2. **Restart frontend** after changing `.env`
3. **CORS** must be enabled in `server.js`

### Issue: Database connection fails

**Check:**
1. **DB_HOST** must be `localhost` (database is on server)
2. **Database credentials** are correct
3. **MySQL/MariaDB** is running on server
4. **Database exists**: `mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"`

### Issue: CORS errors in browser

**If you see CORS errors:**
1. Check `server.js` has `app.use(cors())`
2. For production, configure CORS with specific origins:
   ```javascript
   app.use(cors({
     origin: ['http://10.80.10.223:3000', 'http://localhost:3000'],
     credentials: true
   }))
   ```

## Configuration Summary

| Component | Configuration | Value |
|-----------|--------------|-------|
| Frontend URL | Browser access | `http://10.80.10.223:3000` |
| Backend API URL | Frontend → Backend | `http://10.80.10.223:3001/api/db` |
| Backend Listen | Server binding | `0.0.0.0:3001` (all interfaces) |
| Database Host | Backend → Database | `localhost` (on server) |
| Database Port | Backend → Database | `3306` (default MySQL/MariaDB) |

## Quick Verification

**On the server, run:**
```bash
# 1. Check .env has correct values
cat .env | grep -E "(VITE_API_BASE_URL|DB_HOST|VITE_HOST)"

# 2. Test backend locally
curl http://localhost:3001/api/health

# 3. Test backend from server IP
curl http://10.80.10.223:3001/api/health

# 4. Test database connection
curl http://localhost:3001/api/db/health
```

**From remote machine:**
```bash
# Test backend accessibility
curl http://10.80.10.223:3001/api/health
```

**If all tests pass, the application should work from remote browser!**



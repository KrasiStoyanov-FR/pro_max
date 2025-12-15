# Troubleshooting Guide - Linux Installation

## Issue: Network Errors and Database Connection Problems

### Symptoms
- `ERR_BLOCKED_BY_CLIENT` errors in browser console
- `Network Error` when trying to connect to `http://localhost:3001`
- All API calls failing

### Step 1: Verify Backend Server is Running

**Check if the backend server is running:**
```bash
# Check if port 3001 is in use
sudo netstat -tulpn | grep 3001
# OR
sudo ss -tulpn | grep 3001
```

**If not running, start it:**
```bash
# Start both frontend and backend
npm start

# OR start backend only in a separate terminal
npm run server
```

**Verify backend is accessible:**
```bash
# Test backend health endpoint
curl http://localhost:3001/api/health

# Test database health endpoint
curl http://localhost:3001/api/db/health
```

### Step 2: Configure Database Credentials

**Create/Update `.env` file in project root:**
```bash
cp env.example .env
nano .env  # or use your preferred editor
```

**Set these values in `.env`:**
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

**Important:** After updating `.env`, restart the backend server:
```bash
# Stop the server (Ctrl+C) and restart
npm start
```

### Step 3: Verify Database Connection

**Test database connection manually:**
```bash
# Test MySQL/MariaDB connection
mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"
```

**If connection fails, check:**
1. MySQL/MariaDB service is running:
   ```bash
   sudo systemctl status mysql
   # OR
   sudo systemctl status mariadb
   ```

2. Database exists:
   ```bash
   mysql -h localhost -u drone_app -p'Qwerty@' -e "SHOW DATABASES;"
   ```

3. User has proper permissions:
   ```bash
   mysql -h localhost -u root -p -e "GRANT ALL PRIVILEGES ON drone_monitoring.* TO 'drone_app'@'localhost'; FLUSH PRIVILEGES;"
   ```

### Step 4: Fix Browser Blocking Issues

**ERR_BLOCKED_BY_CLIENT is often caused by:**

1. **Browser Extensions (Ad Blockers)**
   - Disable ad blockers for `localhost`
   - Try incognito/private browsing mode
   - Try a different browser

2. **Browser Security Settings**
   - Some browsers block mixed content (HTTP/HTTPS)
   - Try accessing via `http://127.0.0.1:3000` instead of `http://localhost:3000`

3. **Firewall Issues**
   ```bash
   # Check if firewall is blocking
   sudo ufw status
   
   # If needed, allow ports
   sudo ufw allow 3000/tcp
   sudo ufw allow 3001/tcp
   ```

### Step 5: Check Server Logs

**Backend server should show:**
```
[API] Database server running on port 3001
[API] Health check: http://localhost:3001/api/health
[API] Database health check: http://localhost:3001/api/db/health
[MariaDB] Testing connection...
[MariaDB] Test connection successful
[MariaDB] Connection pool created successfully
```

**If you see connection errors:**
- Verify database credentials in `.env`
- Check database service is running
- Verify user permissions

### Step 6: Verify Environment Variables are Loaded

**Check if backend is reading `.env` correctly:**
```bash
# In the backend terminal, you should see connection attempts
# If you see "DB_HOST=undefined", the .env file isn't being read
```

**Make sure `.env` is in the project root (same directory as `server.js`):**
```bash
ls -la .env
```

### Common Issues and Solutions

#### Issue: "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Port already in use
```bash
# Find process using port 3001
sudo lsof -i :3001
# OR
sudo fuser -k 3001/tcp

# Kill the process and restart
npm start
```

#### Issue: Database connection timeout
- Check if MySQL/MariaDB is listening on the correct port
- Verify firewall isn't blocking connections
- Check if database service is running

#### Issue: Permission denied errors
```bash
# Make sure you have permissions to read .env
chmod 644 .env

# Make sure database user has proper permissions
```

### Quick Verification Checklist

- [ ] Backend server is running (`npm run server` shows no errors)
- [ ] Port 3001 is accessible (`curl http://localhost:3001/api/health`)
- [ ] `.env` file exists in project root
- [ ] Database credentials in `.env` are correct
- [ ] MySQL/MariaDB service is running
- [ ] Database `drone_monitoring` exists
- [ ] User `drone_app` has access to database
- [ ] Browser extensions are disabled or configured
- [ ] Firewall allows ports 3000 and 3001

### Still Having Issues?

1. **Check backend terminal for error messages**
2. **Check browser console for specific error codes**
3. **Verify all services are running:**
   ```bash
   # Check Node.js processes
   ps aux | grep node
   
   # Check MySQL/MariaDB
   sudo systemctl status mysql
   ```

4. **Test database connection from command line:**
   ```bash
   mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring
   ```




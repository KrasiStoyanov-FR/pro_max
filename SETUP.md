# Setup Guide

## Requirements

### Install Node.js and npm

**Linux (Debian/Ubuntu):**
1. Update your package list:
   ```bash
   sudo apt update
   ```
2. Install Node.js 18+ and npm using NodeSource repository (recommended):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
   Or install from Debian repositories (may have older version):
   ```bash
   sudo apt install nodejs npm
   ```
3. Verify the installation:
   ```bash
   node --version
   npm --version
   ```
   Both commands should display version numbers (e.g., v18.17.0 and 9.6.7)

**Windows:**
1. Go to: https://nodejs.org/
2. Download the LTS version (Long Term Support, version 18 or higher)
3. Run the installer (.msi file)
4. Accept all default settings, click "Next" through the installation
5. npm is automatically included with Node.js

**Verify installation (Windows):**
Open Command Prompt or PowerShell and run:
```bash
node --version
npm --version
```
Both commands should display version numbers (e.g., v18.17.0 and 9.6.7)

### Database Access

The application supports both **SQLite** (local file-based database) and **MariaDB/MySQL** (remote or local server).

**For Local Database (SQLite) - Recommended for Linux:**
1. Copy the environment example file:
   ```bash
   cp env.example .env
   ```
2. Edit `.env` and set:
   ```bash
   USE_SQLITE=true
   SQLITE_PATH=database.sqlite
   ```
   The SQLite database file will be created automatically in the project root when you first run the application.

**For Local MariaDB/MySQL Database:**
1. Copy the environment example file:
   ```bash
   cp env.example .env
   ```
2. Edit `.env` and configure your database connection:
   ```bash
   USE_SQLITE=false
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=drone_app
   DB_PASSWORD=Qwerty@
   DB_NAME=drone_monitoring
   ```
3. Also set the frontend API configuration in `.env`:
   ```bash
   VITE_API_BASE_URL=http://localhost:3001/api/db
   VITE_DB_NAME=drone_monitoring
   ```
4. **Important:** Make sure MySQL/MariaDB service is running:
   ```bash
   sudo systemctl status mysql
   # OR
   sudo systemctl status mariadb
   ```
   If not running, start it:
   ```bash
   sudo systemctl start mysql
   # OR
   sudo systemctl start mariadb
   ```

The application uses `.env` by default. If you're unsure which configuration you need, contact your project administrator.

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Application

```bash
npm start
```

Access: `http://localhost:3000`

## Daily Use

### Start Server

```bash
npm start
```

### Stop Server

Press `Ctrl+C` in terminal

## Production Build

```bash
npm run build
```

## Ports

- Frontend: 3000
- Backend: 3001

## Quick Commands

- `npm start` - Start frontend + backend
- `npm run dev` - Frontend only
- `npm run server` - Backend only
- `npm run build` - Production build

## Troubleshooting

### Issue: ERR_BLOCKED_BY_CLIENT or Network Errors

If you see `ERR_BLOCKED_BY_CLIENT` or network errors in the browser console:

1. **Verify backend server is running:**
   ```bash
   # Check if port 3001 is in use
   sudo netstat -tulpn | grep 3001
   
   # If not running, start it:
   npm start
   ```

2. **Test backend connectivity:**
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api/db/health
   ```
   Both should return JSON responses. If they fail, the backend isn't running or accessible.

3. **Check browser extensions:**
   - Disable ad blockers for localhost
   - Try incognito/private browsing mode
   - Try accessing via `http://127.0.0.1:3000` instead of `http://localhost:3000`

4. **Verify database connection:**
   ```bash
   # Test database connection
   mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"
   ```
   If this fails, check:
   - MySQL/MariaDB service is running: `sudo systemctl status mysql`
   - Database exists: `mysql -h localhost -u drone_app -p'Qwerty@' -e "SHOW DATABASES;"`
   - User has permissions

5. **Check `.env` file:**
   - Make sure `.env` exists in project root (same directory as `server.js`)
   - Verify database credentials are correct
   - Restart backend after changing `.env`: Stop server (Ctrl+C) and run `npm start` again

6. **Check firewall:**
   ```bash
   sudo ufw status
   # If needed, allow ports:
   sudo ufw allow 3000/tcp
   sudo ufw allow 3001/tcp
   ```

For more detailed troubleshooting, see `TROUBLESHOOTING.md`.

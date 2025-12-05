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

**For Remote Database (MariaDB/MySQL):**
1. Copy the environment example file:
   ```bash
   cp env.example .env
   ```
2. Edit `.env` and configure your database connection:
   ```bash
   USE_SQLITE=false
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=drone_monitoring
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

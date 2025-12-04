# Setup Guide

## Requirements

### Install Node.js and npm

**Windows:**
1. Go to: https://nodejs.org/
2. Download the LTS version (Long Term Support, version 18 or higher)
3. Run the installer (.msi file)
4. Accept all default settings, click "Next" through the installation
5. npm is automatically included with Node.js

**Verify installation:**
Open Command Prompt or PowerShell and run:
```bash
node --version
npm --version
```
Both commands should display version numbers (e.g., v18.17.0 and 9.6.7)

### Database Access

Two environment configuration files are provided:
- **`.env`** - Local database configuration
- **`.env.remote`** - Remote database configuration

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

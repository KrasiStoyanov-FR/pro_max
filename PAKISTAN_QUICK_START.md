# Pakistan Local Deployment - Quick Start

## 🚀 3-Step Setup

### Step 1: Install & Configure
```bash
# Install dependencies
npm install

# Copy Pakistan configuration
cp env.pakistan.local.example .env
```

### Step 2: Initialize Database
```bash
# Create database with schema
node scripts/init-sqlite.js
```

### Step 3: Start Application
```bash
# Start the application
npm start:pakistan
```

## ✅ Access the Application

- **Localhost**: http://localhost:3000
- **IP Address**: http://YOUR_IP:3000 (after network config)

## 🔐 Login Credentials

- **Email**: `master@promax.com`
- **Password**: `DroneTrackingSystem`

OR

- **Email**: `master@bluesurge.com`
- **Password**: `DroneTrakingSystem`

## 🌐 Enable Network Access

To access from other devices on your network:

1. **Find your IP address:**
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   ```

2. **Update `.env` file:**
   ```env
   VITE_API_BASE_URL=http://YOUR_IP:3001/api/db
   VITE_ALLOWED_HOSTS=YOUR_IP,localhost,127.0.0.1
   SERVER_HOST=0.0.0.0
   ```

3. **Restart application:**
   ```bash
   npm start:pakistan
   ```

## 📁 Database File

- **Location**: `database.sqlite` (in project root)
- **Backup**: Just copy the file!
- **Restore**: Replace the file and restart

## 🆘 Quick Troubleshooting

**Can't connect?**
- Check `USE_SQLITE=true` in `.env`
- Verify `database.sqlite` exists
- Run `node scripts/init-sqlite.js` again

**Port in use?**
```bash
# Windows
netstat -ano | findstr :3000
# Kill process using PID shown

# Linux/Mac
sudo lsof -ti:3000 | xargs kill
```

**Need help?**
- See [PAKISTAN_LOCAL_SETUP.md](PAKISTAN_LOCAL_SETUP.md) for detailed guide

---

**That's it!** The database is local - no remote server needed! 🎉

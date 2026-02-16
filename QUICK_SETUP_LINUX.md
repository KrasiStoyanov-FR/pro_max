# Quick Setup Guide for Linux

This guide covers the setup process for deploying the Defense Radar Dashboard on a Linux environment, including database configuration options.

## 📋 Prerequisites

- **Node.js 18+** ([Download here](https://nodejs.org/))
- **npm** (included with Node.js)
- **MariaDB/MySQL** (optional, if not using SQLite)

## 🚀 Setup Steps

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd /path/to/pro_max

# Install dependencies
npm install
```

### Step 2: Configure Environment

1.  **Create the `.env` file:**

    ```bash
    cp env.example .env
    ```

2.  **Edit the configuration:**

    ```bash
    nano .env
    ```

    You have two database options. Choose **one**:

    **Option A: Local SQLite (Recommended for simple setup)**
    ```bash
    USE_SQLITE=true
    # SQLITE_PATH=database.sqlite  # Default
    ```
    *If using this option, initialize the database:*
    ```bash
    node scripts/init-sqlite.js
    ```

    **Option B: Remote/Local MariaDB**
    ```bash
    USE_SQLITE=false
    DB_HOST=localhost       # or remote IP
    DB_PORT=3306
    DB_USER=drone_app
    DB_PASSWORD=Qwerty@     # Update if changed
    DB_NAME=drone_monitoring
    ```

### Step 3: Start the Application

Start both the frontend and backend servers:

**For Original Brand:**
```bash
npm run start
```

**For Pakistan Brand:**
```bash
npm run start:pakistan
```

You should see output indicating:
- Backend server running on port **3001**
- Frontend server running on port **3000**
- Database connection successful

### Step 4: Verification

1.  **Backend Health Check:**
    ```bash
    curl http://localhost:3001/api/health
    # Should return {"status":"ok", ...}
    ```

2.  **Database Connection Check:**
    ```bash
    curl http://localhost:3001/api/db/health
    # Should return {"success":true, ...}
    ```

3.  **Access Frontend:**
    Open `http://localhost:3000` in your browser.

## 🛠 Troubleshooting

### "Port already in use"

If ports 3000 or 3001 are occupied:

```bash
# Find and kill processes
sudo fuser -k 3000/tcp
sudo fuser -k 3001/tcp

# Restart application
npm run start
```

### Database Connection Issues (MariaDB)

1.  **Check Service Status:**
    ```bash
    sudo systemctl status mariadb
    # OR
    sudo systemctl status mysql
    ```

2.  **Verify Credentials:**
    Ensure `DB_USER` and `DB_PASSWORD` in `.env` match your database users.

3.  **Test Connection Manually:**
    ```bash
    mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"
    ```

### Firewall Issues (Remote Access)

If accessing from another machine, ensure ports are open:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

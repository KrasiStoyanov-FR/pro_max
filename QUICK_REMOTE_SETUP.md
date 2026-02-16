# Quick Remote Setup Guide

This guide details how to configure the Defense Radar Dashboard for remote access, allowing users to connect to the server from other machines on the network.

## 📋 Server Configuration

### Step 1: Prepare the Environment

On the server machine (e.g., `10.80.10.223`), ensure you have cloned the repository and installed dependencies:

```bash
cd /path/to/pro_max
npm install
```

### Step 2: Configure `.env` for Remote Access

Create or edit the `.env` file:

```bash
cp env.remote.example .env
nano .env
```

**Critical Settings:**

1.  **Frontend API URL:**
    Set `VITE_API_BASE_URL` to the **server's IP address** so the frontend knows where to find the backend API.

    ```bash
    VITE_API_BASE_URL=http://10.80.10.223:3001/api/db
    ```

2.  **Allow Remote Connections:**
    Enable external access for the development server.

    ```bash
    VITE_HOST=true
    VITE_ALLOWED_HOSTS=10.80.10.223,localhost,127.0.0.1
    SERVER_HOST=0.0.0.0  # Listen on all interfaces
    ```

3.  **Database Configuration:**
    Choose your database backend.

    **Option A: Local SQLite (Simplest)**
    ```bash
    USE_SQLITE=true
    ```
    *Initialize if needed:* `node scripts/init-sqlite.js`

    **Option B: MariaDB/MySQL**
    If the database is on the same machine as the server, use `localhost`.

    ```bash
    USE_SQLITE=false
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=drone_app
    DB_PASSWORD=Qwerty@
    DB_NAME=drone_monitoring
    ```

### Step 3: Start the Application

Run the application on the server:

**For Original Brand:**
```bash
npm run start
```

**For Pakistan Brand:**
```bash
npm run start:pakistan
```

The server should output:
- Frontend: `http://10.80.10.223:3000` (or similar)
- Backend: `http://localhost:3001`

### Step 4: Configure Firewall

Ensure the server allows incoming connections on ports 3000 (frontend) and 3001 (backend).

**Ubuntu/Debian (UFW):**
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

**CentOS/RHEL (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## 🌐 Client Access

From another computer on the same network:

1.  Open a browser.
2.  Navigate to `http://10.80.10.223:3000` (replace with your server's IP).

### Verification

If the page loads but data is missing:
1.  Open Developer Tools (F12) -> Network tab.
2.  Check if requests to `http://10.80.10.223:3001/api/db/...` are failing.
3.  If they fail, verify the firewall on the server allows port 3001.
4.  Verify `VITE_API_BASE_URL` in `.env` matches the server IP, **not** `localhost`.

## 🛠 Troubleshooting

**"Connection Refused"**
- Ensure the application is running (`npm run start`).
- Check firewall settings.
- Verify the IP address is correct.

**"CORS Error"**
- The backend is configured to allow CORS, but ensure the `VITE_API_BASE_URL` matches the server IP exactly as entered in the browser (or is accessible).

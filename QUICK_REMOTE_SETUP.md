# Quick Remote Access Setup

## For Server at http://10.80.10.223:3000

### Step 1: Create .env File

**On the server, create `.env` file:**

```bash
cp env.remote.example .env
```

### Step 2: Verify Key Settings

**The `.env` file should have these critical settings:**

```bash
# Frontend connects to backend using server IP
VITE_API_BASE_URL=http://10.80.10.223:3001/api/db

# Database is LOCAL on server - use localhost
DB_HOST=localhost
DB_PORT=3306
DB_USER=drone_app
DB_PASSWORD=Qwerty@
DB_NAME=drone_monitoring

# Allow remote connections
VITE_HOST=true
VITE_ALLOWED_HOSTS=10.80.10.223,localhost,127.0.0.1
SERVER_HOST=10.80.10.223
```

### Step 3: Restart Application

```bash
# Stop current server (Ctrl+C)
npm start
```

### Step 4: Test from Remote Browser

**Access:** `http://10.80.10.223:3000`

**Test endpoints:**
- `http://10.80.10.223:3001/api/health`
- `http://10.80.10.223:3001/api/db/health`

### Step 5: Check Firewall

**If you can't access from remote:**

```bash
# Allow ports through firewall
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

## Important Notes

1. **Database stays local**: `DB_HOST=localhost` (database is on the server)
2. **Frontend uses server IP**: `VITE_API_BASE_URL=http://10.80.10.223:3001/api/db`
3. **Backend listens on all interfaces**: Updated in `server.js` to accept remote connections
4. **CORS is enabled**: Allows cross-origin requests

## If Database Port is Different

**If your database uses a different port (not 3306), update in `.env`:**

```bash
DB_PORT=3307  # or whatever port your database uses
```

## Troubleshooting

**Can't access from remote?**
1. Check firewall: `sudo ufw status`
2. Test from server: `curl http://10.80.10.223:3001/api/health`
3. Test from remote: `curl http://10.80.10.223:3001/api/health`

**Frontend can't connect to backend?**
1. Check `VITE_API_BASE_URL` uses server IP
2. Restart frontend after changing `.env`
3. Check browser console (F12) for errors

**Database connection fails?**
1. Verify `DB_HOST=localhost` (not the server IP)
2. Check database credentials
3. Test: `mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"`




# Testing Database Endpoint

## The Difference

- **`/api/health`** - Simple server check (no database connection)
- **`/api/db/health`** - Database health check (tries to connect to database)

## Why `/api/db/health` Might Fail

The `/api/db/health` endpoint actually tries to connect to your MySQL/MariaDB database. If it fails, it could be:

1. **Database connection issue** (most likely)
2. **Database credentials wrong in `.env`**
3. **MySQL/MariaDB service not running**
4. **Database doesn't exist**

## Test in Terminal

**Test the database endpoint:**
```bash
curl http://localhost:3001/api/db/health
```

**Expected success response:**
```json
{
  "success": true,
  "message": "MariaDB connection successful",
  "data": [{"test": 1, "version": "..."}]
}
```

**If you get an error**, check:

1. **MySQL/MariaDB is running:**
   ```bash
   sudo systemctl status mysql
   # OR
   sudo systemctl status mariadb
   ```

2. **Database credentials in `.env`:**
   ```bash
   cat .env | grep DB_
   ```
   Should show:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=drone_app
   DB_PASSWORD=Qwerty@
   DB_NAME=drone_monitoring
   ```

3. **Test database connection directly:**
   ```bash
   mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"
   ```

4. **Check server terminal for errors:**
   - Look at the terminal where `npm start` is running
   - Check for database connection error messages

## Browser vs Terminal

**Why it works in terminal but not browser:**

1. **Browser extensions** might be blocking `/api/db/health` specifically
2. **CORS issues** (though CORS is enabled in server.js)
3. **Database connection timeout** in browser but not terminal

## Fix Steps

### Step 1: Test Database Endpoint in Terminal
```bash
curl http://localhost:3001/api/db/health
```

**If this FAILS:**
- Database connection problem
- Check `.env` credentials
- Check MySQL/MariaDB is running
- Check server terminal for errors

**If this WORKS:**
- Database connection is fine
- Issue is browser-side (extensions/CORS)

### Step 2: Check Server Terminal

**Look at the terminal where `npm start` is running.**

**When you access `/api/db/health`, you should see:**
```
[API] Testing database connection...
[MariaDB] Testing connection...
[MariaDB] Test connection successful
```

**If you see errors like:**
```
[API] Connection test failed: ...
[MariaDB] Failed to create connection pool: ...
```
→ Database connection problem

### Step 3: Fix Database Connection (if needed)

**If database connection is failing:**

1. **Verify MySQL/MariaDB is running:**
   ```bash
   sudo systemctl start mysql
   ```

2. **Verify database exists:**
   ```bash
   mysql -h localhost -u root -p -e "SHOW DATABASES;"
   ```
   Look for `drone_monitoring` in the list.

3. **Create database if missing:**
   ```bash
   mysql -h localhost -u root -p -e "CREATE DATABASE IF NOT EXISTS drone_monitoring;"
   ```

4. **Verify user has permissions:**
   ```bash
   mysql -h localhost -u root -p -e "GRANT ALL PRIVILEGES ON drone_monitoring.* TO 'drone_app'@'localhost'; FLUSH PRIVILEGES;"
   ```

5. **Test connection:**
   ```bash
   mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"
   ```

6. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   npm start
   ```

### Step 4: Fix Browser Blocking (if database works in terminal)

**If `curl http://localhost:3001/api/db/health` works but browser fails:**

1. **Disable browser extensions**
2. **Try incognito/private mode**
3. **Try different browser**
4. **Use `http://127.0.0.1:3001/api/db/health` in browser**

## Quick Diagnostic

**Run these commands and share the output:**

```bash
# 1. Test simple health endpoint
curl http://localhost:3001/api/health

# 2. Test database health endpoint
curl http://localhost:3001/api/db/health

# 3. Check MySQL is running
sudo systemctl status mysql

# 4. Test direct database connection
mysql -h localhost -u drone_app -p'Qwerty@' drone_monitoring -e "SELECT 1;"
```

**This will tell us exactly where the problem is.**




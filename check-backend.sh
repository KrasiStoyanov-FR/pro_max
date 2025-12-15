#!/bin/bash

echo "=========================================="
echo "Backend Server Diagnostic Check"
echo "=========================================="
echo ""

# Check if port 3001 is in use
echo "1. Checking if port 3001 is in use..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ✓ Port 3001 is in use"
    PID=$(lsof -Pi :3001 -sTCP:LISTEN -t)
    echo "   Process ID: $PID"
    ps -p $PID -o comm=,args=
else
    echo "   ✗ Port 3001 is NOT in use - Backend server is NOT running!"
    echo ""
    echo "   SOLUTION: Start the backend server:"
    echo "   npm start"
    echo "   OR"
    echo "   npm run server"
    exit 1
fi

echo ""
echo "2. Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✓ Backend health endpoint is accessible (HTTP $HEALTH_RESPONSE)"
    curl -s http://localhost:3001/api/health | head -c 200
    echo ""
else
    echo "   ✗ Backend health endpoint returned HTTP $HEALTH_RESPONSE"
    echo "   Backend may be running but not responding correctly"
fi

echo ""
echo "3. Testing database health endpoint..."
DB_HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/db/health 2>/dev/null)
if [ "$DB_HEALTH_RESPONSE" = "200" ]; then
    echo "   ✓ Database health endpoint is accessible (HTTP $DB_HEALTH_RESPONSE)"
    curl -s http://localhost:3001/api/db/health | head -c 200
    echo ""
else
    echo "   ✗ Database health endpoint returned HTTP $DB_HEALTH_RESPONSE"
    echo "   This may indicate a database connection issue"
fi

echo ""
echo "4. Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✓ .env file exists"
    if grep -q "DB_USER=drone_app" .env && grep -q "DB_PASSWORD=Qwerty@" .env; then
        echo "   ✓ Database credentials found in .env"
    else
        echo "   ⚠ Database credentials may not be set correctly"
    fi
else
    echo "   ✗ .env file NOT found!"
    echo "   SOLUTION: Create .env file: cp env.example .env"
fi

echo ""
echo "5. Checking MySQL/MariaDB service..."
if systemctl is-active --quiet mysql || systemctl is-active --quiet mariadb; then
    echo "   ✓ MySQL/MariaDB service is running"
else
    echo "   ✗ MySQL/MariaDB service is NOT running"
    echo "   SOLUTION: sudo systemctl start mysql"
fi

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="




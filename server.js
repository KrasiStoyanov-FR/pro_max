import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// FOR DUMMY DATA - TODO: Remove this when we are done testing
import sqlite3 from 'sqlite3'
const USE_SQLITE = process.env.USE_SQLITE === 'true'
const SQLITE_PATH = path.join(process.cwd(), 'database.sqlite')

// Middleware
app.use(cors())
app.use(express.json())

// MariaDB connection configuration
const DB_CONFIG = {
  // host: '172.16.50.100',
  // port: 3306,
  host: 'detect.pm99.site', // TODO: Turn this into a variable, so when I use the SFTP server, I can apply its own env file with a different value for this variable
  port: 58591, // TODO: Turn this into a variable, so when I use the SFTP server, I can apply its own env file with a different value for this variable
  user: 'drone_app',
  password: 'Qwerty@',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  // Add additional connection options
  connectTimeout: 10000,
  acquireTimeout: 10000,
  reconnect: true,
  charset: 'utf8mb4'
}

// Create connection pool
let connectionPool = null

// FOR DUMMY DATA - TODO: Remove this when we are done testing
let sqliteDb = null

const createSqliteConnection = () => {
  if (!sqliteDb) {
    sqliteDb = new sqlite3.Database(SQLITE_PATH)
    console.log(`[SQLite] Connected to ${SQLITE_PATH}`)
  }

  return {
    execute: (query, params = []) =>
      new Promise((resolve, reject) => {
        const trimmed = query.trim().toLowerCase()
        if (trimmed.startsWith('select')) {
          sqliteDb.all(query, params, (err, rows) => {
            if (err) return reject(err)
            resolve([rows])
          })
        } else {
          sqliteDb.run(query, params, function (err) {
            if (err) return reject(err)
            resolve([[{ changes: this.changes, lastID: this.lastID }]])
          })
        }
      }),
    release: () => {}
  }
}

const sqlitePool = {
  getConnection: async () => createSqliteConnection()
}

const createConnectionPool = async () => {
  if (USE_SQLITE) {
    return sqlitePool
  }

  // REAL API DATA
  if (connectionPool) {
    return connectionPool
  }

  try {
    // First try a simple connection to test
    console.log('[MariaDB] Testing connection...')
    const testConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      connectTimeout: 10000,
      acquireTimeout: 10000
    })
    
    await testConnection.ping()
    await testConnection.end()
    console.log('[MariaDB] Test connection successful')
    
    // Now create the pool
    connectionPool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      queueLimit: 0,
    })
    
    console.log('[MariaDB] Connection pool created successfully')
    return connectionPool
  } catch (error) {
    console.error('[MariaDB] Failed to create connection pool:', error)
    throw error
  }
}

// Routes

// Database health check
app.get('/api/db/health', async (req, res) => {
  try {
    console.log('[API] Testing database connection...')
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()

    let query = 'SELECT 1 as test, VERSION() as version'
    if (USE_SQLITE) {
      query = 'SELECT 1 as test, sqlite_version() as version'
    }

    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json({
      success: true,
      message: USE_SQLITE ? 'SQLite connection successful' : 'MariaDB connection successful',
      data: rows
    })
  } catch (error) {
    console.error('[API] Connection test failed:', error)
    
    // If it's a connection timeout, provide helpful information
    if (error.code === 'ETIMEDOUT') {
      res.status(500).json({
        success: false,
        message: 'Database connection timeout - server may be unreachable',
        error: error.message,
        details: {
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          suggestion: 'Check if the database server is accessible from your network'
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: `MariaDB connection failed: ${error.message}`,
        error: error.message
      })
    }
  }
})

// Get all databases
app.get('/api/db/databases', async (req, res) => {
  try {
    console.log('[API] Fetching databases...')
    
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()
    
    const [rows] = await connection.execute('SHOW DATABASES')
    connection.release()
    
    const databases = rows.map(row => row.Database).filter(db => 
      !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db)
    )
    
    res.json({
      success: true,
      data: databases
    })
  } catch (error) {
    console.error('[API] Failed to fetch databases:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get all tables (from current database)
app.get('/api/db/tables', async (req, res) => {
  try {
    console.log('[API] Fetching tables from current database...')
    
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()
    
    const [rows] = await connection.execute('SHOW TABLES')
    connection.release()
    
    const tables = rows.map(row => {
      const tableName = Object.values(row)[0]
      return {
        name: tableName,
        database: 'current'
      }
    })
    
    res.json({
      success: true,
      data: tables
    })
  } catch (error) {
    console.error('[API] Failed to fetch tables:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get all tables from a specific database
app.get('/api/db/tables/:database', async (req, res) => {
  try {
    const { database } = req.params
    console.log(`[API] Fetching tables from database: ${database}...`)
    
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()
    
    const [rows] = await connection.execute(`SHOW TABLES FROM \`${database}\``)
    connection.release()
    
    const tables = rows.map(row => {
      const tableName = Object.values(row)[0]
      return {
        name: tableName,
        database: database
      }
    })
    
    res.json({
      success: true,
      data: tables
    })
  } catch (error) {
    console.error('[API] Failed to fetch tables:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get data from a specific table
app.get('/api/db/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params
    const { database, limit = 100 } = req.query

    console.log(`[API] Fetching data from table: ${tableName}${database ? ` in database: ${database}` : ''}`)
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()

    let query = ''
    if (USE_SQLITE) {
      query = `SELECT * FROM ${tableName} LIMIT ${limit}`
    } else if (database) {
      query = `SELECT * FROM \`${database}\`.\`${tableName}\` LIMIT ${limit}`
    } else {
      query = `SELECT * FROM \`${tableName}\` LIMIT ${limit}`
    }

    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json({
      success: true,
      data: rows
    })
  } catch (error) {
    console.error(`[API] Failed to fetch data from table ${req.params.tableName}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get table schema
app.get('/api/db/schema/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params
    const { database } = req.query
    
    console.log(`[API] Fetching schema for table: ${tableName}${database ? ` in database: ${database}` : ''}`)
    
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()
    
    let query = `DESCRIBE \`${tableName}\``
    if (database) {
      query = `DESCRIBE \`${database}\`.\`${tableName}\``
    }
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json({
      success: true,
      data: rows
    })
  } catch (error) {
    console.error(`[API] Failed to fetch schema for table ${req.params.tableName}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Execute custom query
app.post('/api/db/query', async (req, res) => {
  try {
    const { query } = req.body
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      })
    }
    
    console.log(`[API] Executing query: ${query}`)
    
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json({
      success: true,
      data: rows
    })
  } catch (error) {
    console.error('[API] Query execution failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get all data from all tables in all databases
app.get('/api/db/all-data', async (req, res) => {
  try {
    console.log('[API] Fetching all database data...')
    
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()
    
    // Get all databases
    const [dbRows] = await connection.execute('SHOW DATABASES')
    const databases = dbRows.map(row => row.Database).filter(db => 
      !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db)
    )
    
    const allData = {}
    
    // For each database, get all tables and their data
    for (const database of databases) {
      const [tableRows] = await connection.execute(`SHOW TABLES FROM \`${database}\``)
      const tables = tableRows.map(row => Object.values(row)[0])
      
      allData[database] = {}
      
      for (const table of tables) {
        try {
          const [dataRows] = await connection.execute(`SELECT * FROM \`${database}\`.\`${table}\` LIMIT 50`)
          allData[database][table] = dataRows
        } catch (error) {
          console.warn(`[API] Failed to get data from table ${table}:`, error.message)
          allData[database][table] = []
        }
      }
    }
    
    connection.release()
    
    res.json({
      success: true,
      data: allData
    })
  } catch (error) {
    console.error('[API] Failed to fetch all data:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})


// ===== Mock drone states for detections endpoint =====
let droneStates = {}
const mockDroneStatesPath = path.join(process.cwd(), 'scripts', 'mock_drone_states.json')

const loadDroneStates = () => {
  try {
    if (fs.existsSync(mockDroneStatesPath)) {
      const raw = fs.readFileSync(mockDroneStatesPath, 'utf-8')
      droneStates = JSON.parse(raw)
      console.log(`[API] Loaded ${Object.keys(droneStates).length} mock drone states`)
    } else {
      console.warn('[API] mock_drone_states.json not found; /api/detections will be empty')
    }
  } catch (error) {
    console.error('[API] Failed to load mock drone states:', error)
  }
}

loadDroneStates()

app.get('/api/detections', (req, res) => {
  const allDetections = {}
  const now = new Date()

  Object.entries(droneStates).forEach(([mac, state]) => {
    if (!state.last_update) return
    const lastUpdate = new Date(state.last_update)
    if (Number.isNaN(lastUpdate.getTime())) return

    // Include detections updated within last 10 minutes
    if ((now - lastUpdate) / 1000 < 600) {
      allDetections[mac] = {
        mac_address: mac,
        serial_number: state.serial_number ?? null,
        uas_id: state.uas_id ?? null,
        has_coordinates: state.has_coordinates ?? false,
        drone_lat: state.drone_lat ?? null,
        drone_lon: state.drone_lon ?? null,
        receiver_type: state.receiver_type ?? 'unknown',
        last_detection: state.last_update,
        altitude: state.altitude ?? null,
        speed: state.speed ?? null
      }
    }
  })

  res.json(allDetections)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Database API server is running',
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[API] Unhandled error:', error)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`[API] Database server running on port ${PORT}`)
  console.log(`[API] Health check: http://${DB_CONFIG.host}:${PORT}/api/health`)
  console.log(`[API] Database health check: http://${DB_CONFIG.host}:${PORT}/api/db/health`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[API] Shutting down server...')
  if (connectionPool) {
    await connectionPool.end()
  }
  process.exit(0)
})

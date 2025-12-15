import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import sqlite3 from 'sqlite3'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '3001', 10)
const USE_SQLITE = process.env.USE_SQLITE === 'true'
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'database.sqlite')

// Middleware
app.use(cors())
app.use(express.json())

// MariaDB connection configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'drone_monitoring',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000', 10),
  timeout: parseInt(process.env.DB_TIMEOUT || '60000', 10),
  // Add additional connection options
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
  reconnect: process.env.DB_RECONNECT !== 'false',
  charset: process.env.DB_CHARSET || 'utf8mb4'
}

// Create connection pools
let connectionPool = null
let connectionPoolPromise = null
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

  if (connectionPool) {
    return connectionPool
  }

  if (connectionPoolPromise) {
    return connectionPoolPromise
  }

  connectionPoolPromise = (async () => {
  try {
    console.log('[MariaDB] Testing connection...')
    const testConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      connectTimeout: 10000
    })
    
    await testConnection.ping()
    await testConnection.end()
    console.log('[MariaDB] Test connection successful')
    
    connectionPool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      queueLimit: 0
    })
    
    // Add error handlers to the connection pool
    connectionPool.on('connection', (connection) => {
      console.log('[MariaDB] New connection established')
      
      // Handle connection errors
      connection.on('error', (err) => {
        console.error('[MariaDB] Connection error:', {
          code: err.code,
          errno: err.errno,
          sqlState: err.sqlState,
          message: err.message
        })
        
        // If connection is fatal, remove it from pool
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
            err.code === 'ECONNRESET' || 
            err.code === 'ETIMEDOUT' ||
            err.fatal) {
          console.warn('[MariaDB] Fatal connection error, connection will be removed from pool')
        }
      })
    })
    
    // Handle pool-level errors
    connectionPool.on('error', (err) => {
      console.error('[MariaDB] Pool error:', {
        code: err.code,
        errno: err.errno,
        message: err.message
      })
      
      // Only reset pool on truly fatal errors, and only if it's not already being reset
      // Don't reset on ECONNRESET as the pool handles this automatically
      if ((err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal) && connectionPool) {
        console.warn('[MariaDB] Fatal pool error detected, will recreate pool on next request if needed')
        // Don't set to null immediately - let individual requests handle it
      }
    })
    
    console.log('[MariaDB] Connection pool created successfully')
    return connectionPool
  } catch (error) {
    console.error('[MariaDB] Failed to create connection pool:', error)
    throw error
    } finally {
      connectionPoolPromise = null
    }
  })()

  return connectionPoolPromise
}

// Helper function to safely get a connection with validation
const getConnection = async (retryCount = 0) => {
  const MAX_RETRIES = 3
  
  const pool = await createConnectionPool()
  
  // If pool was reset due to error, recreate it
  if (!pool && !USE_SQLITE) {
    if (retryCount >= MAX_RETRIES) {
      throw new Error('Failed to create connection pool after multiple retries')
    }
    connectionPool = null
    return await getConnection(retryCount + 1)
  }
  
  const connection = await pool.getConnection()
  
  // Validate connection is still alive (only for MariaDB)
  if (!USE_SQLITE) {
    try {
      await connection.ping()
    } catch (pingError) {
      // Connection is dead, release it and get a new one
      connection.release()
      if (retryCount >= MAX_RETRIES) {
        throw new Error('Failed to get valid connection after multiple retries: ' + pingError.message)
      }
      console.warn('[MariaDB] Connection validation failed, getting new connection:', pingError.message)
      return await getConnection(retryCount + 1)
    }
  }
  
  return { connection, pool }
}

// Helper function to safely execute queries with automatic connection handling
const executeQuery = async (queryFn) => {
  let connection = null
  let pool = null
  
  try {
    const result = await getConnection()
    connection = result.connection
    pool = result.pool
    
    return await queryFn(connection)
  } catch (error) {
    // Handle connection errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ETIMEDOUT' ||
        error.fatal) {
      console.error('[MariaDB] Connection error during query:', {
        code: error.code,
        message: error.message
      })
      
      // Reset pool to force recreation on next request
      if (!USE_SQLITE && connectionPool) {
        try {
          await connectionPool.end()
        } catch (endError) {
          // Ignore errors when ending pool
        }
        connectionPool = null
      }
    }
    throw error
  } finally {
    // Always release connection
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        console.warn('[MariaDB] Error releasing connection:', releaseError.message)
      }
    }
  }
}

// Helpers for SQLite metadata queries
const getSqliteTables = async connection => {
  const [rows] = await connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  return rows.map(row => row.name)
}

// Routes

// Database health check
app.get('/api/db/health', async (req, res) => {
  let connection = null
  try {
    console.log('[API] Testing database connection...')

    const pool = await createConnectionPool()
    connection = await pool.getConnection()

    let query = 'SELECT 1 as test, VERSION() as version'
    if (USE_SQLITE) {
      query = 'SELECT 1 as test, sqlite_version() as version'
    }

    const [rows] = await connection.execute(query)
    
    res.json({
      success: true,
      message: USE_SQLITE ? 'SQLite connection successful' : 'MariaDB connection successful',
      data: rows
    })
  } catch (error) {
    console.error('[API] Connection test failed:', error)
    
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
        message: `Database connection failed: ${error.message}`,
        error: error.message
      })
    }
  } finally {
    // Always release connection
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        console.warn('[API] Error releasing connection:', releaseError.message)
      }
    }
  }
})

// Get all databases
app.get('/api/db/databases', async (req, res) => {
  let connection = null
  try {
    console.log('[API] Fetching databases...')
    
    const pool = await createConnectionPool()
    connection = await pool.getConnection()
    
    let databases = []
    if (USE_SQLITE) {
      databases = ['sqlite']
    } else {
    const [rows] = await connection.execute('SHOW DATABASES')
      databases = rows
        .map(row => row.Database)
        .filter(db => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db))
    }
    
    res.json({
      success: true,
      data: databases
    })
  } catch (error) {
    console.error('[API] Failed to fetch databases:', error)
    
    // Handle connection errors - don't reset pool immediately as it handles recovery automatically
    // Only log the error for monitoring
    if (error.code === 'ECONNRESET' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ETIMEDOUT' ||
        error.fatal) {
      console.warn('[API] Connection error detected:', error.code, '- Pool will handle recovery automatically')
      // Don't reset pool here - let mysql2 pool handle it automatically
      // Resetting here can cause issues with concurrent requests
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    })
  } finally {
    // Always release connection
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        console.warn('[API] Error releasing connection:', releaseError.message)
      }
    }
  }
})

// Delete a record by primary key from any table
// Example: DELETE /api/db/table/gps_unit_position/123?database=drone_app
app.delete('/api/db/table/:tableName/:recordId', async (req, res) => {
  let connection = null
  try {
    const { tableName, recordId } = req.params
    const { database, pkColumn } = req.query

    if (!recordId) {
      return res.status(400).json({
        success: false,
        error: 'Record ID is required in the URL path'
      })
    }

    const pool = await createConnectionPool()
    connection = await pool.getConnection()

    // Get table schema to identify primary key
    let schemaQuery = ''
    if (USE_SQLITE) {
      schemaQuery = `PRAGMA table_info(${tableName})`
    } else if (database) {
      schemaQuery = `DESCRIBE \`${database}\`.\`${tableName}\``
    } else {
      schemaQuery = `DESCRIBE \`${tableName}\``
    }

    const [schemaRows] = await connection.execute(schemaQuery)

    // Determine primary key column
    let primaryKeyColumn = pkColumn
    if (!primaryKeyColumn) {
      const pkRow = schemaRows.find(row => {
        if (USE_SQLITE) {
          return row.pk === 1
        } else {
          return row.Key === 'PRI'
        }
      })
      if (pkRow) {
        primaryKeyColumn = USE_SQLITE ? pkRow.name : pkRow.Field
      } else {
        // Common fallbacks
        const fallbackPk = ['id', 'unit_id', 'device_id', 'sensor_id', 'rowid'].find(col =>
          schemaRows.some(row => {
            if (USE_SQLITE) {
              return row.name === col
            }
            return row.Field === col
          })
        )
        primaryKeyColumn = fallbackPk || 'id'
      }
    }

    // Build DELETE query
    let deleteQuery = ''
    if (USE_SQLITE) {
      deleteQuery = `DELETE FROM ${tableName} WHERE ${primaryKeyColumn} = ?`
    } else if (database) {
      deleteQuery = `DELETE FROM \`${database}\`.\`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`
    } else {
      deleteQuery = `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`
    }

    const [result] = await connection.execute(deleteQuery, [recordId])

    const affected = (result && (result.affectedRows ?? result.changes)) || 0

    res.json({
      success: true,
      data: { deleted: affected }
    })
  } catch (error) {
    console.error('[API] Failed to delete record:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete record'
    })
  } finally {
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        console.warn('[API] Error releasing connection:', releaseError.message)
      }
    }
  }
})

// Get all tables (from current database)
app.get('/api/db/tables', async (req, res) => {
  try {
    console.log('[API] Fetching tables from current database...')
    
    const pool = await createConnectionPool()
    const connection = await pool.getConnection()
    
    let tables = []
    if (USE_SQLITE) {
      tables = (await getSqliteTables(connection)).map(name => ({
        name,
        database: 'sqlite'
      }))
    } else {
    const [rows] = await connection.execute('SHOW TABLES')
      tables = rows.map(row => {
      const tableName = Object.values(row)[0]
      return {
        name: tableName,
        database: 'current'
      }
    })
    }

    connection.release()
    
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
    
    let tables = []
    if (USE_SQLITE) {
      tables = (await getSqliteTables(connection)).map(name => ({
        name,
        database: 'sqlite'
      }))
    } else {
    const [rows] = await connection.execute(`SHOW TABLES FROM \`${database}\``)
      tables = rows.map(row => {
      const tableName = Object.values(row)[0]
      return {
        name: tableName,
          database
      }
    })
    }

    connection.release()
    
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

// Create/Insert data into a specific table
app.post('/api/db/table/:tableName', async (req, res) => {
  let connection = null
  try {
    const { tableName } = req.params
    const { database } = req.query
    const { data } = req.body

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain a "data" object with the record to insert'
      })
    }

    const pool = await createConnectionPool()
    connection = await pool.getConnection()

    // Get table schema to check which columns exist
    let schemaQuery = ''
    if (USE_SQLITE) {
      schemaQuery = `PRAGMA table_info(${tableName})`
    } else if (database) {
      schemaQuery = `DESCRIBE \`${database}\`.\`${tableName}\``
    } else {
      schemaQuery = `DESCRIBE \`${tableName}\``
    }

    const [schemaRows] = await connection.execute(schemaQuery)
    const existingColumns = new Set(
      schemaRows.map(row => {
        if (USE_SQLITE) {
          return row.name
        } else {
          return row.Field
        }
      })
    )

    // Filter data to only include columns that exist in the table
    const validColumns = Object.keys(data).filter(key => {
      // Skip id if it's auto-increment
      if (key === 'id') return false
      // Only include columns that exist in the table
      return existingColumns.has(key) && data[key] !== undefined && data[key] !== null
    })

    if (validColumns.length === 0) {
      connection.release()
      return res.status(400).json({
        success: false,
        error: 'No valid columns to insert. Available columns: ' + Array.from(existingColumns).join(', ')
      })
    }

    const values = validColumns.map(col => data[col])
    const placeholders = validColumns.map(() => '?').join(', ')

    let insertQuery = ''
    if (USE_SQLITE) {
      insertQuery = `INSERT INTO ${tableName} (${validColumns.join(', ')}) VALUES (${placeholders})`
    } else if (database) {
      insertQuery = `INSERT INTO \`${database}\`.\`${tableName}\` (${validColumns.map(col => `\`${col}\``).join(', ')}) VALUES (${placeholders})`
    } else {
      insertQuery = `INSERT INTO \`${tableName}\` (${validColumns.map(col => `\`${col}\``).join(', ')}) VALUES (${placeholders})`
    }

    const [result] = await connection.execute(insertQuery, values)

    // Get the primary key column name from schema
    let primaryKeyColumn = null
    if (USE_SQLITE) {
      primaryKeyColumn = schemaRows.find(row => row.pk === 1)
    } else {
      primaryKeyColumn = schemaRows.find(row => row.Key === 'PRI')
    }

    let pkColumnName = null
    if (primaryKeyColumn) {
      pkColumnName = USE_SQLITE ? primaryKeyColumn.name : primaryKeyColumn.Field
    }

    // If no primary key found, try common column names
    if (!pkColumnName) {
      const commonPkNames = ['id', 'unit_id', 'device_id', 'sensor_id']
      for (const name of commonPkNames) {
        if (existingColumns.has(name)) {
          pkColumnName = name
          break
        }
      }
    }

    // Fallback for SQLite
    if (!pkColumnName && USE_SQLITE) {
      pkColumnName = 'rowid'
    }

    // Fetch the inserted record using the actual primary key column
    const insertId = USE_SQLITE ? result.lastID : result.insertId
    
    if (!pkColumnName) {
      // If we still can't find a primary key, just return the data we inserted
      connection.release()
      return res.json({
        success: true,
        data: data,
        message: 'Record created successfully (could not fetch inserted record - no primary key found)'
      })
    }

    let selectQuery = ''
    if (USE_SQLITE) {
      if (pkColumnName === 'rowid') {
        selectQuery = `SELECT * FROM ${tableName} WHERE rowid = ?`
      } else {
        selectQuery = `SELECT * FROM ${tableName} WHERE ${pkColumnName} = ?`
      }
    } else if (database) {
      selectQuery = `SELECT * FROM \`${database}\`.\`${tableName}\` WHERE \`${pkColumnName}\` = ?`
    } else {
      selectQuery = `SELECT * FROM \`${tableName}\` WHERE \`${pkColumnName}\` = ?`
    }

    const [rows] = await connection.execute(selectQuery, [insertId])

    connection.release()

    res.json({
      success: true,
      data: rows[0] || data,
      message: 'Record created successfully'
    })
  } catch (error) {
    console.error(`[API] Failed to insert into ${req.params.tableName}:`, error)
    
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        console.warn('[API] Error releasing connection:', releaseError.message)
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get data from a specific table
app.get('/api/db/table/:tableName', async (req, res) => {
  let connection = null
  try {
    const { tableName } = req.params
    const { database, limit, offset, count, type, status, timeWindow, zone, search } = req.query

    const pool = await createConnectionPool()
    connection = await pool.getConnection()

    // Build base query
    let baseQuery = `SELECT * FROM \`${tableName}\``
    if (USE_SQLITE) {
      baseQuery = `SELECT * FROM ${tableName}`
    } else if (database) {
      baseQuery = `SELECT * FROM \`${database}\`.\`${tableName}\``
    }

    // Build WHERE clause for filters (only for rf_detections table)
    const whereConditions = []
    const queryParams = []
    
    if (tableName === 'rf_detections') {
      // Type filter
      if (type && type !== 'all') {
        whereConditions.push(`(type = ? OR target_type = ? OR category = ?)`)
        queryParams.push(type, type, type)
      }

      // Status filter
      if (status && status !== 'all') {
        whereConditions.push(`(status = ? OR tracking_status = ? OR alert_status = ?)`)
        queryParams.push(status, status, status)
      }

      // Zone filter
      if (zone && zone !== 'all') {
        if (zone === 'none') {
          whereConditions.push(`(zone IS NULL OR zone = '' OR zone = 'null')`)
        } else {
          whereConditions.push(`zone = ?`)
          queryParams.push(zone)
        }
      }

      // Time window filter (in minutes)
      if (timeWindow) {
        const timeWindowNum = parseInt(timeWindow, 10)
        if (!isNaN(timeWindowNum) && timeWindowNum > 0) {
          // Use MySQL's DATE_SUB function to calculate cutoff time in database timezone
          // This ensures we're comparing timestamps in the same timezone
          // DATE_SUB(NOW(), INTERVAL X MINUTE) gives us the cutoff time
          if (USE_SQLITE) {
            // SQLite: use datetime function
            const cutoffTime = new Date(Date.now() - timeWindowNum * 60 * 1000)
            const cutoffTimeStr = cutoffTime.toISOString().slice(0, 19).replace('T', ' ')
            whereConditions.push(`time >= ?`)
            queryParams.push(cutoffTimeStr)
          } else {
            // MySQL/MariaDB: use DATE_SUB with NOW() to handle timezone correctly
            // Note: 'time' is a reserved word in MySQL, so we need backticks
            whereConditions.push(`\`time\` >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`)
            queryParams.push(timeWindowNum)
          }
        }
      }

      // Search filter (search in type, sensor_name, receiver_name, id)
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`
        whereConditions.push(`(
          type LIKE ? OR
          target_type LIKE ? OR
          sensor_name LIKE ? OR
          receiver_name LIKE ? OR
          sensor_id LIKE ? OR
          CAST(id AS CHAR) LIKE ?
        )`)
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
      }
    }

    const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : ''

    // If count is requested, return total count only
    if (count === 'true') {
      let countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\``
      if (USE_SQLITE) {
        countQuery = `SELECT COUNT(*) as total FROM ${tableName}`
      } else if (database) {
        countQuery = `SELECT COUNT(*) as total FROM \`${database}\`.\`${tableName}\``
      }
      countQuery += whereClause

      console.log(`[API] Executing count query: ${countQuery}`, queryParams.length > 0 ? `with params: ${JSON.stringify(queryParams)}` : '')
      const [countRows] = await connection.execute(countQuery, queryParams.length > 0 ? queryParams : [])
      const totalCount = countRows[0]?.total || 0
      console.log(`[API] Count result for ${tableName}:`, totalCount, typeof totalCount)
      
      // Ensure count is a number (MySQL might return it as a string or BigInt)
      const countValue = typeof totalCount === 'bigint' ? Number(totalCount) : Number(totalCount)
      
      return res.json({
        success: true,
        count: Number.isFinite(countValue) ? countValue : 0
      })
    }

    let query = baseQuery + whereClause

    // Apply ORDER BY for consistent pagination (order by id descending for newest first)
    // Try to order by id, but if the table doesn't have id, we'll catch the error
    // Only add ORDER BY if we have a limit/offset (for pagination) or if it's rf_detections
    if (limit || offset || tableName === 'rf_detections') {
      try {
        const idColumn = USE_SQLITE ? 'id' : 'id'
        query += ` ORDER BY ${idColumn} DESC`
      } catch (orderError) {
        // If ordering fails, we'll try without it
        console.warn(`[API] Could not add ORDER BY for table ${tableName}, continuing without it`)
      }
    }

    // Apply LIMIT and OFFSET for pagination
    // MySQL/MariaDB syntax: LIMIT count OFFSET offset
    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        if (offset) {
          const offsetNum = parseInt(offset, 10)
          if (!isNaN(offsetNum) && offsetNum >= 0) {
            // MySQL/MariaDB: LIMIT count OFFSET offset
            query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`
          } else {
            query += ` LIMIT ${limitNum}`
          }
        } else {
          query += ` LIMIT ${limitNum}`
        }
      }
    } else if (offset) {
      // If only offset is provided without limit, we still need a limit
      // Use a large number as default limit
      const offsetNum = parseInt(offset, 10)
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        query += ` LIMIT 18446744073709551615 OFFSET ${offsetNum}`
      }
    }

    console.log(`[API] Fetching data from table: ${tableName}${database ? ` in database: ${database}` : ''}${offset ? ` (offset: ${offset})` : ''}${limit ? ` (limit: ${limit})` : ' (no limit)'}${queryParams.length > 0 ? ` with ${queryParams.length} filter params` : ''}`)
    console.log(`[API] Query: ${query}`)
    if (queryParams.length > 0) {
      console.log(`[API] Query params:`, queryParams)
    }

    try {
      // Only pass queryParams if we have parameters, otherwise pass empty array
      const [rows] = await connection.execute(query, queryParams.length > 0 ? queryParams : [])
      
      res.json({
        success: true,
        data: rows
      })
    } catch (queryError) {
      console.error(`[API] Query execution failed for table ${tableName}:`, queryError)
      console.error(`[API] Failed query: ${query}`)
      if (queryParams.length > 0) {
        console.error(`[API] Query params were:`, queryParams)
      }
      throw queryError
    }
  } catch (error) {
    console.error(`[API] Failed to fetch data from table ${req.params.tableName}:`, error)
    console.error(`[API] Error details:`, {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      errno: error.errno,
      sqlState: error.sqlState,
      stack: error.stack
    })
    
    // Handle connection errors - don't reset pool immediately as it handles recovery automatically
    // Only log the error for monitoring
    if (error.code === 'ECONNRESET' || 
        error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ETIMEDOUT' ||
        error.fatal) {
      console.warn('[API] Connection error detected:', error.code, '- Pool will handle recovery automatically')
      // Don't reset pool here - let mysql2 pool handle it automatically
      // Resetting here can cause issues with concurrent requests
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      sqlError: error.sqlMessage || error.message,
      code: error.code,
      tableName: req.params.tableName
    })
  } finally {
    // Always release connection
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        console.warn('[API] Error releasing connection:', releaseError.message)
      }
    }
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
    if (USE_SQLITE) {
      query = `PRAGMA table_info(${tableName})`
    } else if (database) {
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
    
    const allData = {}
    
    if (USE_SQLITE) {
      const tables = await getSqliteTables(connection)
      allData.sqlite = {}

      for (const table of tables) {
        const [dataRows] = await connection.execute(`SELECT * FROM ${table} LIMIT 50`)
        allData.sqlite[table] = dataRows
      }
    } else {
      const [dbRows] = await connection.execute('SHOW DATABASES')
      const databases = dbRows
        .map(row => row.Database)
        .filter(db => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db))

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
// Bind to 0.0.0.0 to accept connections from all network interfaces (for remote access)
const HOST = process.env.SERVER_HOST === 'localhost' ? 'localhost' : '0.0.0.0'
app.listen(PORT, HOST, () => {
  const serverHost = process.env.SERVER_HOST || 'localhost'
  console.log(`[API] Database server running on port ${PORT}`)
  console.log(`[API] Listening on ${HOST === '0.0.0.0' ? 'all interfaces' : HOST}`)
  console.log(`[API] Health check: http://${serverHost}:${PORT}/api/health`)
  console.log(`[API] Database health check: http://${serverHost}:${PORT}/api/db/health`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[API] Shutting down server...')
  if (connectionPool) {
    await connectionPool.end()
  }
  if (sqliteDb) {
    sqliteDb.close()
  }
  process.exit(0)
})

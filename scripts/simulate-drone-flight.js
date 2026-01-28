// Simulate a single drone flying around a chosen sensor and
// writing real rows into the database (drone_positions + rf_detections)
// so the live view can exercise real-time updates and trajectories.
//
// Usage:
//   npm run sim:drone-flight
//
// Optional env overrides:
//   PERF_SENSOR_SYSTEM_ID   - system_id of sensor to fly around (default: 'DDS93')
//   PERF_DRONE_ID           - numeric drone_id to use (default: 9999)
//   PERF_FLIGHT_POINTS      - number of waypoints (default: 10)
//   PERF_FLIGHT_RADIUS_KM   - radius in km around sensor (default: 0.8)

import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import axios from 'axios'

dotenv.config()

// Use API endpoint instead of direct DB connection for remote databases
// This works through the API server (same as frontend) and avoids connection issues
const API_BASE_URL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3001/api/db'
// Remove /api/db suffix if present, we'll add it back for specific endpoints
const API_URL = API_BASE_URL.endsWith('/api/db') ? API_BASE_URL.replace(/\/api\/db$/, '') : API_BASE_URL.replace(/\/api\/db/, '')

// Check if we should use API (for remote databases) or direct connection (for local)
const FRONTEND_API_URL = process.env.VITE_API_BASE_URL || ''
const DB_HOST = process.env.DB_HOST || 'localhost'
const IS_REMOTE_DB = 
  DB_HOST !== 'localhost' && 
  DB_HOST !== '127.0.0.1' && 
  (DB_HOST.includes('dds.pm99.site') || 
   DB_HOST.includes('172.16.50.50') || 
   FRONTEND_API_URL.includes('dds.pm99.site') ||
   FRONTEND_API_URL.includes('172.16.50.50'))

// Use API for remote databases, direct connection for local
const USE_API = IS_REMOTE_DB
const USE_SQLITE = !IS_REMOTE_DB && process.env.USE_SQLITE === 'true'
const SQLITE_PATH = path.join(process.cwd(), 'database.sqlite')

const DB_CONFIG = {
  host: DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'drone_monitoring',
}

if (USE_API) {
  console.log(`[Sim] Using API endpoint: ${API_URL}/api/db (for remote database access)`)
} else if (process.env.NODE_ENV !== 'production') {
  console.log(`[Sim] Database detection: DB_HOST=${DB_HOST}, IS_REMOTE_DB=${IS_REMOTE_DB}, USE_SQLITE=${USE_SQLITE}`)
}

const SENSOR_SYSTEM_ID = process.env.PERF_SENSOR_SYSTEM_ID || 'DDS93'
const DRONE_ID = parseInt(process.env.PERF_DRONE_ID || '9999', 10)
const FLIGHT_POINTS = parseInt(process.env.PERF_FLIGHT_POINTS || '10', 10)
const FLIGHT_RADIUS_KM = parseFloat(process.env.PERF_FLIGHT_RADIUS_KM || '0.8')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const createSqliteConnection = () => {
  const db = new sqlite3.Database(SQLITE_PATH)
  console.log(`[Sim] Connected to SQLite at ${SQLITE_PATH}`)

  return {
    execute: (query, params = []) =>
      new Promise((resolve, reject) => {
        const trimmed = query.trim().toLowerCase()
        if (trimmed.startsWith('select')) {
          db.all(query, params, (err, rows) => {
            if (err) return reject(err)
            resolve([rows])
          })
        } else {
          // Handle INSERT, UPDATE, DELETE
          db.run(query, params, function (err) {
            if (err) return reject(err)
            resolve([[{ changes: this.changes, lastID: this.lastID, affectedRows: this.changes }]])
          })
        }
      }),
    close: () =>
      new Promise((resolve) => {
        db.close(() => resolve())
      }),
  }
}

// API-based connection wrapper (for remote databases)
// This uses the API server endpoints instead of direct database access
const createApiConnection = () => {
  console.log(`[Sim] Using API endpoint: ${API_URL}/api/db`)
  
  return {
    execute: async (query, params = []) => {
      const trimmed = query.trim().toLowerCase()
      
      // Handle SELECT queries
      if (trimmed.startsWith('select')) {
        // Extract table name from query (handles both `database`.`table` and just `table`)
        const tableMatch = query.match(/FROM\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i)
        if (!tableMatch) {
          throw new Error(`[Sim] Could not parse table name from query: ${query}`)
        }
        const tableName = tableMatch[1]
        
        // Build API URL - don't use limit to avoid ORDER BY issues with tables that don't have 'id'
        // We'll filter in memory anyway, so fetching all is fine for small tables
        let url = `${API_URL}/api/db/table/${tableName}?database=${DB_CONFIG.database}`
        
        // For large tables, we can add a reasonable limit, but only if we know the table has 'id'
        // For now, fetch without limit and filter in memory
        const knownTablesWithId = ['drones', 'drone_positions', 'rf_detections']
        if (knownTablesWithId.includes(tableName)) {
          url += '&limit=10000'
        }
        
        try {
          const response = await axios.get(url, { timeout: 15000 })
          if (response.data.success && response.data.data) {
            let data = Array.isArray(response.data.data) ? response.data.data : [response.data.data]
            
            // Apply WHERE clause filtering in memory
            if (params.length > 0) {
              const whereMatch = query.match(/WHERE\s+[`"]?(\w+)[`"]?\s*=\s*\?/i)
              if (whereMatch) {
                const columnName = whereMatch[1]
                const filterValue = params[0]
                
                // Debug for gps_unit_position to see what we're working with
                if (tableName === 'gps_unit_position') {
                  console.log(`[Sim] API returned ${data.length} rows from gps_unit_position`)
                  if (data.length > 0) {
                    console.log(`[Sim] Sample row keys:`, Object.keys(data[0]))
                    const sampleRow = data[0]
                    console.log(`[Sim] Sample row values:`, {
                      system_id: sampleRow.system_id,
                      unit_id: sampleRow.unit_id,
                      id: sampleRow.id,
                      [columnName]: sampleRow[columnName]
                    })
                    // Show first few system_id values to help debug
                    const systemIds = data.slice(0, 10).map(r => r.system_id || r.unit_id || r.id || 'N/A')
                    console.log(`[Sim] First 10 system_id/unit_id values:`, systemIds)
                  }
                  console.log(`[Sim] Filtering ${data.length} rows by ${columnName} = "${filterValue}"`)
                }
                
                data = data.filter(row => {
                  // Try the exact column name first
                  let value = row[columnName]
                  
                  // If not found and it's system_id, try common alternatives
                  if (value === undefined || value === null) {
                    if (columnName === 'system_id') {
                      value = row.unit_id || row.system_id || row.id
                    }
                  }
                  
                  // Compare as both string and original type
                  const matches = value === filterValue || String(value) === String(filterValue)
                  
                  return matches
                })
                
                if (tableName === 'gps_unit_position') {
                  console.log(`[Sim] After filtering: ${data.length} rows found`)
                  if (data.length === 0) {
                    // Get original data before filtering to show what's available
                    const originalData = Array.isArray(response.data.data) ? response.data.data : [response.data.data]
                    console.warn(`[Sim] ⚠️  No rows matched! Looking for "${filterValue}" in column "${columnName}"`)
                    // Show what values actually exist in the original data
                    const allSystemIds = originalData.slice(0, 20).map(r => r.system_id || r.unit_id || r.id).filter(Boolean)
                    if (allSystemIds.length > 0) {
                      console.warn(`[Sim] Available ${columnName} values in DB (first 20):`, allSystemIds)
                    } else {
                      console.warn(`[Sim] No data returned from API for gps_unit_position table`)
                    }
                  }
                }
              }
            }
            
            // Apply LIMIT if specified
            if (query.includes('LIMIT')) {
              const limitMatch = query.match(/LIMIT\s+(\d+)/i)
              if (limitMatch) {
                data = data.slice(0, parseInt(limitMatch[1]))
              }
            }
            
            return [data]
          }
          return [[]]
        } catch (error) {
          // If error is about ORDER BY, try again without limit
          const errorMsg = error.response?.data?.error || error.message || ''
          if (errorMsg.includes('ORDER BY') || errorMsg.includes('Unknown column')) {
            console.warn(`[Sim] Retrying query without limit due to ORDER BY issue...`)
            try {
              const retryUrl = `${API_URL}/api/db/table/${tableName}?database=${DB_CONFIG.database}`
              const retryResponse = await axios.get(retryUrl, { timeout: 15000 })
              if (retryResponse.data.success && retryResponse.data.data) {
                let data = Array.isArray(retryResponse.data.data) ? retryResponse.data.data : [retryResponse.data.data]
                
            // Apply WHERE clause filtering in memory
            if (params.length > 0) {
              const whereMatch = query.match(/WHERE\s+[`"]?(\w+)[`"]?\s*=\s*\?/i)
              if (whereMatch) {
                const columnName = whereMatch[1]
                const filterValue = params[0]
                
                // Debug for gps_unit_position to see what we're working with
                if (tableName === 'gps_unit_position') {
                  console.log(`[Sim] Filtering ${data.length} rows by ${columnName} = "${filterValue}"`)
                  if (data.length > 0) {
                    const sampleRow = data[0]
                    console.log(`[Sim] Sample row has keys:`, Object.keys(sampleRow))
                    console.log(`[Sim] Sample row values:`, {
                      system_id: sampleRow.system_id,
                      unit_id: sampleRow.unit_id,
                      id: sampleRow.id,
                      [columnName]: sampleRow[columnName]
                    })
                    // Show first few system_id values to help debug
                    const systemIds = data.slice(0, 10).map(r => r.system_id || r.unit_id || 'N/A')
                    console.log(`[Sim] First 10 system_id/unit_id values:`, systemIds)
                  }
                }
                
                data = data.filter(row => {
                  // Try the exact column name first
                  let value = row[columnName]
                  
                  // If not found and it's system_id, try common alternatives
                  if (value === undefined || value === null) {
                    if (columnName === 'system_id') {
                      value = row.unit_id || row.system_id || row.id
                    }
                  }
                  
                  // Compare as both string and original type
                  const matches = value === filterValue || String(value) === String(filterValue)
                  
                  return matches
                })
                
                if (tableName === 'gps_unit_position') {
                  console.log(`[Sim] After filtering: ${data.length} rows found`)
                  if (data.length === 0 && params[0]) {
                    console.warn(`[Sim] ⚠️  No rows matched! Looking for "${params[0]}" in column "${columnName}"`)
                    console.warn(`[Sim] Available system_id values (first 20):`, 
                      data.slice(0, 20).map(r => r.system_id || r.unit_id || r.id).filter(Boolean)
                    )
                  }
                }
              }
            }
                
                // Apply LIMIT if specified
                if (query.includes('LIMIT')) {
                  const limitMatch = query.match(/LIMIT\s+(\d+)/i)
                  if (limitMatch) {
                    data = data.slice(0, parseInt(limitMatch[1]))
                  }
                }
                
                return [data]
              }
            } catch (retryError) {
              throw new Error(`[Sim] API query failed (retry also failed): ${retryError.response?.data?.error || retryError.message}`)
            }
          }
          throw new Error(`[Sim] API query failed: ${errorMsg}`)
        }
      }
      
      // Handle INSERT queries
      if (trimmed.startsWith('insert')) {
        // Extract table name
        const tableMatch = query.match(/INTO\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i)
        if (!tableMatch) {
          throw new Error(`[Sim] Could not parse table name from INSERT query: ${query}`)
        }
        const tableName = tableMatch[1]
        
        // Extract column names from INSERT statement
        const columnsMatch = query.match(/\(([^)]+)\)/g)
        if (!columnsMatch || columnsMatch.length < 1) {
          throw new Error(`[Sim] Could not parse INSERT columns: ${query}`)
        }
        
        const columns = columnsMatch[0]
          .replace(/[()`"]/g, '')
          .split(',')
          .map(c => c.trim())
        
        // Build data object from params
        const data = {}
        columns.forEach((col, idx) => {
          if (params[idx] !== undefined && params[idx] !== null) {
            data[col] = params[idx]
          }
        })
        
        // Special handling for drones table with explicit ID
        // The API endpoint filters out 'id' assuming it's auto-increment (server.js line 760)
        // But we need to set it explicitly, so we'll use the query endpoint
        if (tableName === 'drones' && data.id !== undefined && data.id !== null) {
          // Use raw SQL query endpoint to insert with explicit ID
          // Escape single quotes in string values to prevent SQL injection
          const escapeSql = (val) => {
            if (val === null || val === undefined) return 'NULL'
            if (typeof val === 'number') return val
            return `'${String(val).replace(/'/g, "''")}'`
          }
          
          const insertSql = `INSERT INTO \`${DB_CONFIG.database}\`.\`drones\` (id, system_id, mac_address, serial_number, uas_id, first_seen, last_seen, is_active) VALUES (${data.id}, ${escapeSql(data.system_id)}, ${escapeSql(data.mac_address)}, ${escapeSql(data.serial_number)}, ${escapeSql(data.uas_id)}, ${escapeSql(data.first_seen)}, ${escapeSql(data.last_seen)}, ${data.is_active || 1})`
          
          try {
            const queryUrl = `${API_URL}/api/db/query?database=${DB_CONFIG.database}`
            const queryResponse = await axios.post(
              queryUrl,
              { query: insertSql },
              { timeout: 10000 }
            )
            
            if (queryResponse.data.success) {
              console.log(`[Sim] Drone inserted via query endpoint with id=${data.id}`)
              return [[{ insertId: data.id, changes: 1 }]]
            } else {
              // If query endpoint fails, fall through to regular insert
              console.warn(`[Sim] Query endpoint returned success=false:`, queryResponse.data.error || 'Unknown error')
              console.warn('[Sim] Trying regular insert endpoint...')
            }
          } catch (queryError) {
            // If query endpoint doesn't work, fall through to regular insert
            const errorMsg = queryError.response?.data?.error || queryError.message
            console.warn('[Sim] Query endpoint failed, using regular insert:', errorMsg)
          }
        }
        
        try {
          const response = await axios.post(
            `${API_URL}/api/db/table/${tableName}?database=${DB_CONFIG.database}`,
            { data },
            { timeout: 10000 }
          )
          if (response.data.success) {
            // For drones table, check if the returned data has the correct ID
            if (tableName === 'drones' && data.id) {
              const returnedId = response.data.data?.id || 
                                 (response.data.data && typeof response.data.data === 'object' && response.data.data.id) ||
                                 null
              if (returnedId && returnedId !== data.id) {
                console.warn(`[Sim] API inserted drone with different ID: expected ${data.id}, got ${returnedId}`)
              }
            }
            const insertedId = response.data.data?.id || 
                               (response.data.data && typeof response.data.data === 'object' && response.data.data.id) ||
                               (data.id) || // Fallback to the ID we sent
                               null
            return [[{ insertId: insertedId, changes: 1 }]]
          }
          throw new Error(`[Sim] API insert failed: ${response.data.error || 'Unknown error'}`)
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message
          // Log the full error for debugging
          if (error.response?.data) {
            console.error('[Sim] API insert error details:', JSON.stringify(error.response.data, null, 2))
          }
          throw new Error(`[Sim] API insert failed: ${errorMsg}`)
        }
      }
      
      // Handle DELETE queries
      if (trimmed.startsWith('delete')) {
        // Extract table name
        const tableMatch = query.match(/FROM\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i)
        if (!tableMatch) {
          throw new Error(`[Sim] Could not parse table name from DELETE query: ${query}`)
        }
        const tableName = tableMatch[1]
        
        // For DELETE with WHERE clause, we need to:
        // 1. Fetch all matching records
        // 2. Delete them one by one using the DELETE endpoint
        
        if (query.includes('WHERE')) {
          // Extract WHERE clause
          const whereMatch = query.match(/WHERE\s+[`"]?(\w+)[`"]?\s*=\s*\?/i)
          if (whereMatch) {
            const columnName = whereMatch[1]
            const filterValue = params[0]
            
            // First, fetch all records matching the WHERE clause
            const selectUrl = `${API_URL}/api/db/table/${tableName}?database=${DB_CONFIG.database}`
            const selectResponse = await axios.get(selectUrl, { timeout: 15000 })
            
            if (selectResponse.data.success && selectResponse.data.data) {
              const recordsToDelete = Array.isArray(selectResponse.data.data) 
                ? selectResponse.data.data 
                : [selectResponse.data.data]
              
              // Filter by WHERE clause
              const matchingRecords = recordsToDelete.filter(row => {
                const value = row[columnName]
                return value === filterValue || String(value) === String(filterValue)
              })
              
              console.log(`[Sim] Found ${matchingRecords.length} records to delete from ${tableName} where ${columnName} = ${filterValue}`)
              
              // Delete each record
              let deletedCount = 0
              for (const record of matchingRecords) {
                // Try to find the primary key (id is most common)
                const recordId = record.id || record[Object.keys(record)[0]]
                if (recordId !== undefined && recordId !== null) {
                  try {
                    const deleteUrl = `${API_URL}/api/db/table/${tableName}/${recordId}?database=${DB_CONFIG.database}`
                    const deleteResponse = await axios.delete(deleteUrl, { timeout: 10000 })
                    if (deleteResponse.data.success) {
                      deletedCount++
                    }
                  } catch (deleteError) {
                    console.warn(`[Sim] Failed to delete record ${recordId}:`, deleteError.response?.data?.error || deleteError.message)
                  }
                }
              }
              
              return [[{ changes: deletedCount, affectedRows: deletedCount }]]
            }
          }
        }
        
        throw new Error(`[Sim] DELETE queries must include WHERE clause with single condition`)
      }
      
      // Handle UPDATE queries
      if (trimmed.startsWith('update')) {
        // Extract table name
        const tableMatch = query.match(/UPDATE\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i)
        if (!tableMatch) {
          throw new Error(`[Sim] Could not parse table name from UPDATE query: ${query}`)
        }
        const tableName = tableMatch[1]
        
        // Extract SET clause and WHERE clause
        const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i)
        const whereMatch = query.match(/WHERE\s+[`"]?(\w+)[`"]?\s*=\s*\?/i)
        
        if (!setMatch || !whereMatch) {
          throw new Error(`[Sim] UPDATE query must have SET and WHERE clauses: ${query}`)
        }
        
        // Parse SET clause - simple parsing for "col1 = ?, col2 = ?" format
        const setClause = setMatch[1]
        const setPairs = setClause.split(',').map(pair => {
          const [col, val] = pair.split('=').map(s => s.trim())
          return { column: col.replace(/[`"]/g, ''), valueIndex: val === '?' ? null : val }
        })
        
        // Build data object for UPDATE
        const updateData = {}
        let paramIndex = 0
        setPairs.forEach(pair => {
          if (pair.valueIndex === null) {
            // It's a ? placeholder
            updateData[pair.column] = params[paramIndex]
            paramIndex++
          } else {
            updateData[pair.column] = pair.valueIndex
          }
        })
        
        // Get the WHERE value (last param)
        const whereColumn = whereMatch[1]
        const whereValue = params[params.length - 1]
        
        // For UPDATE, we need to use PUT endpoint with record ID
        // First, find the record by WHERE clause
        const selectUrl = `${API_URL}/api/db/table/${tableName}?database=${DB_CONFIG.database}`
        const selectResponse = await axios.get(selectUrl, { timeout: 15000 })
        
        if (selectResponse.data.success && selectResponse.data.data) {
          const records = Array.isArray(selectResponse.data.data) 
            ? selectResponse.data.data 
            : [selectResponse.data.data]
          
          // Find matching record - try multiple column names
          let matchingRecord = records.find(row => {
            const value = row[whereColumn]
            return value === whereValue || String(value) === String(whereValue)
          })
          
          // If not found by exact column name, try common alternatives
          if (!matchingRecord && whereColumn === 'id') {
            matchingRecord = records.find(row => {
              return row.id === whereValue || 
                     String(row.id) === String(whereValue) ||
                     row[Object.keys(row)[0]] === whereValue
            })
          }
          
          if (!matchingRecord) {
            // Debug: show what we're looking for and what we found
            console.warn(`[Sim] UPDATE: Looking for ${whereColumn} = ${whereValue}`)
            console.warn(`[Sim] UPDATE: Found ${records.length} records, sample IDs:`, 
              records.slice(0, 5).map(r => r.id || r[Object.keys(r)[0]]))
            throw new Error(`[Sim] No record found for UPDATE WHERE ${whereColumn} = ${whereValue}`)
          }
          
          // Get record ID - try 'id' first, then first column
          const recordId = matchingRecord.id || 
                          (matchingRecord[whereColumn] && whereColumn === 'id' ? matchingRecord[whereColumn] : null) ||
                          matchingRecord[Object.keys(matchingRecord)[0]]
          if (!recordId) {
            console.warn(`[Sim] UPDATE: Record found but no ID. Record keys:`, Object.keys(matchingRecord))
            throw new Error(`[Sim] Could not find primary key for UPDATE`)
          }
          
          // Perform UPDATE using PUT endpoint
          const updateUrl = `${API_URL}/api/db/table/${tableName}/${recordId}?database=${DB_CONFIG.database}`
          const updateResponse = await axios.put(updateUrl, { data: updateData }, { timeout: 10000 })
          
          if (updateResponse.data.success) {
            return [[{ changes: 1, affectedRows: 1 }]]
          }
          throw new Error(`[Sim] API update failed: ${updateResponse.data.error || 'Unknown error'}`)
        }
        
        throw new Error(`[Sim] Could not fetch records for UPDATE`)
      }
      
      throw new Error(`[Sim] Unsupported query type: ${trimmed.substring(0, 10)}`)
    },
    close: () => Promise.resolve()
  }
}

const getConnection = async () => {
  if (USE_API) {
    return createApiConnection()
  }
  
  if (USE_SQLITE) {
    return createSqliteConnection()
  }

  console.log('[Sim] Attempting MariaDB connection:', {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    database: DB_CONFIG.database,
    user: DB_CONFIG.user,
  })

  try {
    const connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      connectTimeout: 10000, // 10 second timeout
    })
    console.log('[Sim] Connected to MariaDB successfully')
    
    return {
      execute: async (query, params = []) => {
        const [result] = await connection.execute(query, params)
        // Normalize result format for consistency
        return [[{ 
          changes: result.affectedRows || 0, 
          affectedRows: result.affectedRows || 0,
          insertId: result.insertId || null
        }]]
      },
      close: () => connection.end(),
    }
  } catch (error) {
    console.error('[Sim] Failed to connect to MariaDB:', {
      code: error.code,
      message: error.message,
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
    })
    console.error('\n[Sim] Troubleshooting:')
    console.error('  1. Check if MariaDB server is running')
    console.error('  2. Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env')
    console.error('  3. Try using SQLite instead: set USE_SQLITE=true in .env')
    throw error
  }
}

const toDbTimestamp = (date) => {
  // Format as 'YYYY-MM-DD HH:MM:SS'
  const pad = (n) => String(n).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const second = pad(date.getSeconds())
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

const kmToLatLngDelta = (latDeg, radiusKm) => {
  // Approximation: 1 degree latitude ~= 111 km
  const dLat = radiusKm / 111
  // 1 degree longitude ~= 111 km * cos(latitude)
  const dLng = radiusKm / (111 * Math.cos((latDeg * Math.PI) / 180))
  return { dLat, dLng }
}

const main = async () => {
  console.log('=== Live-view perf simulator: drone flight ===')
  console.log('[Sim] Target sensor system_id:', SENSOR_SYSTEM_ID)
  console.log('[Sim] Using drone_id:', DRONE_ID)
  console.log('[Sim] Flight points:', FLIGHT_POINTS, 'radius km:', FLIGHT_RADIUS_KM)
  
  if (USE_API) {
    console.log(`[Sim] Using API endpoint: ${API_URL}/api/db`)
    console.log(`[Sim] Database: ${DB_CONFIG.database} (via API server)`)
  } else {
    console.log(`[Sim] Database: ${USE_SQLITE ? 'SQLite' : 'MariaDB'} (${USE_SQLITE ? SQLITE_PATH : `${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`})`)
  }

  const conn = await getConnection()

  try {
    // 0. Clean up any existing test drone data first
    console.log(`[Sim] Cleaning up any existing test drone data (drone_id=${DRONE_ID})...`)
    
    const macAddress = `00:11:22:33:${(DRONE_ID % 100).toString().padStart(2, '0')}`
    
    // First, find all drones with this MAC address (fetch all and filter in memory for API compatibility)
    let findDronesQuery = 'SELECT * FROM drones'
    if (!USE_SQLITE && DB_CONFIG.database) {
      findDronesQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\``
    }
    
    let dronesToDelete = []
    try {
      const [allDroneRows] = await conn.execute(findDronesQuery, [])
      if (allDroneRows && allDroneRows.length > 0) {
        // Filter in memory for MAC address or ID match
        const matchingDrones = allDroneRows.filter(row => {
          const rowId = row.id
          const rowMac = row.mac_address
          return (rowId === DRONE_ID || String(rowId) === String(DRONE_ID)) ||
                 (rowMac === macAddress || String(rowMac) === String(macAddress))
        })
        dronesToDelete = matchingDrones.map(row => row.id).filter(Boolean)
        if (dronesToDelete.length > 0) {
          console.log(`[Sim] Found ${dronesToDelete.length} existing drone(s) to clean up:`, dronesToDelete)
        }
      }
    } catch (error) {
      console.warn(`[Sim] Error finding drones to delete:`, error.message)
    }
    
    // Delete all positions and detections for all found drone IDs
    let totalPositionsDeleted = 0
    let totalDetectionsDeleted = 0
    let totalDronesDeleted = 0
    
    for (const droneId of dronesToDelete) {
      // Delete drone_positions (works for both API and direct DB)
      if (USE_API) {
        // For API, fetch all positions first, then delete one by one
        let findQuery = `SELECT * FROM drone_positions WHERE drone_id = ?`
        if (DB_CONFIG.database) {
          findQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drone_positions\` WHERE drone_id = ?`
        }
        try {
          const [positions] = await conn.execute(findQuery, [droneId])
          for (const pos of positions || []) {
            if (pos.id) {
              try {
                const deleteUrl = `${API_URL}/api/db/table/drone_positions/${pos.id}?database=${DB_CONFIG.database}`
                await axios.delete(deleteUrl, { timeout: 10000 })
                totalPositionsDeleted++
              } catch (err) {
                if (err.response?.status !== 404) {
                  console.warn(`[Sim] Failed to delete position ${pos.id}:`, err.message)
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[Sim] Error fetching positions for drone_id=${droneId}:`, error.message)
        }
      } else {
        let deleteQuery = 'DELETE FROM drone_positions WHERE drone_id = ?'
        if (!USE_SQLITE && DB_CONFIG.database) {
          deleteQuery = `DELETE FROM \`${DB_CONFIG.database}\`.\`drone_positions\` WHERE drone_id = ?`
        }
        try {
          const [result] = await conn.execute(deleteQuery, [droneId])
          const deleted = result?.changes || result?.affectedRows || 0
          totalPositionsDeleted += deleted
        } catch (error) {
          console.warn(`[Sim] Error deleting drone_positions for drone_id=${droneId}:`, error.message)
        }
      }
      
      // Delete rf_detections (works for both API and direct DB)
      if (USE_API) {
        let findQuery = `SELECT * FROM rf_detections WHERE drone_id = ?`
        if (DB_CONFIG.database) {
          findQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`rf_detections\` WHERE drone_id = ?`
        }
        try {
          const [detections] = await conn.execute(findQuery, [droneId])
          for (const det of detections || []) {
            if (det.id) {
              try {
                const deleteUrl = `${API_URL}/api/db/table/rf_detections/${det.id}?database=${DB_CONFIG.database}`
                await axios.delete(deleteUrl, { timeout: 10000 })
                totalDetectionsDeleted++
              } catch (err) {
                if (err.response?.status !== 404) {
                  console.warn(`[Sim] Failed to delete detection ${det.id}:`, err.message)
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[Sim] Error fetching detections for drone_id=${droneId}:`, error.message)
        }
      } else {
        let deleteQuery = 'DELETE FROM rf_detections WHERE drone_id = ?'
        if (!USE_SQLITE && DB_CONFIG.database) {
          deleteQuery = `DELETE FROM \`${DB_CONFIG.database}\`.\`rf_detections\` WHERE drone_id = ?`
        }
        try {
          const [result] = await conn.execute(deleteQuery, [droneId])
          const deleted = result?.changes || result?.affectedRows || 0
          totalDetectionsDeleted += deleted
        } catch (error) {
          console.warn(`[Sim] Error deleting rf_detections for drone_id=${droneId}:`, error.message)
        }
      }
      
      // Delete the drone metadata row
      if (USE_API) {
        try {
          const deleteUrl = `${API_URL}/api/db/table/drones/${droneId}?database=${DB_CONFIG.database}`
          await axios.delete(deleteUrl, { timeout: 10000 })
          totalDronesDeleted++
        } catch (err) {
          if (err.response?.status !== 404) {
            console.warn(`[Sim] Failed to delete drone ${droneId}:`, err.message)
          }
        }
      } else {
        let deleteQuery = 'DELETE FROM drones WHERE id = ?'
        if (!USE_SQLITE && DB_CONFIG.database) {
          deleteQuery = `DELETE FROM \`${DB_CONFIG.database}\`.\`drones\` WHERE id = ?`
        }
        try {
          const [result] = await conn.execute(deleteQuery, [droneId])
          const deleted = result?.changes || result?.affectedRows || 0
          totalDronesDeleted += deleted
        } catch (error) {
          console.warn(`[Sim] Error deleting drone metadata for id=${droneId}:`, error.message)
        }
      }
    }
    
    if (totalPositionsDeleted > 0 || totalDetectionsDeleted > 0 || totalDronesDeleted > 0) {
      console.log(`[Sim] Cleanup summary: ${totalPositionsDeleted} positions, ${totalDetectionsDeleted} detections, ${totalDronesDeleted} drones deleted`)
    } else {
      console.log('[Sim] No existing test data found.')
    }
    console.log('[Sim] Starting fresh simulation...\n')

    // 1. Find sensor coordinates
    let sensorQuery = 'SELECT * FROM gps_unit_position WHERE system_id = ? LIMIT 1'
    if (!USE_SQLITE && DB_CONFIG.database) {
      sensorQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`gps_unit_position\` WHERE system_id = ? LIMIT 1`
    }

    const [sensorRows] = await conn.execute(sensorQuery, [SENSOR_SYSTEM_ID])
    if (!sensorRows || sensorRows.length === 0) {
      console.error(
        `[Sim] No gps_unit_position row found for system_id="${SENSOR_SYSTEM_ID}". ` +
          'Create a detector first, then re-run.',
      )
      process.exitCode = 1
      await conn.close()
      return
    }

    const sensor = sensorRows[0]
    const sensorLat =
      Number(sensor.gps_lat ?? sensor.latitude ?? sensor.lat ?? sensor.latitude_deg ?? sensor.y)
    const sensorLng =
      Number(sensor.gps_lon ?? sensor.longitude ?? sensor.lng ?? sensor.longitude_deg ?? sensor.x)

    if (!Number.isFinite(sensorLat) || !Number.isFinite(sensorLng)) {
      console.error('[Sim] Sensor has invalid coordinates:', { sensorLat, sensorLng, sensor })
      process.exitCode = 1
      await conn.close()
      return
    }

    console.log('[Sim] Sensor coordinates:', { lat: sensorLat, lng: sensorLng })

    // 2. Create the drone metadata row (cleanup already removed any old ones)
    const now = new Date()
    const ts = toDbTimestamp(now)
    // macAddress already declared in cleanup section above
    const serialNumber = `SIM-${DRONE_ID}`
    const uasId = `🚀 TEST-DRONE-${DRONE_ID}`
    
    console.log('[Sim] Creating drone metadata row...')
    let insertQuery =
      'INSERT INTO drones (id, system_id, mac_address, serial_number, uas_id, first_seen, last_seen, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    if (!USE_SQLITE && DB_CONFIG.database) {
      insertQuery = `INSERT INTO \`${DB_CONFIG.database}\`.\`drones\` (id, system_id, mac_address, serial_number, uas_id, first_seen, last_seen, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    }
    
    try {
      await conn.execute(insertQuery, [
        DRONE_ID,
        SENSOR_SYSTEM_ID,
        macAddress,
        serialNumber,
        uasId,
        ts,
        ts,
        1,
      ])
      console.log(`[Sim] ✓ Drone metadata row created with id=${DRONE_ID}`)
      
      // Wait a bit and verify it actually exists before proceeding
      // For API connections, we need to retry verification as there may be caching/replication lag
      let verified = false
      const maxRetries = USE_API ? 10 : 1
      const retryDelay = USE_API ? 800 : 300
      
      for (let retry = 0; retry < maxRetries; retry++) {
        await sleep(retryDelay)
        
        let verifyQuery = 'SELECT * FROM drones WHERE id = ? LIMIT 1'
        if (!USE_SQLITE && DB_CONFIG.database) {
          verifyQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\` WHERE id = ? LIMIT 1`
        }
        
        try {
          const [verifyRows] = await conn.execute(verifyQuery, [DRONE_ID])
          if (verifyRows && verifyRows.length > 0) {
            console.log(`[Sim] ✓ Verified drone exists with id=${DRONE_ID} (attempt ${retry + 1}/${maxRetries})`)
            verified = true
            break
          }
        } catch (verifyError) {
          if (retry < maxRetries - 1) {
            console.log(`[Sim] Verification attempt ${retry + 1} failed, retrying...`)
            continue
          }
        }
      }
      
      if (!verified) {
        // Try finding by MAC address as fallback
        let macVerifyQuery = 'SELECT * FROM drones'
        if (!USE_SQLITE && DB_CONFIG.database) {
          macVerifyQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\``
        }
        
        try {
          const [allDrones] = await conn.execute(macVerifyQuery, [])
          const foundByMac = (allDrones || []).find(row => {
            const rowMac = row.mac_address
            return rowMac === macAddress || String(rowMac) === String(macAddress)
          })
          
          if (foundByMac) {
            console.warn(`[Sim] ⚠️  Drone was created but with different ID (${foundByMac.id} instead of ${DRONE_ID})`)
            console.warn(`[Sim] This will cause foreign key errors. The INSERT may have failed silently.`)
            throw new Error(`Drone was not created with the expected ID. Found ID: ${foundByMac.id}, Expected: ${DRONE_ID}`)
          } else {
            // For API connections, if we can't verify but INSERT succeeded, proceed anyway
            // The foreign key constraint will catch real issues when inserting positions
            if (USE_API) {
              console.warn(`[Sim] ⚠️  Could not verify drone creation via API (may be caching), but proceeding anyway.`)
              console.warn(`[Sim] If foreign key errors occur, the drone was not actually created.`)
            } else {
              throw new Error(`Drone metadata row was not created successfully. INSERT appeared to succeed but drone not found in database.`)
            }
          }
        } catch (fallbackError) {
          if (USE_API && !fallbackError.message.includes('Expected')) {
            // For API, if verification fails but INSERT succeeded, proceed anyway
            console.warn(`[Sim] ⚠️  Verification failed but INSERT appeared successful. Proceeding (FK constraints will catch real issues).`)
          } else {
            throw fallbackError
          }
        }
      }
    } catch (insertError) {
      const errorMsg = insertError.message || insertError.toString() || ''
      if (errorMsg.includes('Duplicate entry') || errorMsg.includes('duplicate') || errorMsg.includes('UNIQUE constraint')) {
        // Still a duplicate after cleanup? Try to find and delete by MAC address, then retry
        console.log('[Sim] Duplicate detected after cleanup, finding and deleting by MAC address...')
        
        // Find all drones with this MAC address
        let findMacQuery = 'SELECT * FROM drones'
        if (!USE_SQLITE && DB_CONFIG.database) {
          findMacQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\``
        }
        
        try {
          const [allDrones] = await conn.execute(findMacQuery, [])
          const matchingDrones = (allDrones || []).filter(row => {
            const rowMac = row.mac_address
            return rowMac === macAddress || String(rowMac) === String(macAddress)
          })
          
          // Delete each matching drone by ID
          for (const drone of matchingDrones) {
            const droneId = drone.id
            if (droneId) {
              let deleteQuery = 'DELETE FROM drones WHERE id = ?'
              if (!USE_SQLITE && DB_CONFIG.database) {
                deleteQuery = `DELETE FROM \`${DB_CONFIG.database}\`.\`drones\` WHERE id = ?`
              }
              try {
                await conn.execute(deleteQuery, [droneId])
                console.log(`[Sim] Deleted drone with id=${droneId} (MAC: ${macAddress})`)
              } catch (delError) {
                console.warn(`[Sim] Error deleting drone id=${droneId}:`, delError.message)
              }
            }
          }
          
          // Small delay to ensure deletion is processed
          await sleep(200)
          
          // Retry insert
          await conn.execute(insertQuery, [
            DRONE_ID,
            SENSOR_SYSTEM_ID,
            macAddress,
            serialNumber,
            uasId,
            ts,
            ts,
            1,
          ])
          console.log(`[Sim] ✓ Drone metadata row created with id=${DRONE_ID} (after forced cleanup)`)
          
          // Verify the retry insert
          await sleep(USE_API ? 800 : 300)
          let retryVerifyQuery = 'SELECT * FROM drones WHERE id = ? LIMIT 1'
          if (!USE_SQLITE && DB_CONFIG.database) {
            retryVerifyQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\` WHERE id = ? LIMIT 1`
          }
          
          let retryVerified = false
          for (let retry = 0; retry < (USE_API ? 10 : 1); retry++) {
            if (retry > 0) {
              await sleep(USE_API ? 800 : 300)
            }
            try {
              const [retryVerifyRows] = await conn.execute(retryVerifyQuery, [DRONE_ID])
              if (retryVerifyRows && retryVerifyRows.length > 0) {
                console.log(`[Sim] ✓ Verified retry insert with id=${DRONE_ID} (attempt ${retry + 1})`)
                retryVerified = true
                break
              }
            } catch (e) {
              if (retry < (USE_API ? 9 : 0)) {
                console.log(`[Sim] Retry verification attempt ${retry + 1} failed, retrying...`)
              }
              // Continue to next retry
            }
          }
          
          if (!retryVerified && !USE_API) {
            throw new Error(`Drone metadata row was not created/updated successfully. Cannot proceed with position insertions.`)
          } else if (!retryVerified) {
            console.warn(`[Sim] ⚠️  Could not verify retry insert via API after ${USE_API ? 10 : 1} attempts (may be caching), but proceeding anyway`)
            console.warn(`[Sim] If foreign key errors occur during position insertions, the drone was not actually created.`)
          }
        } catch (retryError) {
          throw new Error(`Failed to create drone metadata after cleanup: ${retryError.message}`)
        }
      } else {
        throw insertError
      }
    }
    
    // Verify the drone exists (simple check, proceed if it fails - FK constraint will catch real issues)
    console.log('[Sim] Verifying drone was created...')
    try {
      let checkQuery = 'SELECT * FROM drones WHERE id = ? LIMIT 1'
      if (!USE_SQLITE && DB_CONFIG.database) {
        checkQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\` WHERE id = ? LIMIT 1`
      }
      const [verifyRows] = await conn.execute(checkQuery, [DRONE_ID])
      if (verifyRows && verifyRows.length > 0) {
        console.log('[Sim] ✓ Drone metadata verified')
      } else {
        console.warn('[Sim] ⚠️  Verification query returned no results (may be API caching)')
      }
    } catch (verifyError) {
      console.warn('[Sim] ⚠️  Verification query failed (proceeding anyway):', verifyError.message)
    }

    // 3. Generate circular trajectory around sensor
    const { dLat, dLng } = kmToLatLngDelta(sensorLat, FLIGHT_RADIUS_KM)
    const points = []
    for (let i = 0; i < FLIGHT_POINTS; i++) {
      const angle = (2 * Math.PI * i) / FLIGHT_POINTS
      const lat = sensorLat + dLat * Math.cos(angle)
      const lng = sensorLng + dLng * Math.sin(angle)
      points.push({ lat, lng })
    }

    console.log('[Sim] Generated trajectory points:', points.length)

    // 4. Insert positions + detections over time with delays for real-time visualization
    console.log('[Sim] Writing positions + RF detections to DB (with delays for real-time updates)...')
    const startTime = Date.now()
    // Interval between points: 2 seconds to allow real-time visualization
    const POINT_INTERVAL_MS = 2000

    for (let i = 0; i < points.length; i++) {
      const now = new Date(startTime + i * POINT_INTERVAL_MS)
      const ts = toDbTimestamp(now)
      const { lat, lng } = points[i]

      console.log(`[Sim] Inserting waypoint ${i + 1}/${points.length} at (${lat.toFixed(6)}, ${lng.toFixed(6)})...`)

      // drone_positions
      {
        let insertPos =
          'INSERT INTO drone_positions (system_id, drone_id, time, latitude, longitude, altitude, speed, receiver_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        if (!USE_SQLITE && DB_CONFIG.database) {
          insertPos = `INSERT INTO \`${DB_CONFIG.database}\`.\`drone_positions\` (system_id, drone_id, time, latitude, longitude, altitude, speed, receiver_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        }

        const altitude = 120 + Math.sin((2 * Math.PI * i) / points.length) * 20 // 100–140m
        const speed = 40 + Math.cos((2 * Math.PI * i) / points.length) * 10 // ~30–50 km/h

        await conn.execute(insertPos, [
          SENSOR_SYSTEM_ID,
          DRONE_ID,
          ts,
          lat,
          lng,
          altitude,
          speed,
          'SIM',
        ])
        console.log(`[Sim]   ✓ Position ${i + 1} inserted`)
      }

      // rf_detections
      {
        let insertDet =
          'INSERT INTO rf_detections (time, detection_status, signal_strength, frequency, drone_id, system_id) VALUES (?, ?, ?, ?, ?, ?)'
        if (!USE_SQLITE && DB_CONFIG.database) {
          insertDet = `INSERT INTO \`${DB_CONFIG.database}\`.\`rf_detections\` (time, detection_status, signal_strength, frequency, drone_id, system_id) VALUES (?, ?, ?, ?, ?, ?)`
        }

        const signalStrength = -45 + Math.random() * 10 // -45 to -35 dBm
        const freq = 2400 + Math.random() * 50 // around 2.4 GHz

        await conn.execute(insertDet, [
          ts,
          1,
          signalStrength,
          freq,
          DRONE_ID,
          SENSOR_SYSTEM_ID,
        ])
        console.log(`[Sim]   ✓ Detection ${i + 1} inserted`)
      }

      // Wait before inserting next point (except for the last one)
      if (i < points.length - 1) {
        console.log(`[Sim]   Waiting ${POINT_INTERVAL_MS}ms before next waypoint...`)
        await sleep(POINT_INTERVAL_MS)
      }
    }

    console.log('\n[Sim] Flight simulation complete.')
    console.log('\n[Sim] ==========================================')
    console.log('[Sim] TEST DRONE CREATED:')
    console.log(`[Sim]   - Drone ID: ${DRONE_ID}`)
    console.log(`[Sim]   - Name: 🚀 TEST-DRONE-${DRONE_ID}`)
    console.log(`[Sim]   - System ID: ${SENSOR_SYSTEM_ID}`)
    console.log(`[Sim]   - Waypoints inserted: ${FLIGHT_POINTS}`)
    console.log(`[Sim]   - Sensor location: lat=${sensorLat.toFixed(5)}, lng=${sensorLng.toFixed(5)}`)
    console.log('[Sim] ==========================================')
    console.log('\n[Sim] Next steps:')
    console.log('  1. Open the live view map in your browser')
    console.log(`  2. Look for a drone marker named "🚀 TEST-DRONE-${DRONE_ID}"`)
    console.log('  3. The trajectory should appear as a circular path around sensor', SENSOR_SYSTEM_ID)
    console.log('  4. If you don\'t see it immediately, wait 1-2 seconds for SSE updates')
    console.log(`  5. You can also search/filter for "TEST" or "${DRONE_ID}" to find it quickly`)
  } catch (error) {
    console.error('\n[Sim] Error during simulation:', error)
    process.exitCode = 1
  } finally {
    await conn.close()
  }
}

// Only run if invoked directly (not imported)
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename)) {
  main().catch((err) => {
    console.error('[Sim] Unhandled error:', err)
    process.exit(1)
  })
}


// Cleanup script to remove all test drone data from the database
// This can be run independently before/after simulation tests
//
// Usage:
//   npm run cleanup:test-drone
//
// Optional env overrides:
//   PERF_DRONE_ID - numeric drone_id to clean up (default: 9999)
//   PERF_CLEANUP_ALL_TEST_DRONES - if set to 'true', cleans up ALL drones with test MAC addresses (00:11:22:33:*)

import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

dotenv.config()

// Use API endpoint instead of direct DB connection for remote databases
const API_BASE_URL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3001/api/db'
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

const DRONE_ID = parseInt(process.env.PERF_DRONE_ID || '9999', 10)
const CLEANUP_ALL_TEST_DRONES = process.env.PERF_CLEANUP_ALL_TEST_DRONES === 'true'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// API-based connection wrapper (reused from simulate script)
const createApiConnection = () => {
  console.log(`[Cleanup] Using API endpoint: ${API_URL}/api/db`)
  
  return {
    execute: async (query, params = []) => {
      const trimmed = query.trim().toLowerCase()
      
      // Handle SELECT queries
      if (trimmed.startsWith('select')) {
        const tableMatch = query.match(/FROM\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i)
        if (!tableMatch) {
          throw new Error(`[Cleanup] Could not parse table name from query: ${query}`)
        }
        const tableName = tableMatch[1]
        
        let url = `${API_URL}/api/db/table/${tableName}?database=${DB_CONFIG.database}`
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
                data = data.filter(row => {
                  const rowValue = row[columnName]
                  return rowValue === filterValue || String(rowValue) === String(filterValue)
                })
              }
            }
            
            return [data]
          }
          return [[]]
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message
          throw new Error(`[Cleanup] API query failed: ${errorMsg}`)
        }
      }
      
      // Handle DELETE queries
      if (trimmed.startsWith('delete')) {
        const tableMatch = query.match(/FROM\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i)
        if (!tableMatch) {
          throw new Error(`[Cleanup] Could not parse table name from DELETE query: ${query}`)
        }
        const tableName = tableMatch[1]
        
        // Extract WHERE clause to find record ID
        const whereMatch = query.match(/WHERE\s+[`"]?(\w+)[`"]?\s*=\s*\?/i)
        if (!whereMatch || params.length === 0) {
          throw new Error(`[Cleanup] DELETE query must have WHERE clause with single parameter: ${query}`)
        }
        
        const columnName = whereMatch[1]
        const recordId = params[0]
        
        try {
          const deleteUrl = `${API_URL}/api/db/table/${tableName}/${recordId}?database=${DB_CONFIG.database}`
          const response = await axios.delete(deleteUrl, { timeout: 10000 })
          
          if (response.data.success) {
            const deleted = response.data.data?.deleted || 1
            return [[{ changes: deleted, affectedRows: deleted }]]
          }
          throw new Error(`[Cleanup] API delete failed: ${response.data.error || 'Unknown error'}`)
        } catch (error) {
          // If DELETE by ID fails, try to find and delete by query
          if (error.response?.status === 404) {
            // Record not found - that's okay, return success with 0 changes
            return [[{ changes: 0, affectedRows: 0 }]]
          }
          const errorMsg = error.response?.data?.error || error.message
          throw new Error(`[Cleanup] API delete failed: ${errorMsg}`)
        }
      }
      
      throw new Error(`[Cleanup] Unsupported query type: ${trimmed.substring(0, 10)}`)
    },
    close: () => Promise.resolve(),
  }
}

const createSqliteConnection = () => {
  const db = new sqlite3.Database(SQLITE_PATH)
  console.log(`[Cleanup] Connected to SQLite at ${SQLITE_PATH}`)

  return {
    execute: (query, params = []) =>
      new Promise((resolve, reject) => {
        const trimmed = query.trim().toLowerCase()
        if (trimmed.startsWith('select')) {
          db.all(query, params, (err, rows) => {
            if (err) return reject(err)
            resolve([rows])
          })
        } else if (trimmed.startsWith('delete')) {
          db.run(query, params, function (err) {
            if (err) return reject(err)
            resolve([[{ changes: this.changes, affectedRows: this.changes }]])
          })
        } else {
          reject(new Error(`[Cleanup] Unsupported query type: ${trimmed.substring(0, 10)}`))
        }
      }),
    close: () =>
      new Promise((resolve) => {
        db.close(() => resolve())
      }),
  }
}

const getConnection = async () => {
  if (USE_API) {
    return createApiConnection()
  }
  
  if (USE_SQLITE) {
    return createSqliteConnection()
  }

  try {
    const connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      connectTimeout: 10000,
    })
    console.log('[Cleanup] Connected to MariaDB successfully')
    
    return {
      execute: async (query, params = []) => {
        const [result] = await connection.execute(query, params)
        return [[{ 
          changes: result.affectedRows || 0, 
          affectedRows: result.affectedRows || 0,
        }]]
      },
      close: () => connection.end(),
    }
  } catch (error) {
    console.error('[Cleanup] Failed to connect to MariaDB:', {
      code: error.code,
      message: error.message,
    })
    throw error
  }
}

const main = async () => {
  console.log('=== Test Drone Cleanup Script ===')
  console.log('[Cleanup] Target drone_id:', DRONE_ID)
  console.log('[Cleanup] Cleanup all test drones:', CLEANUP_ALL_TEST_DRONES)
  
  if (USE_API) {
    console.log(`[Cleanup] Using API endpoint: ${API_URL}/api/db`)
    console.log(`[Cleanup] Database: ${DB_CONFIG.database} (via API server)`)
  } else {
    console.log(`[Cleanup] Database: ${USE_SQLITE ? 'SQLite' : 'MariaDB'} (${USE_SQLITE ? SQLITE_PATH : `${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`})`)
  }

  const conn = await getConnection()

  try {
    // Step 1: Find all drones to delete
    console.log('\n[Cleanup] Step 1: Finding test drones to delete...')
    
    let findDronesQuery = 'SELECT * FROM drones'
    if (!USE_SQLITE && DB_CONFIG.database) {
      findDronesQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\``
    }
    
    const [allDroneRows] = await conn.execute(findDronesQuery, [])
    let dronesToDelete = []
    
    if (CLEANUP_ALL_TEST_DRONES) {
      // Find all drones with test MAC addresses (00:11:22:33:*)
      dronesToDelete = (allDroneRows || []).filter(row => {
        const mac = String(row.mac_address || '')
        return mac.startsWith('00:11:22:33:')
      }).map(row => row.id).filter(Boolean)
      
      if (dronesToDelete.length > 0) {
        console.log(`[Cleanup] Found ${dronesToDelete.length} test drone(s) with test MAC addresses:`, dronesToDelete)
      }
    } else {
      // Find specific drone by ID or MAC address
      const macAddress = `00:11:22:33:${(DRONE_ID % 100).toString().padStart(2, '0')}`
      const matchingDrones = (allDroneRows || []).filter(row => {
        const rowId = row.id
        const rowMac = row.mac_address
        return (rowId === DRONE_ID || String(rowId) === String(DRONE_ID)) ||
               (rowMac === macAddress || String(rowMac) === String(macAddress))
      })
      dronesToDelete = matchingDrones.map(row => row.id).filter(Boolean)
      
      if (dronesToDelete.length > 0) {
        console.log(`[Cleanup] Found ${dronesToDelete.length} drone(s) matching drone_id=${DRONE_ID}:`, dronesToDelete)
      }
    }
    
    if (dronesToDelete.length === 0) {
      console.log('[Cleanup] ✓ No test drones found. Database is clean.')
      await conn.close()
      return
    }
    
    // Step 2: Delete all positions for these drones
    console.log('\n[Cleanup] Step 2: Deleting drone positions...')
    let totalPositionsDeleted = 0
    for (const droneId of dronesToDelete) {
      let deleteQuery = 'DELETE FROM drone_positions WHERE drone_id = ?'
      if (!USE_SQLITE && DB_CONFIG.database) {
        deleteQuery = `DELETE FROM \`${DB_CONFIG.database}\`.\`drone_positions\` WHERE drone_id = ?`
      }
      
      try {
        // For API, we need to find all positions first, then delete one by one
        if (USE_API) {
          // Fetch all positions for this drone
          let findQuery = `SELECT * FROM drone_positions WHERE drone_id = ?`
          if (DB_CONFIG.database) {
            findQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drone_positions\` WHERE drone_id = ?`
          }
          const [positions] = await conn.execute(findQuery, [droneId])
          
          // Delete each position
          for (const pos of positions || []) {
            if (pos.id) {
              try {
                const deleteUrl = `${API_URL}/api/db/table/drone_positions/${pos.id}?database=${DB_CONFIG.database}`
                await axios.delete(deleteUrl, { timeout: 10000 })
                totalPositionsDeleted++
              } catch (err) {
                // Ignore 404s (already deleted)
                if (err.response?.status !== 404) {
                  console.warn(`[Cleanup] Failed to delete position ${pos.id}:`, err.message)
                }
              }
            }
          }
        } else {
          const [result] = await conn.execute(deleteQuery, [droneId])
          const deleted = result?.changes || result?.affectedRows || 0
          totalPositionsDeleted += deleted
        }
      } catch (error) {
        console.warn(`[Cleanup] Error deleting positions for drone_id=${droneId}:`, error.message)
      }
    }
    console.log(`[Cleanup] ✓ Deleted ${totalPositionsDeleted} drone position(s)`)
    
    // Step 3: Delete all RF detections for these drones
    console.log('\n[Cleanup] Step 3: Deleting RF detections...')
    let totalDetectionsDeleted = 0
    for (const droneId of dronesToDelete) {
      let deleteQuery = 'DELETE FROM rf_detections WHERE drone_id = ?'
      if (!USE_SQLITE && DB_CONFIG.database) {
        deleteQuery = `DELETE FROM \`${DB_CONFIG.database}\`.\`rf_detections\` WHERE drone_id = ?`
      }
      
      try {
        if (USE_API) {
          // Fetch all detections for this drone
          let findQuery = `SELECT * FROM rf_detections WHERE drone_id = ?`
          if (DB_CONFIG.database) {
            findQuery = `SELECT * FROM \`${DB_CONFIG.database}\`.\`rf_detections\` WHERE drone_id = ?`
          }
          const [detections] = await conn.execute(findQuery, [droneId])
          
          // Delete each detection
          for (const det of detections || []) {
            if (det.id) {
              try {
                const deleteUrl = `${API_URL}/api/db/table/rf_detections/${det.id}?database=${DB_CONFIG.database}`
                await axios.delete(deleteUrl, { timeout: 10000 })
                totalDetectionsDeleted++
              } catch (err) {
                if (err.response?.status !== 404) {
                  console.warn(`[Cleanup] Failed to delete detection ${det.id}:`, err.message)
                }
              }
            }
          }
        } else {
          const [result] = await conn.execute(deleteQuery, [droneId])
          const deleted = result?.changes || result?.affectedRows || 0
          totalDetectionsDeleted += deleted
        }
      } catch (error) {
        console.warn(`[Cleanup] Error deleting detections for drone_id=${droneId}:`, error.message)
      }
    }
    console.log(`[Cleanup] ✓ Deleted ${totalDetectionsDeleted} RF detection(s)`)
    
    // Step 4: Delete the drone metadata records
    console.log('\n[Cleanup] Step 4: Deleting drone metadata...')
    let totalDronesDeleted = 0
    for (const droneId of dronesToDelete) {
      let deleteQuery = 'DELETE FROM drones WHERE id = ?'
      if (!USE_SQLITE && DB_CONFIG.database) {
        deleteQuery = `DELETE FROM \`${DB_CONFIG.database}\`.\`drones\` WHERE id = ?`
      }
      
      try {
        if (USE_API) {
          const deleteUrl = `${API_URL}/api/db/table/drones/${droneId}?database=${DB_CONFIG.database}`
          try {
            await axios.delete(deleteUrl, { timeout: 10000 })
            totalDronesDeleted++
          } catch (err) {
            if (err.response?.status !== 404) {
              console.warn(`[Cleanup] Failed to delete drone ${droneId}:`, err.message)
            }
          }
        } else {
          const [result] = await conn.execute(deleteQuery, [droneId])
          const deleted = result?.changes || result?.affectedRows || 0
          totalDronesDeleted += deleted
        }
      } catch (error) {
        console.warn(`[Cleanup] Error deleting drone ${droneId}:`, error.message)
      }
    }
    console.log(`[Cleanup] ✓ Deleted ${totalDronesDeleted} drone metadata record(s)`)
    
    // Final verification
    console.log('\n[Cleanup] Step 5: Verifying cleanup...')
    await sleep(500) // Give DB a moment to process
    
    const [verifyRows] = await conn.execute(findDronesQuery, [])
    const remaining = (verifyRows || []).filter(row => {
      if (CLEANUP_ALL_TEST_DRONES) {
        const mac = String(row.mac_address || '')
        return mac.startsWith('00:11:22:33:')
      } else {
        const rowId = row.id
        return rowId === DRONE_ID || String(rowId) === String(DRONE_ID)
      }
    })
    
    if (remaining.length === 0) {
      console.log('[Cleanup] ✓ Cleanup complete! All test drone data has been removed.')
    } else {
      console.warn(`[Cleanup] ⚠️  Warning: ${remaining.length} drone record(s) still remain. They may have been recreated.`)
      console.warn('[Cleanup] Remaining IDs:', remaining.map(r => r.id))
    }
    
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error)
    throw error
  } finally {
    await conn.close()
  }
}

// Run cleanup
main().catch((error) => {
  console.error('[Cleanup] Fatal error:', error)
  process.exit(1)
})

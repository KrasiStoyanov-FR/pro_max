// Quick script to verify test drone data exists in the database
// Usage: node scripts/verify-test-drone.js

import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import sqlite3 from 'sqlite3'
import path from 'path'

dotenv.config()

const USE_SQLITE = process.env.USE_SQLITE === 'true'
const SQLITE_PATH = path.join(process.cwd(), 'database.sqlite')

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'drone_monitoring',
}

const getConnection = async () => {
  if (USE_SQLITE) {
    const db = new sqlite3.Database(SQLITE_PATH)
    return {
      execute: (query, params = []) =>
        new Promise((resolve, reject) => {
          db.all(query, params, (err, rows) => {
            if (err) return reject(err)
            resolve([rows])
          })
        }),
      close: () => db.close(),
    }
  }

  const connection = await mysql.createConnection(DB_CONFIG)
  return {
    execute: (query, params = []) => connection.execute(query, params),
    close: () => connection.end(),
  }
}

const main = async () => {
  const TEST_DRONE_ID = parseInt(process.env.PERF_DRONE_ID || '9999', 10)
  console.log(`=== Verifying test drone data (drone_id=${TEST_DRONE_ID}) ===`)
  const conn = await getConnection()

  try {
    // Check drone metadata
    let query = `SELECT * FROM drones WHERE id = ${TEST_DRONE_ID} LIMIT 1`
    if (!USE_SQLITE && DB_CONFIG.database) {
      query = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drones\` WHERE id = ${TEST_DRONE_ID} LIMIT 1`
    }
    const [droneRows] = await conn.execute(query)
    console.log(`\n[Verify] Drone metadata (id=${TEST_DRONE_ID}):`, droneRows.length > 0 ? droneRows[0] : 'NOT FOUND')

    // Check drone positions
    query = `SELECT COUNT(*) as count, MIN(time) as first_time, MAX(time) as last_time FROM drone_positions WHERE drone_id = ${TEST_DRONE_ID}`
    if (!USE_SQLITE && DB_CONFIG.database) {
      query = `SELECT COUNT(*) as count, MIN(time) as first_time, MAX(time) as last_time FROM \`${DB_CONFIG.database}\`.\`drone_positions\` WHERE drone_id = ${TEST_DRONE_ID}`
    }
    const [posRows] = await conn.execute(query)
    console.log(`\n[Verify] Drone positions (drone_id=${TEST_DRONE_ID}):`, posRows[0])

    // Check RF detections
    query = `SELECT COUNT(*) as count, MIN(time) as first_time, MAX(time) as last_time FROM rf_detections WHERE drone_id = ${TEST_DRONE_ID}`
    if (!USE_SQLITE && DB_CONFIG.database) {
      query = `SELECT COUNT(*) as count, MIN(time) as first_time, MAX(time) as last_time FROM \`${DB_CONFIG.database}\`.\`rf_detections\` WHERE drone_id = ${TEST_DRONE_ID}`
    }
    const [detRows] = await conn.execute(query)
    console.log(`\n[Verify] RF detections (drone_id=${TEST_DRONE_ID}):`, detRows[0])

    // Get latest position
    query = `SELECT * FROM drone_positions WHERE drone_id = ${TEST_DRONE_ID} ORDER BY time DESC LIMIT 1`
    if (!USE_SQLITE && DB_CONFIG.database) {
      query = `SELECT * FROM \`${DB_CONFIG.database}\`.\`drone_positions\` WHERE drone_id = ${TEST_DRONE_ID} ORDER BY time DESC LIMIT 1`
    }
    const [latestPos] = await conn.execute(query)
    if (latestPos.length > 0) {
      const pos = latestPos[0]
      const now = Date.now()
      const posTime = new Date(pos.time).getTime()
      const ageMs = now - posTime
      const ageMinutes = Math.round(ageMs / (60 * 1000))
      console.log('\n[Verify] Latest position:', {
        lat: pos.latitude,
        lng: pos.longitude,
        time: pos.time,
        ageMinutes: ageMinutes,
        ageMs: ageMs
      })
      console.log(`[Verify] Position age: ${ageMinutes} minutes (${Math.round(ageMs / 1000)} seconds)`)
    }

  } catch (error) {
    console.error('[Verify] Error:', error)
  } finally {
    await conn.close()
  }
}

main().catch(console.error)

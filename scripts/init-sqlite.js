#!/usr/bin/env node

/**
 * SQLite Database Initialization Script
 * 
 * This script initializes a SQLite database with the required schema.
 * It can be run manually or automatically on first startup.
 * 
 * Usage:
 *   node scripts/init-sqlite.js [--seed] [--path=./database.sqlite]
 * 
 * Options:
 *   --seed    : Also seed the database with dummy data
 *   --path    : Custom path to database file (default: ./database.sqlite)
 */

import sqlite3 from 'sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Parse command line arguments
const args = process.argv.slice(2)
const shouldSeed = args.includes('--seed')
const pathArg = args.find(arg => arg.startsWith('--path='))
const dbPath = pathArg 
  ? pathArg.split('=')[1] 
  : path.join(process.cwd(), 'database.sqlite')

// Get absolute path
const absoluteDbPath = path.isAbsolute(dbPath) 
  ? dbPath 
  : path.join(process.cwd(), dbPath)

// Read schema file
const schemaPath = path.join(__dirname, 'create_schema.sql')
const seedPath = path.join(__dirname, 'seed_dummy_data.sql')

console.log('[SQLite Init] Starting database initialization...')
console.log(`[SQLite Init] Database path: ${absoluteDbPath}`)

// Check if database already exists
const dbExists = fs.existsSync(absoluteDbPath)

if (dbExists) {
  console.log('[SQLite Init] Database file already exists.')
  console.log('[SQLite Init] To recreate, delete the file first:')
  console.log(`[SQLite Init]   rm "${absoluteDbPath}"`)
  console.log('[SQLite Init] Exiting without changes.')
  process.exit(0)
}

// Create database directory if needed
const dbDir = path.dirname(absoluteDbPath)
if (!fs.existsSync(dbDir)) {
  console.log(`[SQLite Init] Creating directory: ${dbDir}`)
  fs.mkdirSync(dbDir, { recursive: true })
}

// Create database connection
const db = new sqlite3.Database(absoluteDbPath, (err) => {
  if (err) {
    console.error('[SQLite Init] Error creating database:', err.message)
    process.exit(1)
  }
  console.log('[SQLite Init] Database file created successfully')
})

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON', (err) => {
  if (err) {
    console.error('[SQLite Init] Error enabling foreign keys:', err.message)
    db.close()
    process.exit(1)
  }
})

// Read and execute schema
console.log('[SQLite Init] Reading schema file...')
fs.readFile(schemaPath, 'utf8', (err, schema) => {
  if (err) {
    console.error('[SQLite Init] Error reading schema file:', err.message)
    db.close()
    process.exit(1)
  }

  console.log('[SQLite Init] Executing schema...')
  
  // Execute schema (SQLite can handle multiple statements)
  db.exec(schema, (err) => {
    if (err) {
      console.error('[SQLite Init] Error executing schema:', err.message)
      db.close()
      process.exit(1)
    }

    console.log('[SQLite Init] Schema created successfully')
    
    // Get list of tables
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
      if (err) {
        console.error('[SQLite Init] Error listing tables:', err.message)
        db.close()
        process.exit(1)
      }

      console.log(`[SQLite Init] Created ${tables.length} tables:`)
      tables.forEach(table => {
        console.log(`[SQLite Init]   - ${table.name}`)
      })

      // Seed data if requested
      if (shouldSeed) {
        console.log('[SQLite Init] Seeding database with dummy data...')
        fs.readFile(seedPath, 'utf8', (err, seedData) => {
          if (err) {
            console.error('[SQLite Init] Error reading seed file:', err.message)
            db.close()
            process.exit(1)
          }

          db.exec(seedData, (err) => {
            if (err) {
              console.error('[SQLite Init] Error seeding data:', err.message)
              db.close()
              process.exit(1)
            }

            console.log('[SQLite Init] Database seeded successfully')
            console.log('[SQLite Init] Initialization complete!')
            db.close()
          })
        })
      } else {
        console.log('[SQLite Init] Initialization complete!')
        console.log('[SQLite Init] To seed with dummy data, run:')
        console.log(`[SQLite Init]   node scripts/init-sqlite.js --seed --path="${dbPath}"`)
        db.close()
      }
    })
  })
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n[SQLite Init] Interrupted by user')
  db.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[SQLite Init] Terminated')
  db.close()
  process.exit(0)
})

import sqlite3 from 'sqlite3'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

/**
 * Database Management
 * Simple SQLite database for storing session data and analytics
 */

let db = null

/**
 * Initialize the database
 */
export async function initializeDatabase() {
  try {
    const dbPath = process.env.DATABASE_URL || './data/roundtable.db'
    
    // Ensure data directory exists
    await mkdir(dirname(dbPath), { recursive: true })
    
    // Create database connection
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err.message)
        throw err
      }
      console.log('📊 Connected to SQLite database')
    })

    // Create tables
    await createTables()
    
    return db
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

/**
 * Create database tables
 */
async function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          topic_title TEXT,
          topic_category TEXT,
          participant_count INTEGER,
          started_at DATETIME,
          ended_at DATETIME,
          duration_seconds INTEGER,
          rounds_completed INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating sessions table:', err)
          reject(err)
          return
        }
      })

      // Participants table
      db.run(`
        CREATE TABLE IF NOT EXISTS participants (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          user_id TEXT,
          anonymous_name TEXT,
          campus TEXT,
          location TEXT,
          joined_at DATETIME,
          left_at DATETIME,
          speaking_time_seconds INTEGER DEFAULT 0,
          FOREIGN KEY (session_id) REFERENCES sessions (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating participants table:', err)
          reject(err)
          return
        }
      })

      // Topics table (for analytics)
      db.run(`
        CREATE TABLE IF NOT EXISTS topics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          source TEXT DEFAULT 'fallback',
          used_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating topics table:', err)
          reject(err)
          return
        }
        resolve()
      })
    })
  })
}

/**
 * Get database instance
 */
export function getDatabase() {
  return db
}

/**
 * Save a discussion session
 */
export async function saveSession(sessionData) {
  return new Promise((resolve, reject) => {
    const {
      id,
      roomId,
      topic,
      participantCount,
      startedAt,
      endedAt,
      durationSeconds,
      roundsCompleted
    } = sessionData

    const query = `
      INSERT INTO sessions (
        id, room_id, topic_title, topic_category, participant_count,
        started_at, ended_at, duration_seconds, rounds_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    db.run(query, [
      id,
      roomId,
      topic?.title,
      topic?.category,
      participantCount,
      startedAt,
      endedAt,
      durationSeconds,
      roundsCompleted
    ], function(err) {
      if (err) {
        console.error('Error saving session:', err)
        reject(err)
        return
      }
      resolve(this.lastID)
    })
  })
}

/**
 * Save participant data
 */
export async function saveParticipant(participantData) {
  return new Promise((resolve, reject) => {
    const {
      id,
      sessionId,
      userId,
      anonymousName,
      campus,
      location,
      joinedAt,
      leftAt,
      speakingTimeSeconds
    } = participantData

    const query = `
      INSERT INTO participants (
        id, session_id, user_id, anonymous_name, campus, location,
        joined_at, left_at, speaking_time_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    db.run(query, [
      id,
      sessionId,
      userId,
      anonymousName,
      campus,
      location,
      joinedAt,
      leftAt,
      speakingTimeSeconds || 0
    ], function(err) {
      if (err) {
        console.error('Error saving participant:', err)
        reject(err)
        return
      }
      resolve(this.lastID)
    })
  })
}

/**
 * Record topic usage
 */
export async function recordTopicUsage(topic) {
  return new Promise((resolve, reject) => {
    // First, try to update existing topic
    const updateQuery = `
      UPDATE topics 
      SET used_count = used_count + 1 
      WHERE title = ? AND category = ?
    `

    db.run(updateQuery, [topic.title, topic.category], function(err) {
      if (err) {
        console.error('Error updating topic usage:', err)
        reject(err)
        return
      }

      // If no rows were updated, insert new topic
      if (this.changes === 0) {
        const insertQuery = `
          INSERT INTO topics (title, description, category, source, used_count)
          VALUES (?, ?, ?, ?, 1)
        `

        db.run(insertQuery, [
          topic.title,
          topic.description,
          topic.category,
          topic.source || 'fallback'
        ], function(err) {
          if (err) {
            console.error('Error inserting new topic:', err)
            reject(err)
            return
          }
          resolve(this.lastID)
        })
      } else {
        resolve()
      }
    })
  })
}

/**
 * Get session analytics
 */
export async function getSessionAnalytics(limit = 10) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        s.id,
        s.room_id,
        s.topic_title,
        s.topic_category,
        s.participant_count,
        s.started_at,
        s.ended_at,
        s.duration_seconds,
        s.rounds_completed,
        COUNT(p.id) as recorded_participants
      FROM sessions s
      LEFT JOIN participants p ON s.id = p.session_id
      GROUP BY s.id
      ORDER BY s.started_at DESC
      LIMIT ?
    `

    db.all(query, [limit], (err, rows) => {
      if (err) {
        console.error('Error getting session analytics:', err)
        reject(err)
        return
      }
      resolve(rows)
    })
  })
}

/**
 * Get topic analytics
 */
export async function getTopicAnalytics() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        title,
        category,
        source,
        used_count,
        created_at
      FROM topics
      ORDER BY used_count DESC, created_at DESC
    `

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error getting topic analytics:', err)
        reject(err)
        return
      }
      resolve(rows)
    })
  })
}

/**
 * Get server statistics
 */
export async function getServerStats() {
  return new Promise((resolve, reject) => {
    const queries = {
      totalSessions: 'SELECT COUNT(*) as count FROM sessions',
      totalParticipants: 'SELECT COUNT(DISTINCT user_id) as count FROM participants',
      avgSessionDuration: 'SELECT AVG(duration_seconds) as avg FROM sessions WHERE duration_seconds > 0',
      avgParticipantsPerSession: 'SELECT AVG(participant_count) as avg FROM sessions',
      topCategories: `
        SELECT category, COUNT(*) as count 
        FROM topics 
        WHERE used_count > 0 
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 5
      `
    }

    const stats = {}
    let completed = 0
    const total = Object.keys(queries).length

    function checkComplete() {
      completed++
      if (completed === total) {
        resolve(stats)
      }
    }

    // Execute all queries
    Object.entries(queries).forEach(([key, query]) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error(`Error getting ${key}:`, err)
          stats[key] = null
        } else {
          if (key === 'topCategories') {
            stats[key] = rows
          } else {
            stats[key] = rows[0]
          }
        }
        checkComplete()
      })
    })
  })
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err)
      } else {
        console.log('📊 Database connection closed')
      }
    })
  }
}

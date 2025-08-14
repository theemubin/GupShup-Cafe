import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Import our modules
import { setupSocketHandlers } from './socket/socketHandlers.js'
import { initializeDatabase } from './database/database.js'
import apiRoutes from './routes/api.js'

// Load environment variables
dotenv.config()

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Main Server Application
 * Sets up Express server with Socket.io for real-time communication
 */

const app = express()
const server = createServer(app)

// Configuration
const PORT = process.env.PORT || 3001
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}))

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api', apiRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AI Roundtable Discussion Server',
    version: '1.0.0',
    description: 'Backend server for AI-powered educational discussions',
    endpoints: {
      health: '/health',
      api: '/api',
      socket: 'ws://localhost:' + PORT
    }
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack)
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

/**
 * Initialize the server
 */
async function startServer() {
  try {
    // Initialize database
    console.log('🗄️ Initializing database...')
    await initializeDatabase()
    
    // Setup Socket.io handlers
    console.log('🔌 Setting up Socket.io handlers...')
    setupSocketHandlers(io)
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📡 Socket.io enabled with CORS origins: ${ALLOWED_ORIGINS.join(', ')}`)
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log('')
      console.log('✅ AI Roundtable Discussion Server is ready!')
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

// Start the server
startServer()

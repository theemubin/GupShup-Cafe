import { Router } from 'express'
import { 
  getAllFallbackTopics, 
  generateDiscussionTopic, 
  getTopicByCategory 
} from '../ai/topicGenerator.js'
import {
  getSessionAnalytics,
  getTopicAnalytics,
  getServerStats
} from '../database/database.js'

/**
 * API Routes
 * RESTful endpoints for the application
 */

const router = Router()

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AI Roundtable API'
  })
})

/**
 * GET /api/topics
 * Get all available fallback topics
 */
router.get('/topics', (req, res) => {
  try {
    const topics = getAllFallbackTopics()
    res.json({
      success: true,
      data: topics,
      count: topics.length
    })
  } catch (error) {
    console.error('Error getting topics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve topics'
    })
  }
})

/**
 * GET /api/topics/generate
 * Generate a new discussion topic
 */
router.get('/topics/generate', async (req, res) => {
  try {
    const topic = await generateDiscussionTopic()
    res.json({
      success: true,
      data: topic
    })
  } catch (error) {
    console.error('Error generating topic:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate topic'
    })
  }
})

/**
 * GET /api/topics/category/:category
 * Get topic by category
 */
router.get('/topics/category/:category', (req, res) => {
  try {
    const { category } = req.params
    const topic = getTopicByCategory(category)
    
    if (!topic) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found for this category'
      })
    }
    
    res.json({
      success: true,
      data: topic
    })
  } catch (error) {
    console.error('Error getting topic by category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve topic'
    })
  }
})

/**
 * GET /api/analytics/sessions
 * Get session analytics
 */
router.get('/analytics/sessions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const sessions = await getSessionAnalytics(limit)
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    })
  } catch (error) {
    console.error('Error getting session analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session analytics'
    })
  }
})

/**
 * GET /api/analytics/topics
 * Get topic usage analytics
 */
router.get('/analytics/topics', async (req, res) => {
  try {
    const topics = await getTopicAnalytics()
    
    res.json({
      success: true,
      data: topics,
      count: topics.length
    })
  } catch (error) {
    console.error('Error getting topic analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve topic analytics'
    })
  }
})

/**
 * GET /api/analytics/stats
 * Get server statistics
 */
router.get('/analytics/stats', async (req, res) => {
  try {
    const stats = await getServerStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting server stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve server statistics'
    })
  }
})

/**
 * POST /api/feedback
 * Submit user feedback (placeholder for future enhancement)
 */
router.post('/feedback', (req, res) => {
  try {
    const { rating, comment, session_id } = req.body
    
    // Log feedback (in production, save to database)
    console.log('Feedback received:', {
      rating,
      comment: comment?.substring(0, 100),
      session_id,
      timestamp: new Date()
    })
    
    res.json({
      success: true,
      message: 'Feedback received successfully'
    })
  } catch (error) {
    console.error('Error handling feedback:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    })
  }
})

/**
 * GET /api/config
 * Get public configuration
 */
router.get('/config', (req, res) => {
  try {
    // Build config object
    const config = {
      minParticipants: parseInt(process.env.MIN_PARTICIPANTS) || 1,
      maxParticipants: parseInt(process.env.MAX_PARTICIPANTS) || 8,
      defaultSpeakingTime: parseInt(process.env.DEFAULT_SPEAKING_TIME) || 60,
      features: {
        aiTopics: !!process.env.HUGGINGFACE_API_KEY && 
                  process.env.HUGGINGFACE_API_KEY !== 'your_huggingface_api_key_here',
        analytics: true,
        feedback: true
      }
    };

    // If config is missing, fallback to defaults
    if (!config || typeof config !== 'object') {
      console.warn('[api/config] Config is missing or invalid, returning fallback config');
      return res.json({
        success: true,
        data: { maxPlayers: 8, roomName: 'default' }
      });
    }

    // Always return valid JSON
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    // Log error and return valid JSON error response
    console.error('[api/config] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration',
      details: error.message
    });
  }
})

/**
 * Error handling middleware for API routes
 */
router.use((err, req, res, next) => {
  console.error('API Error:', err.stack)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

export default router

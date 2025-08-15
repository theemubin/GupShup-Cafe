import { v4 as uuidv4 } from 'uuid'
import { generateDiscussionTopic } from '../ai/topicGenerator.js'
import { RoomManager } from './roomManager.js'

/**
 * Socket.io Event Handlers
 * Manages real-time communication for the roundtable discussions
 */

// Global room manager instance
const roomManager = new RoomManager()

/**
 * Setup Socket.io event handlers
 * @param {Server} io - Socket.io server instance
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`)
    
    // Store user data from auth
    const userData = {
      id: socket.handshake.auth.userId || socket.id,
      socketId: socket.id,
      name: socket.handshake.auth.name,
      campus: socket.handshake.auth.campus,
      location: socket.handshake.auth.location,
      anonymousName: socket.handshake.auth.anonymousName,
      isReady: false,
      joinedAt: new Date()
    }

    /**
     * Handle user joining a room
     */
    socket.on('join-room', (roomId = 'general') => {
      try {
        console.log(`📥 ${userData.anonymousName} joining room: ${roomId}`)
        
        // Leave any existing rooms
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room)
            roomManager.removeUserFromRoom(room, userData.id)
          }
        })
        
        // Join the new room
        socket.join(roomId)
        socket.currentRoom = roomId
        
        // Add user to room manager
        roomManager.addUserToRoom(roomId, userData)
        
        // Get updated participants
        const participants = roomManager.getRoomParticipants(roomId)
        
        // Emit participants update to all users in the room
        io.to(roomId).emit('participants-update', participants)
        
        // Check if we can start the discussion
        checkAndStartDiscussion(roomId)
        
      } catch (error) {
        console.error('Error joining room:', error)
        socket.emit('error', 'Failed to join room')
      }
    })

    /**
     * Handle user signaling ready
     */
    socket.on('user-ready', () => {
      try {
        const roomId = socket.currentRoom
        if (!roomId) return
        
        console.log(`✅ ${userData.anonymousName} is ready`)
        
        // Update user ready status
        userData.isReady = true
        roomManager.updateUser(roomId, userData.id, { isReady: true })
        
        // Get updated participants
        const participants = roomManager.getRoomParticipants(roomId)
        
        // Emit updated participants
        io.to(roomId).emit('participants-update', participants)
        
        // Check if we can start the discussion
        checkAndStartDiscussion(roomId)
        
      } catch (error) {
        console.error('Error handling user ready:', error)
        socket.emit('error', 'Failed to update ready status')
      }
    })

    /**
     * Handle user leaving room
     */
    socket.on('leave-room', () => {
      try {
        const roomId = socket.currentRoom
        if (!roomId) return
        
        console.log(`📤 ${userData.anonymousName} leaving room: ${roomId}`)
        
        // Remove user from room
        socket.leave(roomId)
        roomManager.removeUserFromRoom(roomId, userData.id)
        
        // Get updated participants
        const participants = roomManager.getRoomParticipants(roomId)
        
        // Emit updated participants
        io.to(roomId).emit('participants-update', participants)
        
        // Notify about user disconnection
        socket.to(roomId).emit('user-disconnected', {
          userId: userData.id,
          participants
        })
        
        socket.currentRoom = null
        
      } catch (error) {
        console.error('Error leaving room:', error)
      }
    })

    /**
     * Handle next speaker request
     */
    socket.on('next-speaker', () => {
      try {
        const roomId = socket.currentRoom
        if (!roomId) return
        
        const room = roomManager.getRoom(roomId)
        if (!room || !room.discussion.active) return
        
        // Move to next speaker
        advanceToNextSpeaker(roomId)
        
      } catch (error) {
        console.error('Error handling next speaker:', error)
      }
    })

    /**
     * Handle chat messages (if needed for future enhancement)
     */
    socket.on('message', (message) => {
      try {
        const roomId = socket.currentRoom
        if (!roomId) return
        
        // Broadcast message to room
        socket.to(roomId).emit('message', {
          id: uuidv4(),
          userId: userData.id,
          anonymousName: userData.anonymousName,
          message,
          timestamp: new Date()
        })
        
      } catch (error) {
        console.error('Error handling message:', error)
      }
    })

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      try {
        console.log(`👋 User disconnected: ${socket.id}`)
        
        const roomId = socket.currentRoom
        if (roomId) {
          // Remove user from room
          roomManager.removeUserFromRoom(roomId, userData.id)
          
          // Get updated participants
          const participants = roomManager.getRoomParticipants(roomId)
          
          // Emit updated participants
          io.to(roomId).emit('participants-update', participants)
          
          // Notify about user disconnection
          socket.to(roomId).emit('user-disconnected', {
            userId: userData.id,
            participants
          })
          
          // Check if discussion should continue or end
          checkDiscussionContinuation(roomId)
        }
        
      } catch (error) {
        console.error('Error handling disconnect:', error)
      }
    })
  })

  /**
   * Check if discussion can start
   */
  async function checkAndStartDiscussion(roomId) {
    try {
      const room = roomManager.getRoom(roomId)
      if (!room) return
      
      const participants = room.participants
      const readyCount = participants.filter(p => p.isReady).length
      const minParticipants = parseInt(process.env.MIN_PARTICIPANTS) || 1
      
      // Check if we have enough ready participants
      if (participants.length >= minParticipants && readyCount >= minParticipants && !room.discussion.active) {
        console.log(`🚀 Starting discussion in room: ${roomId}`)
        
        // Generate discussion topic
        const topic = await generateDiscussionTopic()
        
        // Initialize discussion
        const speakingTime = parseInt(process.env.DEFAULT_SPEAKING_TIME) || 60
        room.discussion = {
          active: true,
          topic,
          currentSpeakerIndex: 0,
          speakingTime,
          timeRemaining: speakingTime,
          round: 1,
          startedAt: new Date()
        }
        
        // Set first speaker
        const firstSpeaker = participants[0]
        
        // Emit discussion started
        io.to(roomId).emit('discussion-started', {
          topic,
          firstSpeaker,
          duration: speakingTime
        })
        
        // Start the speaking timer
        startSpeakingTimer(roomId)
      }
    } catch (error) {
      console.error('Error checking discussion start:', error)
    }
  }

  /**
   * Start speaking timer for current speaker
   */
  function startSpeakingTimer(roomId) {
    const room = roomManager.getRoom(roomId)
    if (!room || !room.discussion.active) return
    
    // Clear any existing timer
    if (room.discussion.timer) {
      clearInterval(room.discussion.timer)
    }
    
    // Start new timer
    room.discussion.timer = setInterval(() => {
      room.discussion.timeRemaining--
      
      // Emit timer update
      io.to(roomId).emit('timer-update', room.discussion.timeRemaining)
      
      // Check if time is up
      if (room.discussion.timeRemaining <= 0) {
        advanceToNextSpeaker(roomId)
      }
    }, 1000)
  }

  /**
   * Advance to the next speaker
   */
  function advanceToNextSpeaker(roomId) {
    try {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.discussion.active) return
      
      const participants = room.participants
      if (participants.length === 0) return
      
      // Clear current timer
      if (room.discussion.timer) {
        clearInterval(room.discussion.timer)
        room.discussion.timer = null
      }
      
      // Move to next speaker
      room.discussion.currentSpeakerIndex = (room.discussion.currentSpeakerIndex + 1) % participants.length
      
      // Check if we completed a full round
      if (room.discussion.currentSpeakerIndex === 0) {
        room.discussion.round++
        
        // After 3 rounds, end the discussion
        if (room.discussion.round > 3) {
          endDiscussion(roomId)
          return
        }
      }
      
      // Reset time
      room.discussion.timeRemaining = room.discussion.speakingTime
      
      // Get next speaker
      const nextSpeaker = participants[room.discussion.currentSpeakerIndex]
      
      // Emit speaker change
      io.to(roomId).emit('speaker-changed', {
        speaker: nextSpeaker,
        timeRemaining: room.discussion.timeRemaining,
        round: room.discussion.round
      })
      
      // Start timer for next speaker
      startSpeakingTimer(roomId)
      
    } catch (error) {
      console.error('Error advancing to next speaker:', error)
    }
  }

  /**
   * End the discussion
   */
  function endDiscussion(roomId) {
    try {
      const room = roomManager.getRoom(roomId)
      if (!room) return
      
      console.log(`🏁 Ending discussion in room: ${roomId}`)
      
      // Clear timer
      if (room.discussion.timer) {
        clearInterval(room.discussion.timer)
        room.discussion.timer = null
      }
      
      // Mark discussion as ended
      room.discussion.active = false
      room.discussion.endedAt = new Date()
      
      // Emit discussion ended
      io.to(roomId).emit('discussion-ended')
      
    } catch (error) {
      console.error('Error ending discussion:', error)
    }
  }

  /**
   * Check if discussion should continue after user disconnection
   */
  function checkDiscussionContinuation(roomId) {
    try {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.discussion.active) return
      
      const participants = room.participants
      const minParticipants = parseInt(process.env.MIN_PARTICIPANTS) || 1
      
      // End discussion if not enough participants
      if (participants.length < minParticipants) {
        console.log(`⚠️ Not enough participants in room ${roomId}, ending discussion`)
        endDiscussion(roomId)
      }
    } catch (error) {
      console.error('Error checking discussion continuation:', error)
    }
  }
}

import { v4 as uuidv4 } from 'uuid'
import { generateDiscussionTopic } from '../ai/topicGenerator.js'
import { roomManager } from './roomManager.js'
import { saveSession, updateSessionEnd, recordTopicUsage } from '../database/database.js'

/**
 * Socket.io Event Handlers
 * Manages real-time communication for the roundtable discussions
 */

/**
 * Setup Socket.io event handlers
 * @param {Server} io - Socket.io server instance
 */
export function setupSocketHandlers(io) {
  // in-memory map of active session ids per room
  const activeSessions = new Map()

  io.on('connection', (socket) => {
    console.log(`[Backend] Socket connected: ${socket.id}`)
    // Log handshake auth data
    console.log('[Backend] Handshake auth:', socket.handshake.auth)
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
    socket.on('join-room', (...args) => {
      try {
        // Robustly extract roomId and clientUserData
        let roomId = 'general';
        let clientUserData = null;
        console.log('[Backend] join-room args:', args);
        if (typeof args[0] === 'string') roomId = args[0];
        if (typeof args[1] === 'object') clientUserData = args[1];

        // Use clientUserData if provided, else fallback to handshake
        const effectiveUserData = clientUserData && clientUserData.userId ? {
          id: clientUserData.userId,
          socketId: socket.id,
          name: clientUserData.name,
          campus: clientUserData.campus,
          location: clientUserData.location,
          anonymousName: clientUserData.anonymousName,
          role: clientUserData.role || 'listener', // Support role from client
          isReady: false,
          joinedAt: new Date()
        } : { ...userData, role: userData.role || 'listener' };

        console.log(`[Backend] 📥 ${effectiveUserData.anonymousName} joining room: ${roomId}`);
        console.log('[Backend] Socket rooms before join:', Array.from(socket.rooms));
        console.log('[Backend] EffectiveUserData:', effectiveUserData);

        // Leave any existing rooms
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            console.log(`[Backend] Leaving room: ${room}`);
            socket.leave(room)
            roomManager.removeUserFromRoom(room, effectiveUserData.id)
          }
        })

        // Join the new room
        socket.join(roomId)
        socket.currentRoom = roomId
        console.log(`[Backend] Joined new room: ${roomId}`);

  // Add user to room manager with debug logging
  console.log('[Backend][DEBUG] Calling addUserToRoom:', roomId, effectiveUserData);
  roomManager.addUserToRoom(roomId, effectiveUserData);
  console.log('[Backend][DEBUG] addUserToRoom complete');

  // Get updated participants with debug logging
  const participants = roomManager.getRoomParticipants(roomId);
  console.log('[Backend][DEBUG] getRoomParticipants returned:', participants);

        // Emit participants update to all users in the room
        io.to(roomId).emit('participants-update', participants)
        console.log('[Backend] Emitted participants-update');

        // Check if we can start the discussion
        checkAndStartDiscussion(roomId)

      } catch (error) {
        console.error('[Backend] Error joining room:', error)
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
     * Handle role change requests
     */
    socket.on('role-change', (data) => {
      try {
        const { userId, newRole, roomId } = data
        const targetRoomId = roomId || socket.currentRoom
        
        if (!targetRoomId) {
          socket.emit('role-change-error', { message: 'Not in a room' })
          return
        }

        // Validate role
        if (!['speaker', 'listener'].includes(newRole)) {
          socket.emit('role-change-error', { message: 'Invalid role' })
          return
        }

        // Check if trying to become speaker when at limit
        if (newRole === 'speaker' && !roomManager.canBecomeSpeaker(targetRoomId)) {
          socket.emit('role-change-error', { message: 'Speaker limit reached' })
          return
        }

        // Change the role
        const success = roomManager.changeUserRole(targetRoomId, userId, newRole)
        
        if (success) {
          // Get updated room state
          const room = roomManager.getRoom(targetRoomId)
          const roleStats = roomManager.getRoleStats(targetRoomId)
          
          // Notify all participants of the role change
          io.to(targetRoomId).emit('role-changed', {
            userId,
            newRole,
            roleStats,
            participants: room.participants
          })

          socket.emit('role-change-success', { newRole })
        } else {
          socket.emit('role-change-error', { message: 'Failed to change role' })
        }
        
      } catch (error) {
        console.error('Error handling role change:', error)
        socket.emit('role-change-error', { message: 'Internal server error' })
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

      /**
       * Simple WebRTC signaling passthrough (main app)
       * These events relay SDP and ICE messages to the intended peer socket id
       * Use 'targetSocketId' for consistency with frontend and broadcast test
       */
      socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
        try {
          if (!targetSocketId) return
          io.to(targetSocketId).emit('webrtc-offer', { fromSocketId: socket.id, offer })
        } catch (err) {
          console.error('Error relaying webrtc-offer:', err)
        }
      })

      socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
        try {
          if (!targetSocketId) return
          io.to(targetSocketId).emit('webrtc-answer', { fromSocketId: socket.id, answer })
        } catch (err) {
          console.error('Error relaying webrtc-answer:', err)
        }
      })

      socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
        try {
          if (!targetSocketId) return
          io.to(targetSocketId).emit('webrtc-ice-candidate', { fromSocketId: socket.id, candidate })
        } catch (err) {
          console.error('Error relaying ice candidate:', err)
        }
      })

    /**
     * Handle request for WebRTC readiness
     */
    socket.on('ready-for-webrtc', () => {
      try {
        const roomId = socket.currentRoom
        if (!roomId) return
        const participants = roomManager.getRoomParticipants(roomId)
        // Re-emit full participant list only to requester to trigger offer creation
        socket.emit('participants-update', participants)
      } catch (e) {
        console.warn('ready-for-webrtc handler error:', e.message)
      }
    })

    // ===== BROADCAST TEST HANDLERS =====
    // Simple broadcast test - first person becomes broadcaster, others listeners
    
    /**
     * Handle joining broadcast test
     */
    socket.on('join-broadcast-test', () => {
      console.log(`[BroadcastTest] ${socket.id} joining broadcast test`)
      
      // Get or create broadcast test room
      if (!global.broadcastTestRoom) {
        global.broadcastTestRoom = {
          participants: [],
          broadcaster: null
        }
        console.log(`[BroadcastTest] Created new broadcast room`)
      }
      
      // Debug current room state
      console.log(`[BroadcastTest] Current participants: ${global.broadcastTestRoom.participants.length}`)
      console.log(`[BroadcastTest] Current broadcaster: ${global.broadcastTestRoom.broadcaster}`)
      
      // Determine role - first person is broadcaster
      const role = global.broadcastTestRoom.participants.length === 0 ? 'broadcaster' : 'listener'
      
      const participant = {
        socketId: socket.id,
        username: userData.name || userData.anonymousName || `User-${socket.id.substring(0, 6)}`,
        role,
        joinedAt: new Date()
      }
      
      global.broadcastTestRoom.participants.push(participant)
      
      if (role === 'broadcaster') {
        global.broadcastTestRoom.broadcaster = socket.id
      }
      
      // Join socket room
      socket.join('broadcast-test')
      
      // Send role to this user
      socket.emit('broadcast-test-role', role)
      
      // Send updated participant list to all
      io.to('broadcast-test').emit('broadcast-test-participants', global.broadcastTestRoom.participants)
      
      // If this is a new listener, notify broadcaster
      if (role === 'listener' && global.broadcastTestRoom.broadcaster) {
        io.to(global.broadcastTestRoom.broadcaster).emit('new-listener-joined', { socketId: socket.id })
      }
      
      console.log(`[BroadcastTest] ${socket.id} assigned role: ${role}`)
    })

    /**
     * Handle broadcaster ready signal
     */
    socket.on('broadcaster-ready', () => {
      console.log(`[BroadcastTest] Broadcaster ${socket.id} is ready`)
      // Broadcaster is ready to receive connections from listeners
    })

    /**
     * Handle manual reset of broadcast test room
     */
    socket.on('reset-broadcast-test', () => {
      console.log(`[BroadcastTest] ${socket.id} requested room reset`)
      if (global.broadcastTestRoom) {
        global.broadcastTestRoom = {
          participants: [],
          broadcaster: null
        }
        console.log(`[BroadcastTest] Room reset - all participants cleared`)
        // Notify all users in broadcast-test room to refresh
        io.to('broadcast-test').emit('broadcast-test-reset')
      }
    })

    /**
     * Handle WebRTC signaling for broadcast test
     */
    socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
      console.log(`[BroadcastTest] Relaying offer from ${socket.id} to ${targetSocketId}`)
      io.to(targetSocketId).emit('webrtc-offer', {
        fromSocketId: socket.id,
        offer
      })
    })

    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      console.log(`[BroadcastTest] Relaying answer from ${socket.id} to ${targetSocketId}`)
      io.to(targetSocketId).emit('webrtc-answer', {
        fromSocketId: socket.id,
        answer
      })
    })

    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
      console.log(`[BroadcastTest] Relaying ICE candidate from ${socket.id} to ${targetSocketId}`)
      io.to(targetSocketId).emit('webrtc-ice-candidate', {
        fromSocketId: socket.id,
        candidate
      })
    })

    /**
     * Handle user disconnection from broadcast test
     */
    const handleBroadcastTestDisconnect = () => {
      if (!global.broadcastTestRoom) return
      
      const participantIndex = global.broadcastTestRoom.participants.findIndex(p => p.socketId === socket.id)
      
      if (participantIndex !== -1) {
        const participant = global.broadcastTestRoom.participants[participantIndex]
        console.log(`[BroadcastTest] ${socket.id} (${participant.role}) left broadcast test`)
        
        // Remove participant
        global.broadcastTestRoom.participants.splice(participantIndex, 1)
        
        // If broadcaster left, reset the room
        if (participant.role === 'broadcaster') {
          global.broadcastTestRoom.broadcaster = null
          console.log('[BroadcastTest] Broadcaster left, resetting room')
        }
        
        // Update participant list for remaining users
        io.to('broadcast-test').emit('broadcast-test-participants', global.broadcastTestRoom.participants)
      }
    }

    // Register disconnect handler for broadcast test
    const originalDisconnectHandler = socket.listeners('disconnect')[0]
    socket.on('disconnect', () => {
      handleBroadcastTestDisconnect()
      if (originalDisconnectHandler) {
        originalDisconnectHandler()
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
      if (participants.length >= minParticipants && readyCount >= minParticipants && !room.discussion.active) {
        console.log(`🚀 Starting discussion in room: ${roomId}`)
        const topic = await generateDiscussionTopic()
        // record topic usage (non-blocking)
        recordTopicUsage(topic).catch(e => console.warn('Topic usage record failed:', e.message))
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
        // persist session start
        const sessionId = uuidv4()
        activeSessions.set(roomId, sessionId)
        saveSession({
          id: sessionId,
          roomId,
          topic,
          participantCount: participants.length,
          startedAt: room.discussion.startedAt,
          endedAt: null,
          durationSeconds: null,
          roundsCompleted: 0
        }).catch(e => console.warn('Session save failed:', e.message))
        const firstSpeaker = participants[0]
        io.to(roomId).emit('discussion-started', { topic, firstSpeaker, duration: speakingTime })
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
      const sessionId = activeSessions.get(roomId)
      if (sessionId) {
        const durationSeconds = Math.floor((room.discussion.endedAt - room.discussion.startedAt) / 1000)
        updateSessionEnd({
          id: sessionId,
          endedAt: room.discussion.endedAt,
          durationSeconds,
          roundsCompleted: room.discussion.round - 1,
          participantCount: room.participants.length
        }).catch(e => console.warn('Session end update failed:', e.message))
        activeSessions.delete(roomId)
      }
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
      if (participants.length < minParticipants) {
        console.log(`⚠️ Not enough participants in room ${roomId}, ending discussion`)
        endDiscussion(roomId)
      }
    } catch (error) {
      console.error('Error checking discussion continuation:', error)
    }
  }

}
// End of file

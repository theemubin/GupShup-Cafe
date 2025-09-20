/**
 * Room Manager
 * Manages discussion rooms and participants
 */

class RoomManager {
  // Internal flag to prevent cleanup during addUserToRoom
  _skipCleanup = false;
  constructor() {
    this.rooms = new Map()
  }

  /**
   * Get or create a room
   * @param {string} roomId - Room identifier
   * @returns {Object} Room object
   */
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        participants: [],
        discussion: {
          active: false,
          topic: null,
          currentSpeakerIndex: 0,
          speakingTime: 60,
          timeRemaining: 0,
          round: 1,
          timer: null,
          startedAt: null,
          endedAt: null
        },
        createdAt: new Date()
      })
    }
    return this.rooms.get(roomId)
  }

  /**
   * Add user to room
   * @param {string} roomId - Room identifier
   * @param {Object} userData - User data
   */
  addUserToRoom(roomId, userData) {
    const room = this.getRoom(roomId)
    // Remove user if already in room (reconnection)
  const wasInRoom = room.participants.some(p => p.id === userData.id);
  this._skipCleanup = true;
  this.removeUserFromRoom(roomId, userData.id);
  this._skipCleanup = false;
    // Add user to room
    room.participants.push({
      id: userData.id,
      socketId: userData.socketId,
      anonymousName: userData.anonymousName,
      name: userData.name,
      campus: userData.campus,
      location: userData.location,
      role: userData.role || 'listener', // Default to listener
      isReady: userData.isReady || false,
      joinedAt: userData.joinedAt || new Date()
    })
    console.log(`➕ Added ${userData.anonymousName} to room ${roomId}. Total: ${room.participants.length}`)
    // Do NOT clean up room after adding user
  }

  /**
   * Remove user from room
   * @param {string} roomId - Room identifier
   * @param {string} userId - User identifier
   */
  removeUserFromRoom(roomId, userId) {
    const room = this.getRoom(roomId)
    const initialCount = room.participants.length
    
    room.participants = room.participants.filter(p => p.id !== userId)
    
    if (room.participants.length !== initialCount) {
      console.log(`➖ Removed user ${userId} from room ${roomId}. Remaining: ${room.participants.length}`)
    }

    // Clean up empty rooms
    if (room.participants.length === 0 && !this._skipCleanup) {
      this.cleanupRoom(roomId)
    }
  }

  /**
   * Update user data in room
   * @param {string} roomId - Room identifier
   * @param {string} userId - User identifier
   * @param {Object} updates - Data to update
   */
  updateUser(roomId, userId, updates) {
    const room = this.getRoom(roomId)
    const user = room.participants.find(p => p.id === userId)
    
    if (user) {
      Object.assign(user, updates)
      console.log(`🔄 Updated user ${userId} in room ${roomId}:`, updates)
    }
  }

  /**
   * Get room participants
   * @param {string} roomId - Room identifier
   * @returns {Array} Array of participants
   */
  getRoomParticipants(roomId) {
    const room = this.getRoom(roomId)
    return room.participants.map(participant => ({
      id: participant.id,
      anonymousName: participant.anonymousName,
      isReady: participant.isReady,
      joinedAt: participant.joinedAt,
      socketId: participant.socketId // added for WebRTC signaling
    }))
  }

  /**
   * Get room discussion state
   * @param {string} roomId - Room identifier
   * @returns {Object} Discussion state
   */
  getDiscussionState(roomId) {
    const room = this.getRoom(roomId)
    return {
      active: room.discussion.active,
      topic: room.discussion.topic,
      currentSpeaker: room.discussion.active && room.participants.length > 0 
        ? room.participants[room.discussion.currentSpeakerIndex] 
        : null,
      timeRemaining: room.discussion.timeRemaining,
      round: room.discussion.round,
      participantCount: room.participants.length
    }
  }

  /**
   * Change user role in room
   * @param {string} roomId - Room identifier
   * @param {string} userId - User identifier
   * @param {string} newRole - New role ('speaker' or 'listener')
   * @returns {boolean} Success status
   */
  changeUserRole(roomId, userId, newRole) {
    if (!['speaker', 'listener'].includes(newRole)) {
      return false
    }

    const room = this.getRoom(roomId)
    const user = room.participants.find(p => p.id === userId)
    
    if (user) {
      const oldRole = user.role
      user.role = newRole
      console.log(`🔄 Changed ${user.anonymousName} role from ${oldRole} to ${newRole} in room ${roomId}`)
      return true
    }
    
    return false
  }

  /**
   * Get role statistics for a room
   * @param {string} roomId - Room identifier
   * @returns {Object} Role statistics
   */
  getRoleStats(roomId) {
    const room = this.getRoom(roomId)
    const speakers = room.participants.filter(p => p.role === 'speaker')
    const listeners = room.participants.filter(p => p.role === 'listener')
    
    return {
      totalParticipants: room.participants.length,
      speakers: speakers.length,
      listeners: listeners.length,
      speakerList: speakers,
      listenerList: listeners
    }
  }

  /**
   * Check if user can become speaker (based on room limits)
   * @param {string} roomId - Room identifier
   * @param {number} maxSpeakers - Maximum allowed speakers (default: 6)
   * @returns {boolean} Can become speaker
   */
  canBecomeSpeaker(roomId, maxSpeakers = 6) {
    const stats = this.getRoleStats(roomId)
    return stats.speakers < maxSpeakers
  }

  /**
   * Clean up room resources
   * @param {string} roomId - Room identifier
   */
  cleanupRoom(roomId) {
    const room = this.rooms.get(roomId)
    
    if (room) {
      // Clear any active timers
      if (room.discussion.timer) {
        clearInterval(room.discussion.timer)
      }
      
      // Remove the room
      this.rooms.delete(roomId)
      console.log(`🧹 Cleaned up empty room: ${roomId}`)
    }
  }

  /**
   * Get all rooms (for debugging/monitoring)
   * @returns {Array} Array of room summaries
   */
  getAllRooms() {
    const roomSummaries = []
    
    for (const [roomId, room] of this.rooms.entries()) {
      roomSummaries.push({
        id: roomId,
        participantCount: room.participants.length,
        discussionActive: room.discussion.active,
        round: room.discussion.round,
        createdAt: room.createdAt
      })
    }
    
    return roomSummaries
  }

  /**
   * Get server statistics
   * @returns {Object} Server stats
   */
  getStats() {
    let totalParticipants = 0
    let activeDiscussions = 0
    
    for (const room of this.rooms.values()) {
      totalParticipants += room.participants.length
      if (room.discussion.active) {
        activeDiscussions++
      }
    }
    
    return {
      totalRooms: this.rooms.size,
      totalParticipants,
      activeDiscussions,
      timestamp: new Date()
    }
  }
}

// Singleton instance
const roomManager = new RoomManager();
export { RoomManager, roomManager };

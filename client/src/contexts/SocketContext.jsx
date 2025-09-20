import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

/**
 * Socket Context for managing real-time communication
 * Handles connection to the backend via Socket.io
 */

const SocketContext = createContext()

/**
 * SocketProvider Component
 * Manages socket connection and provides socket instance to children
 */
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { isAuthenticated, user, anonymousName } = useAuth()

  useEffect(() => {
    // Only connect if user is authenticated
    if (isAuthenticated && user && anonymousName) {
      // Use env variable or fallback to localhost for development
      const isProd = import.meta.env.MODE === 'production';
      const socketUrl = isProd
        ? import.meta.env.VITE_SOCKET_URL
        : import.meta.env.VITE_SOCKET_URL || 'http://localhost:3003';

      // Create socket connection
      const newSocket = io(socketUrl, {
        auth: {
          userId: user.id,
          name: user.name,
          campus: user.campus,
          location: user.location,
          anonymousName: anonymousName
        }
      })

      // Socket event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server:', newSocket.id)
        setConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server')
        setConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        setConnected(false)
      })

      setSocket(newSocket)

      // Cleanup on unmount or auth change
      return () => {
        newSocket.close()
        setSocket(null)
        setConnected(false)
      }
    } else {
      // Disconnect if not authenticated
      if (socket) {
        socket.close()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [isAuthenticated, user, anonymousName])

  /**
   * Join a room
   * @param {string} roomId - Room identifier
   * @param {string} role - User role ('speaker' or 'listener')
   */
  const joinRoom = (roomId, role = 'listener') => {
    if (socket) {
      // Always send user info with join-room for backend compatibility
      socket.emit('join-room', roomId, {
        userId: user?.id,
        name: user?.name,
        campus: user?.campus,
        location: user?.location,
        anonymousName: anonymousName,
        role: role
      })
    }
  }

  /**
   * Leave current room
   */
  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room')
    }
  }

  /**
   * Send a message to the current room
   * @param {string} message - Message to send
   */
  const sendMessage = (message) => {
    if (socket) {
      socket.emit('message', message)
    }
  }

  /**
   * Signal ready to start discussion
   */
  const signalReady = () => {
    if (socket) {
      socket.emit('user-ready')
    }
  }

  /**
   * Change user role in current room
   * @param {string} userId - User identifier
   * @param {string} newRole - New role ('speaker' or 'listener')
   * @param {string} roomId - Optional room ID
   */
  const changeRole = (userId, newRole, roomId = null) => {
    if (socket) {
      socket.emit('role-change', {
        userId,
        newRole,
        roomId
      })
    }
  }

  /**
   * Request next speaker in the discussion
   */
  const requestNextSpeaker = () => {
    if (socket) {
      socket.emit('next-speaker')
    }
  }

  const value = {
    socket,
    connected,
    joinRoom,
    leaveRoom,
    sendMessage,
    signalReady,
    requestNextSpeaker,
    changeRole
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

/**
 * Custom hook to use socket context
 * @returns {Object} Socket context value
 */
export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

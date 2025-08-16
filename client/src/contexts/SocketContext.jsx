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
      // Use deployed backend URL for production, fallback to localhost for dev
  const socketUrl = 'https://gupshup-cafe.onrender.com';

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
  try { window.__GUPSHUP_SOCKET = newSocket } catch(e) {}
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server')
        setConnected(false)
  try { window.__GUPSHUP_SOCKET = null } catch(e) {}
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
   */
  const joinRoom = (roomId) => {
    if (socket) {
      // Always send user info with join-room for backend compatibility
      socket.emit('join-room', roomId, {
        userId: user?.id,
        name: user?.name,
        campus: user?.campus,
        location: user?.location,
        anonymousName: anonymousName
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
    requestNextSpeaker
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

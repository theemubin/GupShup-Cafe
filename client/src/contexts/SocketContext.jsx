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
  const socketRef = React.useRef(null)
  // metaRef holds plain metadata so we never overwrite the socket instance
  const metaRef = React.useRef({ currentRoom: null, selectedRole: null })
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { isAuthenticated, user, anonymousName } = useAuth()

  useEffect(() => {
    // Only connect if user is authenticated
    // Only initialize socket once when auth becomes available
    if (isAuthenticated && user && anonymousName && !socketRef.current) {
      const isProd = import.meta.env.MODE === 'production';
      const socketUrl = import.meta.env.VITE_SOCKET_URL || (isProd ? undefined : 'http://localhost:3003');

      // Create socket with sensible reconnection options
      const newSocket = io(socketUrl, {
        auth: {
          userId: user.id,
          name: user.name,
          campus: user.campus,
          location: user.location,
          anonymousName: anonymousName
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        autoConnect: true
      })

      newSocket.on('connect', () => {
        console.log('[Socket] Connected to server:', newSocket.id)
        setConnected(true)
        // re-join room if needed after reconnect using metaRef
        if (metaRef.current.currentRoom && metaRef.current.selectedRole) {
          newSocket.emit('join-room', metaRef.current.currentRoom, { role: metaRef.current.selectedRole })
        }
      })

      newSocket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected from server:', reason)
        setConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error)
        setConnected(false)
      })

      socketRef.current = newSocket
      setSocket(newSocket)
    }

    // Cleanup when auth is removed entirely
    return () => {
      if (!isAuthenticated && socketRef.current) {
        try {
          socketRef.current.close()
        } catch (e) {
          console.warn('[Socket] Error closing socket during cleanup', e)
        }
        socketRef.current = null
        metaRef.current = { currentRoom: null, selectedRole: null }
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
    const s = socketRef.current || socket
    if (s && s.emit) {
      // store current room/role in metaRef so reconnects can rejoin
      metaRef.current.currentRoom = roomId
      metaRef.current.selectedRole = role
      s.emit('join-room', roomId, {
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
    const s = socketRef.current || socket
    if (s && s.emit) {
      s.emit('leave-room')
      // clear stored room info
      metaRef.current.currentRoom = null
      metaRef.current.selectedRole = null
    }
  }

  /**
   * Send a message to the current room
   * @param {string} message - Message to send
   */
  const sendMessage = (message) => {
    const s = socketRef.current || socket
    if (s && s.emit) {
      s.emit('message', message)
    }
  }

  /**
   * Signal ready to start discussion
   */
  const signalReady = () => {
    const s = socketRef.current || socket
    if (s && s.emit) s.emit('user-ready')
  }

  /**
   * Change user role in current room
   * @param {string} userId - User identifier
   * @param {string} newRole - New role ('speaker' or 'listener')
   * @param {string} roomId - Optional room ID
   */
  const changeRole = (userId, newRole, roomId = null) => {
    const s = socketRef.current || socket
    if (s && s.emit) s.emit('role-change', { userId, newRole, roomId })
  }

  /**
   * Request next speaker in the discussion
   */
  const requestNextSpeaker = () => {
    const s = socketRef.current || socket
    if (s && s.emit) s.emit('next-speaker')
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

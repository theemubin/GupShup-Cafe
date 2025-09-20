import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useAudio } from '../contexts/AudioContext'
import { Users, Clock, Mic, MicOff, LogOut, Settings } from 'lucide-react'

// Global flag to prevent multiple late join checks (accessible across components)
if (typeof window !== 'undefined') {
  window.lateJoinCheckInProgress = window.lateJoinCheckInProgress || false
}

/**
 * Lobby Page Component
 * Waiting area until minimum participants (1+) join the session
 */
function LobbyPage() {
  const navigate = useNavigate()
  const { socket, connected, joinRoom, signalReady } = useSocket()
  const { user, anonymousName, logout } = useAuth()
  const { 
    audioEnabled, 
    micPermission, 
    requestMicrophoneAccess, 
    isWebRTCSupported,
    userRole,
    updateUserRole
  } = useAudio()
  
  const [
    participants, setParticipants] = useState([])
  const [roomId, setRoomId] = useState('general')
  const [selectedRole, setSelectedRole] = useState('speaker') // Default to speaker
  const [minParticipants, setMinParticipants] = useState(1) // Default to 1 for solo testing
  const [isReady, setIsReady] = useState(false)
  const [waitingTime, setWaitingTime] = useState(0)
  const [systemMessage, setSystemMessage] = useState('Connecting to lobby...')
  const [isNavigating, setIsNavigating] = useState(false)

  // Timer for waiting time and late join check
  useEffect(() => {
    // Disable late join check in development to prevent loops
    const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
    if (isDevelopment) {
      console.log('[Lobby][Debug] Development mode - disabling auto late join navigation')
      // Just start the timer, skip late join check
      const timer = setInterval(() => {
        setWaitingTime(prev => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }

    // Production late join logic
    const persistentNavigating = sessionStorage.getItem('roundtable-navigating')
    if (isNavigating || persistentNavigating === 'true' || window.lateJoinCheckInProgress) {
      console.log('[Lobby][Debug] Navigation already in progress, skipping late join check')
      return
    }

    // Late join: check if discussion is already active
    const checkDiscussionState = async () => {
      if (window.lateJoinCheckInProgress) {
        console.log('[Lobby][Debug] Late join check already in progress')
        return
      }
      
      window.lateJoinCheckInProgress = true
      
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        console.log(`[Lobby][Debug] Fetching ${apiUrl}/api/room/${roomId}/state for late join check`)
        const res = await fetch(`${apiUrl}/api/room/${roomId}/state`)
        const json = await res.json()
        console.log('[Lobby][Debug] Room state response:', json)
        
        if (json?.discussion?.active) {
          console.log('[Lobby][Debug] Late join detected - navigating to /roundtable') 
          setIsNavigating(true)
          sessionStorage.setItem('roundtable-navigating', 'true')
          navigate('/roundtable', { replace: true })
          return
        } else {
          console.log('[Lobby][Debug] Room state: discussion not active')
          window.lateJoinCheckInProgress = false
        }
      } catch (err) {
        console.warn('[Lobby][Debug] Failed to check room state for late join', err)
        window.lateJoinCheckInProgress = false
      }
    }
    
    checkDiscussionState()
    
    const timer = setInterval(() => {
      if (!isNavigating && !window.lateJoinCheckInProgress) {
        setWaitingTime(prev => prev + 1)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [roomId, isNavigating, navigate])

  // Socket event handlers
  useEffect(() => {
    if (!socket || isNavigating) {
      console.log('[Lobby][Debug] Socket not available or navigating')
      return
    }

    console.log('[Lobby][Debug] Socket available, connected:', connected)
    // Socket connect/disconnect events
    socket.on('connect', () => {
      if (!isNavigating) {
        console.log('[Lobby][Debug] Socket connected:', socket.id)
        console.log(`[Lobby][Debug] Calling joinRoom with roomId: ${roomId}, role: ${selectedRole} (on connect)`)
        joinRoom(roomId, selectedRole)
      }
    })
    socket.on('disconnect', () => {
      console.log('[Lobby][Debug] Socket disconnected')
    })

    // Handle participants update
    socket.on('participants-update', (updatedParticipants) => {
      console.log('[Lobby][Debug] Received participants-update:', updatedParticipants)
      setParticipants(updatedParticipants)
      console.log('[Lobby][Debug] Current participants state:', updatedParticipants)
      if (updatedParticipants.length >= 1) {
        setSystemMessage('Ready to start! Click "Ready" when you want to begin.')
      } else {
        setSystemMessage('Connecting to discussion room...')
      }
    })

    // Handle discussion start
    socket.on('discussion-started', () => {
      console.log('[Lobby][Debug] Received discussion-started event - navigating to /roundtable')
      if (!isNavigating) {
        setIsNavigating(true)
        setSystemMessage('Discussion starting! Redirecting to roundtable...')
        console.log('[Lobby][Debug] Navigating to /roundtable now')
        navigate('/roundtable', { replace: true })
      }
    })

    // Handle user ready status
    socket.on('user-ready-update', (readyUsers) => {
      console.log('[Lobby][Debug] Received user-ready-update:', readyUsers)
      // Update UI to show who's ready
      console.log('[Lobby][Debug] Ready users:', readyUsers)
    })

    // Handle system messages
    socket.on('system-message', (message) => {
      console.log('[Lobby][Debug] Received system-message:', message)
      setSystemMessage(message)
    })

    // Cleanup
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('participants-update')
      socket.off('discussion-started')
      socket.off('user-ready-update')
      socket.off('system-message')
    }
  }, [socket, joinRoom, roomId, selectedRole, navigate, connected, isNavigating])

  // Fetch server-side configuration (minParticipants, etc.)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/config`)
        const json = await res.json()
        const serverMin = json?.data?.minParticipants
        // Force minParticipants to 1 for local/single-user testing
        setMinParticipants(1)
        // If you want to use server config, comment out the line above and uncomment below
        // if (serverMin && Number.isFinite(serverMin)) setMinParticipants(serverMin)
      } catch (err) {
        console.warn('Failed to fetch server config, using defaults', err)
      }
    }

    fetchConfig()
  }, [])

  // Sync role between lobby selection and audio context
  useEffect(() => {
    if (updateUserRole && selectedRole !== userRole) {
      console.log(`[Lobby] Syncing role from ${userRole} to ${selectedRole}`)
      updateUserRole(selectedRole)
    }
  }, [selectedRole, userRole, updateUserRole])

  /**
   * Format waiting time as MM:SS
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Handle ready button click
   */
  const handleReady = () => {
  console.log('[Lobby][Debug] Ready button clicked. Participants:', participants, 'AudioEnabled:', audioEnabled)
    if (participants.length >= minParticipants && audioEnabled) {
      setIsReady(true)
  console.log('[Lobby][Debug] Emitting signalReady')
      signalReady()
    }
  }

  /**
   * Handle microphone setup
   */
  const handleMicrophoneSetup = async () => {
    if (!isWebRTCSupported) {
      alert('Your browser does not support audio features. Please use a modern browser.')
      return
    }

    // Ensure we're requesting as a speaker
    if (selectedRole !== 'speaker') {
      console.warn('[Lobby] Trying to enable microphone but not a speaker')
      return
    }

    await requestMicrophoneAccess('speaker')
  }

  /**
   * Handle logout
   */
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const canStart = participants.length >= minParticipants && audioEnabled

  // Show loading state while navigating
  if (isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{systemMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Lobby</h1>
              <p className="text-sm text-gray-500">Welcome, {anonymousName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Connection Status */}
            <div className={`flex items-center space-x-1 text-sm ${
              connected ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-600' : 'bg-red-600'
              }`}></div>
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            
            {/* Waiting Time */}
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatTime(waitingTime)}</span>
            </div>
            
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Status Panel */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Status</h2>
              
              <div className="space-y-4">
                {/* Role Selection */}
                <div className="space-y-2">
                  <span className="text-gray-600 text-sm font-medium">Your Role</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRole('speaker')
                        if (connected) {
                          console.log('[Lobby] Role changed to speaker, rejoining room')
                          joinRoom(roomId, 'speaker')
                        }
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedRole === 'speaker'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🎤 Speaker
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRole('listener')
                        if (connected) {
                          console.log('[Lobby] Role changed to listener, rejoining room')
                          joinRoom(roomId, 'listener')
                        }
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedRole === 'listener'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      👂 Listener
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {selectedRole === 'speaker' 
                      ? 'You can speak and participate actively in discussions'
                      : 'You will listen to discussions without speaking privileges'
                    }
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Participants</span>
                  <span className={`font-semibold ${
                    participants.length >= 2 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {participants.length}/{minParticipants}+ required
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Audio Setup</span>
                  <span className={`font-semibold ${
                    audioEnabled ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {audioEnabled ? 'Ready' : 'Setup Required'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-semibold ${
                    canStart ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {canStart ? 'Ready to Start' : 'Waiting'}
                  </span>
                </div>
              </div>
              
              {/* System Message */}
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">{systemMessage}</p>
              </div>
            </div>

            {/* Audio Setup */}
            {selectedRole === 'speaker' && !audioEnabled && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Audio Setup</h3>
                
                {!isWebRTCSupported ? (
                  <div className="text-center py-4">
                    <MicOff className="w-12 h-12 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600 font-medium">Audio Not Supported</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Please use a modern browser that supports WebRTC
                    </p>
                  </div>
                ) : micPermission === 'denied' ? (
                  <div className="text-center py-4">
                    <MicOff className="w-12 h-12 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600 font-medium">Microphone Access Denied</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Please enable microphone access in your browser settings
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Mic className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-900 font-medium mb-2">Enable Microphone</p>
                    <p className="text-sm text-gray-600 mb-4">
                      We need access to your microphone for voice discussions
                    </p>
                    <button
                      onClick={handleMicrophoneSetup}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 
                                 transition-colors"
                    >
                      Enable Microphone
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Audio Setup for Listeners */}
            {selectedRole === 'listener' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Audio Setup</h3>
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    👂
                  </div>
                  <p className="text-blue-600 font-medium">Listener Mode Active</p>
                  <p className="text-sm text-gray-600 mt-1">
                    You'll receive audio from speakers without needing microphone access
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Participants List */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Participants ({participants.length})
            </h2>
            
            <div className="space-y-3">
              {participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md"
                >
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center 
                                  justify-center text-white font-semibold">
                    {participant.anonymousName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{participant.anonymousName}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        participant.role === 'speaker' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {participant.role === 'speaker' ? '🎤 Speaker' : '👂 Listener'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {participant.isReady ? 'Ready' : 'Waiting'}
                      </span>
                    </div>
                  </div>
                  {participant.isReady && (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  )}
                </div>
              ))}
              
              {/* Empty slots */}
              {participants.length < 2 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Waiting for more participants to join...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ready Button */}
        <div className="mt-8 text-center">
          {canStart && !isReady && (
            <button
              onClick={handleReady}
              className="px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg 
                         hover:bg-green-700 transition-colors shadow-lg"
            >
              I'm Ready to Start!
            </button>
          )}
          
          {isReady && (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-green-600">
                <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                <span className="font-semibold">Ready! Waiting for others...</span>
              </div>
            </div>
          )}
          
          {!canStart && (
            <p className="text-gray-500">
              {!audioEnabled 
                ? 'Please enable your microphone to continue' 
                : 'Waiting for minimum participants...'}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default LobbyPage

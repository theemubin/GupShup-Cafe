import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useAudio } from '../contexts/AudioContext'
import RoundtableView from '../components/RoundtableView'
import TopicDisplay from '../components/TopicDisplay'
import SpeakerTimer from '../components/SpeakerTimer'
import ParticipantControls from '../components/ParticipantControls'
import { LogOut, Users } from 'lucide-react'

/**
 * Roundtable Page Component
 * Main discussion interface with visual roundtable, timer, and speaking controls
 */
function RoundtablePage() {
  const navigate = useNavigate()
  const { socket, connected } = useSocket()
  const { user, anonymousName, logout } = useAuth()
  const { enableSpeaking, disableSpeaking } = useAudio()
  
  // Discussion state
  const [participants, setParticipants] = useState([])
  const [currentTopic, setCurrentTopic] = useState(null)
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [speakingDuration, setSpeakingDuration] = useState(60) // Default 60 seconds
  const [discussionStarted, setDiscussionStarted] = useState(false)
  const [discussionEnded, setDiscussionEnded] = useState(false)
  const [round, setRound] = useState(1)
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Socket event handlers
  useEffect(() => {
    if (!socket) return

    // Handle participants update
    socket.on('participants-update', (updatedParticipants) => {
      setParticipants(updatedParticipants)
      setIsLoading(false)
    })

    // Handle new topic
    socket.on('new-topic', (topic) => {
      setCurrentTopic(topic)
    })

    // Handle discussion start
    socket.on('discussion-started', ({ topic, firstSpeaker, duration }) => {
      setCurrentTopic(topic)
      setCurrentSpeaker(firstSpeaker)
      setTimeRemaining(duration)
      setSpeakingDuration(duration)
      setDiscussionStarted(true)
      setIsLoading(false)
    })

    // Handle speaker change
    socket.on('speaker-changed', ({ speaker, timeRemaining: time, round: currentRound }) => {
      setCurrentSpeaker(speaker)
      setTimeRemaining(time)
      setRound(currentRound)
      
      // Enable/disable speaking based on if current user is the speaker
      if (speaker && speaker.id === user?.id) {
        enableSpeaking()
      } else {
        disableSpeaking()
      }
    })

    // Handle timer updates
    socket.on('timer-update', (time) => {
      setTimeRemaining(time)
    })

    // Handle discussion end
    socket.on('discussion-ended', () => {
      setDiscussionEnded(true)
      disableSpeaking()
    })

    // Handle user disconnection
    socket.on('user-disconnected', ({ userId, participants: updatedParticipants }) => {
      setParticipants(updatedParticipants)
      
      // If discussion has too few people, redirect back to lobby
      if (updatedParticipants.length < 2) {
        setTimeout(() => {
          navigate('/lobby')
        }, 3000)
      }
    })

    // Handle errors
    socket.on('error', (errorMessage) => {
      setError(errorMessage)
    })

    // Cleanup
    return () => {
      socket.off('participants-update')
      socket.off('new-topic')
      socket.off('discussion-started')
      socket.off('speaker-changed')
      socket.off('timer-update')
      socket.off('discussion-ended')
      socket.off('user-disconnected')
      socket.off('error')
    }
  }, [socket, user, enableSpeaking, disableSpeaking, navigate])

  // Auto-redirect if not connected or no participants
  useEffect(() => {
    if (!connected && !isLoading) {
      navigate('/lobby')
    }
  }, [connected, isLoading, navigate])

  /**
   * Handle leaving the discussion
   */
  const handleLeaveDiscussion = () => {
    if (window.confirm('Are you sure you want to leave the discussion?')) {
      navigate('/lobby')
    }
  }

  /**
   * Handle logout
   */
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout? This will end your session.')) {
      logout()
      navigate('/')
    }
  }

  /**
   * Get the current user's position in the speaking order
   */
  const getCurrentUserPosition = () => {
    const currentUserIndex = participants.findIndex(p => p.id === user?.id)
    return currentUserIndex >= 0 ? currentUserIndex + 1 : null
  }

  /**
   * Check if current user is speaking
   */
  const isCurrentUserSpeaking = () => {
    return currentSpeaker && currentSpeaker.id === user?.id
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discussion...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">AI Roundtable</h1>
                <p className="text-sm text-gray-500">Round {round} • {participants.length} participants</p>
              </div>
            </div>
            
            {/* Speaker Status */}
            {discussionStarted && currentSpeaker && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-800">
                  {isCurrentUserSpeaking() ? 'You are speaking' : `${currentSpeaker.anonymousName} is speaking`}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Connection Status */}
            <div className={`hidden sm:flex items-center space-x-1 text-sm ${
              connected ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-600' : 'bg-red-600'
              }`}></div>
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            
            {/* Controls */}
            <button
              onClick={handleLeaveDiscussion}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 
                         rounded hover:bg-gray-50 transition-colors"
            >
              Leave
            </button>
            
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
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
        {/* Left Panel - Discussion Info */}
        <div className="lg:w-80 space-y-4">
          {/* Topic Display */}
          {currentTopic && (
            <TopicDisplay topic={currentTopic} />
          )}
          
          {/* Speaking Timer */}
          {discussionStarted && currentSpeaker && (
            <SpeakerTimer
              timeRemaining={timeRemaining}
              totalTime={speakingDuration}
              currentSpeaker={currentSpeaker}
              isCurrentUser={isCurrentUserSpeaking()}
            />
          )}
          
          {/* Your Position */}
          {discussionStarted && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Your Turn</h3>
              <p className="text-sm text-gray-600">
                You are #{getCurrentUserPosition()} in the speaking order
              </p>
              {isCurrentUserSpeaking() && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  🎤 It's your turn to speak!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Center Panel - Roundtable */}
        <div className="flex-1 flex items-center justify-center">
          <RoundtableView
            participants={participants}
            currentSpeaker={currentSpeaker}
            currentTopic={currentTopic}
            discussionStarted={discussionStarted}
          />
        </div>

        {/* Right Panel - Controls & Participants */}
        <div className="lg:w-80 space-y-4">
          {/* Participant Controls */}
          <ParticipantControls
            isCurrentUserSpeaking={isCurrentUserSpeaking()}
            discussionStarted={discussionStarted}
            discussionEnded={discussionEnded}
          />
          
          {/* Participants List */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Participants ({participants.length})
            </h3>
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div 
                  key={participant.id}
                  className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                    currentSpeaker && currentSpeaker.id === participant.id
                      ? 'bg-green-100 border border-green-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500 w-6">
                      #{index + 1}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                      currentSpeaker && currentSpeaker.id === participant.id
                        ? 'bg-green-500'
                        : 'bg-primary-600'
                    }`}>
                      {participant.anonymousName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      currentSpeaker && currentSpeaker.id === participant.id
                        ? 'text-green-800'
                        : 'text-gray-900'
                    }`}>
                      {participant.anonymousName}
                      {participant.id === user?.id && ' (You)'}
                    </p>
                    {currentSpeaker && currentSpeaker.id === participant.id && (
                      <p className="text-xs text-green-600">Speaking now</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Discussion End Modal */}
      {discussionEnded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Discussion Completed!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for participating in this AI-powered roundtable discussion. 
              We hope you enjoyed the conversation!
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/lobby')}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Join New Discussion
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoundtablePage

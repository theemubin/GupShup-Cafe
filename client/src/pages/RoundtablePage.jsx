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
import LiveAudioLevelBar from '../components/LiveAudioLevelBar'

/**
 * Roundtable Page Component
 * Main discussion interface with visual roundtable, timer, and speaking controls
 */
function RoundtablePage() {
  const navigate = useNavigate()
  const { socket, connected, changeRole } = useSocket()
  const { user, anonymousName, logout } = useAuth()
  const { enableSpeaking, disableSpeaking, enableAudioPlayback, userRole } = useAudio()

  // Note: Room joining is handled by LobbyPage, no need to rejoin here
  // This prevents duplicate join-room events and state conflicts

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
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const [error, setError] = useState(null)
  const [showAudioEnablePrompt, setShowAudioEnablePrompt] = useState(false)
  const [topic, setTopic] = useState({ title: 'Welcome', description: 'Waiting for topic...' })

  // Clear navigation state when roundtable page successfully mounts
  useEffect(() => {
    console.log('[Roundtable] Page mounted - clearing navigation state')
    sessionStorage.removeItem('roundtable-navigating')
    // Clear global flag by importing and resetting it
    if (window.lateJoinCheckInProgress !== undefined) {
      window.lateJoinCheckInProgress = false
    }
  }, [])

  // When the page loads, the discussion is considered started.
  useEffect(() => {
    setDiscussionStarted(true);
    setIsLoading(false);
    // Clear the late-join flag once successfully on the roundtable page
    sessionStorage.removeItem('late-join-navigating');
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return

    const handleParticipantsUpdate = (updatedParticipants) => {
      console.log('[Roundtable] Participants updated:', updatedParticipants);
      setParticipants(updatedParticipants)
    };

    const handleSpeakerChange = (speaker) => {
      console.log('[Roundtable] Speaker changed:', speaker);
      setCurrentSpeaker(speaker)
      
      // Enable/disable speaking based on if current user is the speaker
      if (speaker && speaker.id === user?.id) {
        enableSpeaking()
      } else {
        disableSpeaking()
      }
    };

    const handleTopicUpdate = (newTopic) => {
      console.log('[Roundtable] Topic updated:', newTopic);
      setTopic(newTopic);
    };

    const handleDiscussionStarted = ({ topic, firstSpeaker, duration }) => {
      console.log('[Roundtable] Discussion started:', { topic, firstSpeaker, duration });
      console.log('[Roundtable] Current user:', user);
      console.log('[Roundtable] Is current user first speaker?', firstSpeaker && firstSpeaker.id === user?.id);
      
      setTopic(topic);
      setCurrentTopic(topic);
      setSpeakingDuration(duration);
      setTimeRemaining(duration);
      setCurrentSpeaker(firstSpeaker);
      
      // Enable speaking if current user is the first speaker
      if (firstSpeaker && firstSpeaker.id === user?.id) {
        console.log('[Roundtable] Current user is first speaker - enabling speaking');
        enableSpeaking();
      } else {
        console.log('[Roundtable] Current user is not first speaker');
      }
    };

    // No longer need a 'discussion-started' listener here

    socket.on('participants-update', handleParticipantsUpdate);
    socket.on('speaker-changed', handleSpeakerChange);
    socket.on('topic-update', handleTopicUpdate);
    socket.on('discussion-started', handleDiscussionStarted);

    return () => {
      socket.off('participants-update', handleParticipantsUpdate);
      socket.off('speaker-changed', handleSpeakerChange);
      socket.off('topic-update', handleTopicUpdate);
      socket.off('discussion-started', handleDiscussionStarted);
    };
  }, [socket, user, enableSpeaking, disableSpeaking])

  // Auto-redirect if not connected or no participants
  useEffect(() => {
    if (!connected && !isLoading) {
      navigate('/lobby')
    }
  }, [connected, isLoading, navigate])

  // Show audio enable prompt when discussion starts and there are other participants
  useEffect(() => {
    if (discussionStarted && participants.length > 1) {
      // Check if there are remote audio elements that might need user interaction
      setTimeout(() => {
        const remoteAudioElements = document.querySelectorAll('audio[data-peer]')
        if (remoteAudioElements.length > 0) {
          setShowAudioEnablePrompt(true)
        }
      }, 2000) // Wait 2 seconds for WebRTC connections to establish
    }
  }, [discussionStarted, participants.length])

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

  /**
   * Toggle user role between speaker and listener
   */
  const handleRoleToggle = () => {
    const newRole = userRole === 'speaker' ? 'listener' : 'speaker'
    console.log(`[Roundtable] Requesting role change to ${newRole}`)
    changeRole(user?.id, newRole)
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
      {/* Audio Enable Prompt */}
      {showAudioEnablePrompt && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center justify-between">
            <div className="flex">
              <div className="text-yellow-400 mr-3">🔊</div>
              <div>
                <p className="text-sm text-yellow-800">
                  Click to enable audio to hear other participants
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  enableAudioPlayback()
                  setShowAudioEnablePrompt(false)
                }}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm px-3 py-1 rounded"
              >
                Enable Audio
              </button>
              <button
                onClick={() => setShowAudioEnablePrompt(false)}
                className="text-yellow-800 hover:text-yellow-900 text-sm px-2"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* Add the live audio level bar for your own mic */}
            <div className="ml-6">
              <LiveAudioLevelBar />
            </div>
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
            
            {/* Role Toggle */}
            <button
              onClick={handleRoleToggle}
              className={`px-3 py-1 text-sm font-medium border rounded transition-colors ${
                userRole === 'speaker'
                  ? 'bg-primary-100 text-primary-700 border-primary-300 hover:bg-primary-200'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
              title={`Switch to ${userRole === 'speaker' ? 'listener' : 'speaker'}`}
            >
              {userRole === 'speaker' ? '🎤 Speaker' : '👂 Listener'}
            </button>
            
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

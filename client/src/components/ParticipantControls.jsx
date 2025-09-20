import React from 'react'
import { useAudio } from '../contexts/AudioContext'
import { Mic, MicOff, Volume2, VolumeX, SkipForward } from 'lucide-react'

/**
 * ParticipantControls Component
 * Audio controls and speaking management for participants
 */
function ParticipantControls({ 
  isCurrentUserSpeaking, 
  discussionStarted, 
  discussionEnded 
}) {
  const { 
    isMuted, 
    audioLevel, 
    toggleMute, 
    audioEnabled,
    micPermission 
  } = useAudio()

  /**
   * Get microphone button styling based on state
   */
  const getMicButtonStyle = () => {
    if (!audioEnabled || micPermission === 'denied') {
      return 'bg-gray-400 cursor-not-allowed'
    }
    if (isCurrentUserSpeaking && !isMuted) {
      return 'bg-red-500 hover:bg-red-600 animate-pulse'
    }
    if (isCurrentUserSpeaking && isMuted) {
      return 'bg-yellow-500 hover:bg-yellow-600'
    }
    return 'bg-gray-500 hover:bg-gray-600'
  }

  /**
   * Get audio level indicator bars
   */
  const getAudioLevelBars = () => {
    const bars = 5
    const activeBarCount = Math.ceil((audioLevel / 50) * bars) // Normalize to 0-5 scale
    
    return Array.from({ length: bars }, (_, index) => (
      <div
        key={index}
        className={`w-1 rounded-full transition-all duration-100 ${
          index < activeBarCount && !isMuted && isCurrentUserSpeaking
            ? 'bg-green-500 h-6'
            : 'bg-gray-300 h-2'
        }`}
      />
    ))
  }

  if (discussionEnded) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Volume2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Discussion Complete</h3>
          <p className="text-gray-600">Thank you for participating!</p>
        </div>
      </div>
    )
  }

  if (!discussionStarted) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Getting Ready</h3>
          <p className="text-gray-600">Discussion will start soon...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Audio Controls</h3>
      
      {/* Microphone Control */}
      <div className="space-y-4">
        {/* Speaking Status */}
        <div className={`p-4 rounded-lg border-2 ${
          isCurrentUserSpeaking 
            ? 'border-green-200 bg-green-50' 
            : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">
              {isCurrentUserSpeaking ? '🎤 You are speaking' : '🔇 Listening mode'}
            </span>
            {isCurrentUserSpeaking && (
              <div className="flex items-center space-x-1">
                {getAudioLevelBars()}
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600">
            {isCurrentUserSpeaking 
              ? 'Your microphone is active. Others can hear you.' 
              : 'Your microphone is muted. Wait for your turn to speak.'}
          </p>
        </div>

        {/* Mute/Unmute Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleMute}
            disabled={!audioEnabled || micPermission === 'denied'}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg 
                       text-white font-medium transition-all ${getMicButtonStyle()}`}
            title={
              !audioEnabled || micPermission === 'denied'
                ? 'Microphone not available'
                : (isMuted ? 'Click to unmute' : 'Click to mute')
            }
          >
            {!audioEnabled || micPermission === 'denied' ? (
              <MicOff className="w-5 h-5" />
            ) : isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span className="text-sm">
              {!audioEnabled || micPermission === 'denied'
                ? 'No Mic Access'
                : (isMuted ? 'Unmute' : 'Mute')
              }
            </span>
          </button>
        </div>

        {/* Audio Level Indicator */}
        {audioEnabled && isCurrentUserSpeaking && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Audio Level</span>
              <span className="text-xs text-gray-500">
                {isMuted ? 'Muted' : Math.round(audioLevel)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-100 ${
                  isMuted ? 'bg-gray-400' : 'bg-green-500'
                }`}
                style={{ 
                  width: `${isMuted ? 0 : Math.min(audioLevel * 2, 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Microphone Issues */}
        {micPermission === 'denied' && (
          <div className="p-3 bg-red-50 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ Microphone access denied. Please enable it in your browser settings.
            </p>
          </div>
        )}

        {!audioEnabled && micPermission !== 'denied' && (
          <div className="p-3 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-800">
              🔧 Microphone setup required. Please check your audio settings.
            </p>
          </div>
        )}

        {/* Quick Tips */}
        <div className="p-3 bg-blue-50 rounded-md">
          <h4 className="font-medium text-blue-900 mb-1">Speaking Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Wait for your turn indicator</li>
            <li>• Respect time limits</li>
            <li>• Build on others' ideas</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ParticipantControls

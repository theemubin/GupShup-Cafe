import React from 'react'
import { Clock, User } from 'lucide-react'

/**
 * SpeakerTimer Component
 * Displays countdown timer for the current speaker with visual progress
 */
function SpeakerTimer({ timeRemaining, totalTime, currentSpeaker, isCurrentUser }) {
  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Calculate progress percentage
   */
  const progressPercentage = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0

  /**
   * Get timer color based on remaining time
   */
  const getTimerColor = () => {
    const percentRemaining = (timeRemaining / totalTime) * 100
    if (percentRemaining > 50) return 'text-green-600'
    if (percentRemaining > 25) return 'text-yellow-600'
    return 'text-red-600'
  }

  /**
   * Get progress bar color based on remaining time
   */
  const getProgressColor = () => {
    const percentRemaining = (timeRemaining / totalTime) * 100
    if (percentRemaining > 50) return 'bg-green-500'
    if (percentRemaining > 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${
      isCurrentUser ? 'ring-2 ring-green-500 ring-opacity-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2 rounded-full ${
          isCurrentUser ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <Clock className={`w-5 h-5 ${
            isCurrentUser ? 'text-green-600' : 'text-gray-600'
          }`} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Speaking Time</h3>
          <p className="text-sm text-gray-500">
            {isCurrentUser ? 'Your turn' : `${currentSpeaker?.anonymousName}'s turn`}
          </p>
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${getTimerColor()}`}>
          {formatTime(timeRemaining)}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          of {formatTime(totalTime)} remaining
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      {/* Current Speaker Info */}
      <div className={`flex items-center space-x-3 p-3 rounded-md ${
        isCurrentUser ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
          isCurrentUser ? 'bg-green-500' : 'bg-primary-600'
        }`}>
          {currentSpeaker?.anonymousName?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <p className={`font-medium ${
            isCurrentUser ? 'text-green-800' : 'text-gray-900'
          }`}>
            {isCurrentUser ? 'You' : currentSpeaker?.anonymousName}
          </p>
          <p className={`text-sm ${
            isCurrentUser ? 'text-green-600' : 'text-gray-500'
          }`}>
            Currently speaking
          </p>
        </div>
        {isCurrentUser && (
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>

      {/* Warning for low time */}
      {timeRemaining <= 15 && timeRemaining > 0 && (
        <div className={`mt-3 p-2 rounded-md text-center text-sm font-medium ${
          isCurrentUser 
            ? 'bg-red-100 text-red-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isCurrentUser ? '⚠️ Wrap up your thoughts!' : '⏰ Time running out'}
        </div>
      )}

      {/* Time's up message */}
      {timeRemaining === 0 && (
        <div className="mt-3 p-2 bg-red-100 text-red-800 rounded-md text-center text-sm font-medium">
          🔔 Time's up! Next speaker will be activated.
        </div>
      )}
    </div>
  )
}

export default SpeakerTimer

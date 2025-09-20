import React from 'react'
import { Brain } from 'lucide-react'

/**
 * RoundtableView Component
 * Visual representation of the roundtable with participants arranged in a circle
 */
function RoundtableView({ participants, currentSpeaker, currentTopic, discussionStarted }) {
  /**
   * Calculate position for each chair around the circle
   * @param {number} index - Participant index
   * @param {number} total - Total number of participants
   */
  const getChairPosition = (index, total) => {
    // Distribute chairs evenly around the circle
    const angle = (index * 360) / total
    const radius = 140 // Distance from center
    
    // Convert angle to radians and calculate x, y coordinates
    const radians = (angle - 90) * (Math.PI / 180) // -90 to start from top
    const x = radius * Math.cos(radians)
    const y = radius * Math.sin(radians)
    
    return {
      left: `calc(50% + ${x}px)`,
      top: `calc(50% + ${y}px)`,
      transform: 'translate(-50%, -50%)'
    }
  }

  /**
   * Get chair styling based on participant state
   */
  const getChairStyle = (participant) => {
    const baseClasses = 'absolute w-14 h-14 rounded-full border-4 transition-all duration-300 ' +
                       'flex items-center justify-center font-semibold text-white text-sm ' +
                       'shadow-lg cursor-pointer chair-enter'
    
    if (currentSpeaker && currentSpeaker.id === participant.id) {
      return `${baseClasses} border-green-500 bg-green-500 shadow-green-300 shadow-xl scale-110 ` +
             'animate-pulse-active ring-4 ring-green-200'
    }
    
    return `${baseClasses} border-primary-600 bg-primary-600 hover:scale-105`
  }

  /**
   * Render participant chair
   */
  const renderChair = (participant, index) => {
    const position = getChairPosition(index, participants.length)
    const isCurrentSpeaker = currentSpeaker && currentSpeaker.id === participant.id
    
    return (
      <div
        key={participant.id}
        className={getChairStyle(participant)}
        style={position}
        title={`${participant.anonymousName}${isCurrentSpeaker ? ' (Speaking)' : ''}`}
      >
        {/* Participant Initial */}
        {participant.anonymousName.charAt(0).toUpperCase()}
        
        {/* Speaking Indicator */}
        {isCurrentSpeaker && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full 
                          border-2 border-white flex items-center justify-center animate-bounce">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
        
        {/* Role Indicator */}
        <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-white text-xs flex items-center justify-center ${
          participant.role === 'speaker' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-400 text-white'
        }`}>
          {participant.role === 'speaker' ? '🎤' : '👂'}
        </div>

        {/* Name Label */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 
                        bg-white px-2 py-1 rounded-md shadow-sm border text-xs font-medium 
                        text-gray-700 whitespace-nowrap">
          {participant.anonymousName}
          <div className={`text-xs ${
            participant.role === 'speaker' ? 'text-blue-600' : 'text-gray-500'
          }`}>
            {participant.role === 'speaker' ? '🎤 Speaker' : '👂 Listener'}
          </div>
          {isCurrentSpeaker && (
            <div className="text-green-600 font-semibold">Currently Speaking</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center min-h-[500px]">
      {/* Roundtable Surface */}
      <div className="relative w-96 h-96 bg-gradient-to-br from-amber-800 to-amber-900 
                      rounded-full shadow-2xl border-8 border-amber-700">
        
        {/* Wood grain effect */}
        <div className="absolute inset-2 bg-gradient-to-br from-amber-700 to-amber-800 
                        rounded-full opacity-60"></div>
        <div className="absolute inset-4 bg-gradient-to-br from-amber-600 to-amber-700 
                        rounded-full opacity-40"></div>
        
        {/* Center Topic Area */}
        <div className="absolute inset-8 bg-white rounded-full shadow-inner border-4 
                        border-gray-200 flex items-center justify-center p-4">
          {discussionStarted && currentTopic ? (
            <div className="text-center">
              <Brain className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {currentTopic.title}
              </h3>
              {currentTopic.category && (
                <span className="inline-block mt-2 px-2 py-1 bg-primary-100 text-primary-800 
                               text-xs font-medium rounded-full">
                  {currentTopic.category}
                </span>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                {participants.length < 1 
                  ? 'Waiting for participants...' 
                  : 'Preparing discussion...'}
              </p>
            </div>
          )}
        </div>

        {/* Participants as chairs around the table */}
        {participants.map((participant, index) => renderChair(participant, index))}
        
        {/* Empty chair indicators for visual balance */}
        {participants.length > 0 && participants.length < 8 && (
          <>
            {Array.from({ length: Math.max(0, 4 - participants.length) }, (_, index) => {
              const totalSlots = Math.max(4, participants.length + 1)
              const emptyIndex = participants.length + index
              const position = getChairPosition(emptyIndex, totalSlots)
              
              return (
                <div
                  key={`empty-${index}`}
                  className="absolute w-12 h-12 rounded-full border-4 border-dashed 
                           border-gray-300 bg-gray-100 opacity-50 transition-all duration-300"
                  style={position}
                  title="Waiting for participant"
                >
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    +
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Discussion Status */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                      bg-white px-4 py-2 rounded-full shadow-lg border">
        <div className="flex items-center space-x-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            discussionStarted ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}></div>
          <span className={discussionStarted ? 'text-green-700' : 'text-gray-600'}>
            {discussionStarted 
              ? `Discussion Active • ${participants.length} participants`
              : `Preparing • ${participants.length} joined`}
          </span>
        </div>
      </div>

      {/* Current Speaker Highlight */}
      {discussionStarted && currentSpeaker && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 
                        bg-green-100 border border-green-200 px-4 py-2 rounded-full">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800 font-medium">
              {currentSpeaker.anonymousName} is speaking
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoundtableView

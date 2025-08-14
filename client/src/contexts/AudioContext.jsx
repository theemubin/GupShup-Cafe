import React, { createContext, useContext, useState, useEffect } from 'react'

/**
 * Audio Context for managing WebRTC audio communication
 * Handles microphone access, audio streams, and peer connections
 */

const AudioContext = createContext()

/**
 * AudioProvider Component
 * Manages audio state and WebRTC functionality
 */
export function AudioProvider({ children }) {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [micPermission, setMicPermission] = useState(null) // null, 'granted', 'denied'
  const [localStream, setLocalStream] = useState(null)
  const [isMuted, setIsMuted] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)

  /**
   * Request microphone permission and get audio stream
   */
  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      setLocalStream(stream)
      setMicPermission('granted')
      setAudioEnabled(true)
      
      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream)
      
      return stream
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setMicPermission('denied')
      setAudioEnabled(false)
      return null
    }
  }

  /**
   * Set up audio level monitoring for visual feedback
   * @param {MediaStream} stream - Audio stream to monitor
   */
  const setupAudioLevelMonitoring = (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      microphone.connect(analyser)
      analyser.fftSize = 256

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average)
        
        if (audioEnabled) {
          requestAnimationFrame(updateAudioLevel)
        }
      }

      updateAudioLevel()
    } catch (error) {
      console.error('Error setting up audio level monitoring:', error)
    }
  }

  /**
   * Mute/unmute the microphone
   */
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  /**
   * Stop audio stream and cleanup
   */
  const stopAudio = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    setAudioEnabled(false)
    setIsMuted(true)
    setAudioLevel(0)
  }

  /**
   * Enable audio for speaking (unmute)
   */
  const enableSpeaking = () => {
    if (localStream && isMuted) {
      toggleMute()
    }
  }

  /**
   * Disable audio for speaking (mute)
   */
  const disableSpeaking = () => {
    if (localStream && !isMuted) {
      toggleMute()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [])

  // Check for browser support
  const isWebRTCSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  const value = {
    audioEnabled,
    micPermission,
    localStream,
    isMuted,
    audioLevel,
    isWebRTCSupported: isWebRTCSupported(),
    requestMicrophoneAccess,
    toggleMute,
    stopAudio,
    enableSpeaking,
    disableSpeaking
  }

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}

/**
 * Custom hook to use audio context
 * @returns {Object} Audio context value
 */
export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}


import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSocket } from './SocketContext'

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
  const [peers, setPeers] = useState({}) // map socketId -> RTCPeerConnection
  const { socket, connected } = useSocket()

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

      // If we have a socket connection, start signaling to peers
      if (socket && connected) {
        socket.emit('ready-for-webrtc')
      }
      
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
   * Setup handlers to create/accept peer connections using Socket.io for signaling
   */
  const setupPeerSignaling = () => {
    if (!socket) return

    // Handle incoming offers
    socket.on('webrtc-offer', async ({ from, sdp }) => {
      try {
        if (!localStream) {
          console.warn('Received WebRTC offer but no local stream available')
          return
        }
        
        console.log(`Received WebRTC offer from ${from}`)
        const pc = createPeerConnection(from, socket)
        
        // Add local stream tracks before creating answer
        localStream.getTracks().forEach(track => {
          console.log(`Adding track ${track.kind} to answer peer ${from}`)
          pc.addTrack(track, localStream)
        })
        
        await pc.setRemoteDescription({ type: 'offer', sdp })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        console.log(`Sending WebRTC answer to ${from}`)
        socket.emit('webrtc-answer', { to: from, sdp: answer.sdp })
      } catch (err) {
        console.error('Error handling webrtc-offer:', err)
      }
    })

    // Handle incoming answers
    socket.on('webrtc-answer', async ({ from, sdp }) => {
      try {
        const pc = peers[from]
        if (!pc) return
        await pc.setRemoteDescription({ type: 'answer', sdp })
      } catch (err) {
        console.error('Error handling webrtc-answer:', err)
      }
    })

    // Handle ICE candidates
    socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      try {
        const pc = peers[from]
        if (!pc || !candidate) return
        await pc.addIceCandidate(candidate)
      } catch (err) {
        console.error('Error adding remote ICE candidate:', err)
      }
    })

    // When a new participant list arrives, attempt to establish peer connections
    socket.on('participants-update', (updatedParticipants) => {
      try {
        const otherPeers = updatedParticipants.filter(p => p.socketId && p.socketId !== socket.id)
        otherPeers.forEach(p => {
          if (!peers[p.socketId] && localStream) {
            // create an offer to this peer
            const pc = createPeerConnection(p.socketId, socket)
            
            // Add local stream tracks to peer connection
            localStream.getTracks().forEach(track => {
              console.log(`Adding track ${track.kind} to peer ${p.socketId}`)
              pc.addTrack(track, localStream)
            })
            
            // Create and send offer
            pc.createOffer()
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                console.log(`Sending WebRTC offer to ${p.socketId}`)
                socket.emit('webrtc-offer', { to: p.socketId, sdp: pc.localDescription.sdp })
              })
              .catch(err => console.error('Error creating/sending offer:', err))
          }
        })
      } catch (err) {
        console.error('Error during participants-update handling for WebRTC:', err)
      }
    })
  }

  const createPeerConnection = (peerSocketId, socket) => {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]
    const pc = new RTCPeerConnection({ iceServers })

    // send local ICE candidates to the peer via server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { to: peerSocketId, candidate: event.candidate })
      }
    }

    // play remote tracks
    pc.ontrack = (event) => {
      try {
        console.log(`Received remote track from ${peerSocketId}:`, event.track.kind)
        const remoteStream = event.streams && event.streams[0]
        if (remoteStream) {
          // attach to an audio element and autoplay
          let audioEl = document.getElementById(`remote_audio_${peerSocketId}`)
          if (!audioEl) {
            audioEl = document.createElement('audio')
            audioEl.id = `remote_audio_${peerSocketId}`
            audioEl.autoplay = true
            audioEl.playsInline = true
            audioEl.controls = false // Hide controls but keep for debugging if needed
            audioEl.volume = 1.0
            audioEl.setAttribute('data-peer', peerSocketId)
            document.body.appendChild(audioEl)
            console.log(`Created audio element for peer ${peerSocketId}`)
          }
          
          audioEl.srcObject = remoteStream
          
          // Try to play with better error handling
          const playAttempt = audioEl.play()
          if (playAttempt && typeof playAttempt.catch === 'function') {
            playAttempt
              .then(() => {
                console.log(`Successfully playing audio from ${peerSocketId}`)
              })
              .catch((error) => {
                console.warn(`Autoplay blocked for ${peerSocketId}:`, error.message)
                // Add click listener to enable audio on user interaction
                const enableAudio = () => {
                  audioEl.play()
                    .then(() => {
                      console.log(`Audio started after user interaction for ${peerSocketId}`)
                      document.removeEventListener('click', enableAudio)
                    })
                    .catch(console.error)
                }
                document.addEventListener('click', enableAudio, { once: true })
              })
          }
        }
      } catch (err) {
        console.error(`Error handling ontrack event for ${peerSocketId}:`, err)
      }
    }

    // Add connection state change logging
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerSocketId} connection state:`, pc.connectionState)
    }

    // store pc
    setPeers(prev => ({ ...prev, [peerSocketId]: pc }))
    return pc
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

  // Setup peer signaling when socket is available
  useEffect(() => {
    if (socket && connected) {
      setupPeerSignaling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected])

  // Check for browser support
  const isWebRTCSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  // Enable audio playback for all remote streams (call this on user interaction)
  const enableAudioPlayback = () => {
    const audioElements = document.querySelectorAll('audio[data-peer]')
    audioElements.forEach(audioEl => {
      audioEl.play().catch(console.error)
    })
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
    disableSpeaking,
    enableAudioPlayback
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

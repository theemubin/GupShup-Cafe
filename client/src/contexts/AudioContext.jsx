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
  const { socket, connected } = useSocket()
  // Track if we have already signaled WebRTC readiness
  const [webrtcReadySignaled, setWebrtcReadySignaled] = useState(false)

  useEffect(() => {
    if (socket) {
      console.log('[Audio][Debug] Socket object available', socket)
      socket.on('connect', () => {
        console.log('[Audio][Debug] Socket connected:', socket.id)
      })
      socket.on('disconnect', () => {
        console.log('[Audio][Debug] Socket disconnected')
      })
    }
  }, [socket])

  const [audioEnabled, setAudioEnabled] = useState(false)
  const [micPermission, setMicPermission] = useState(null) // null, 'granted', 'denied'
  const [localStream, setLocalStream] = useState(null)
  const [isMuted, setIsMuted] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)
  const [peers, setPeers] = useState({}) // map socketId -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState({}) // map socketId -> MediaStream
  const [userRole, setUserRole] = useState('listener') // Track user's current role
  const localStreamRef = React.useRef(null)

  /**
   * Request microphone permission and get audio stream
   * Only allowed for speakers
   */
  // Request microphone access and set up local stream ONCE per session
  const requestMicrophoneAccess = async () => {
    console.log('[Audio] requestMicrophoneAccess called');
    
    if (localStreamRef.current) {
      console.log('[Audio] Using existing local stream');
      setMicPermission('granted')
      setAudioEnabled(true)
      return localStreamRef.current
    }
    
    try {
      console.log('[Audio] Requesting microphone access from browser');
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          sampleSize: 16,
          channelCount: 1,
          latency: 0.01,
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          googAudioMirroring: false
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints)
      console.log('[Audio] Microphone access granted, stream:', stream);
      localStreamRef.current = stream
      setLocalStream(stream)
      setMicPermission('granted')
      setAudioEnabled(true)
      setupAudioLevelMonitoring(stream)
      // Do not emit 'ready-for-webrtc' here; emit only after both localStream and participants-update are ready
      return stream
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setMicPermission('denied')
      setAudioEnabled(false)
      return null
    }
  }

  /**
   * Update user role and handle audio stream accordingly
   * @param {string} newRole - New role ('speaker' or 'listener')
   */
  // Only update role, do not destroy local stream
  const updateUserRole = async (newRole) => {
    console.log(`[Audio] Updating user role from ${userRole} to ${newRole}`)
    setUserRole(newRole)
    if (newRole === 'speaker') {
      await requestMicrophoneAccess()
    }
    // Do not stop or destroy the local stream on demotion
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
   * Mute/unmute the microphone (always available if mic is granted)
   */
  const toggleMute = () => {
    const stream = localStreamRef.current || localStream
    if (stream) {
      const audioTracks = stream.getAudioTracks()
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
        console.log(`Received WebRTC offer from ${from}`)
        const pc = createPeerConnection(from, socket)
        
        // Add local stream tracks if we're a speaker (simplified from broadcast test)
        if (localStream && userRole === 'speaker') {
          console.log(`[Audio] Adding ${localStream.getTracks().length} tracks to peer ${from}`)
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream)
          })
        } else {
          console.log(`[Audio] Not adding tracks - Role: ${userRole}, Stream: ${!!localStream}`)
        }
        
        await pc.setRemoteDescription({ type: 'offer', sdp })
        
        // Create answer with audio-only constraints
        const answerOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false, // Audio-only optimization
          voiceActivityDetection: true
        }
        
        const answer = await pc.createAnswer(answerOptions)
        // Set local description (simplified from broadcast test)
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
        console.log(`[Audio] Participants update received. Total: ${updatedParticipants.length}, My role: ${userRole}, Local stream: ${!!localStream}`)
        // Only emit 'ready-for-webrtc' after both localStream and participants-update are ready, and only once
        if (localStream && !webrtcReadySignaled) {
          setWebrtcReadySignaled(true)
          console.log('[Audio] Emitting ready-for-webrtc after both localStream and participants-update')
          socket.emit('ready-for-webrtc')
        }
        const otherPeers = updatedParticipants.filter(p => p.socketId && p.socketId !== socket.id)
        console.log(`[Audio] Other peers: ${otherPeers.length}`)
        otherPeers.forEach(p => {
          console.log(`[Audio] Processing peer ${p.socketId}, role: ${p.role || 'unknown'}`)
          // Only create connections if we are a speaker with local stream, or if the other peer is a speaker
          if (!peers[p.socketId]) {
            const pc = createPeerConnection(p.socketId, socket)
            
            // Add our tracks if we're a speaker (simplified from broadcast test)  
            if (localStream && userRole === 'speaker') {
              console.log(`[Audio] Adding ${localStream.getTracks().length} tracks to peer ${p.socketId}`)
              localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream)
              })
              
              // Create and send offer with audio-only constraints
              const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: false, // Audio-only optimization
                voiceActivityDetection: true
              }
              
              pc.createOffer(offerOptions)
                .then(offer => {
                  // Set local description (simplified from broadcast test)
                  return pc.setLocalDescription(offer)
                })
                .then(() => {
                  console.log(`Sending optimized WebRTC offer to ${p.socketId}`)
                  socket.emit('webrtc-offer', { to: p.socketId, sdp: pc.localDescription.sdp })
                })
                .catch(err => console.error('Error creating/sending offer:', err))
            }
            // If we're a listener, we'll just wait for offers from speakers
          }
        })
      } catch (err) {
        console.error('Error during participants-update handling for WebRTC:', err)
      }
    })

    // Handle role changes
    socket.on('role-changed', ({ userId, newRole, participants }) => {
      try {
        // If this is our role change, update our audio capabilities
        if (socket.id && participants) {
          const ourParticipant = participants.find(p => p.socketId === socket.id)
          if (ourParticipant && ourParticipant.role !== userRole) {
            console.log(`[Audio] Role changed to ${ourParticipant.role}`)
            updateUserRole(ourParticipant.role)
          }
        }
      } catch (err) {
        console.error('Error handling role change:', err)
      }
    })

    // Handle successful role change confirmation
    socket.on('role-change-success', ({ newRole }) => {
      console.log(`[Audio] Role change confirmed: ${newRole}`)
      updateUserRole(newRole)
    })

    // Handle role change errors
    socket.on('role-change-error', ({ message }) => {
      console.error(`[Audio] Role change failed: ${message}`)
    })
  }

  /**
   * Optimize SDP for audio-only communication
   * @param {RTCSessionDescription} sessionDescription - Original SDP
   * @returns {RTCSessionDescription} Optimized SDP
   */
  const optimizeAudioSDP = (sessionDescription) => {
    let sdp = sessionDescription.sdp
    
    // Remove video-related lines
    sdp = sdp.replace(/m=video.*\r?\n/g, '')
    sdp = sdp.replace(/a=rtcp-fb:.*\r?\n/g, '')
    sdp = sdp.replace(/a=fmtp:.*profile-level-id.*\r?\n/g, '')
    
    // Prioritize Opus codec for better voice quality
    const opusCodecRegex = /a=rtpmap:(\d+) opus\/48000\/2\r?\n/
    const opusMatch = sdp.match(opusCodecRegex)
    
    if (opusMatch) {
      const opusPayloadType = opusMatch[1]
      
      // Find and modify m=audio line to prioritize Opus
      const audioLineRegex = /m=audio \d+ UDP\/TLS\/RTP\/SAVPF (.+)\r?\n/
      const audioMatch = sdp.match(audioLineRegex)
      
      if (audioMatch) {
        const payloadTypes = audioMatch[1].split(' ')
        const reorderedTypes = [opusPayloadType, ...payloadTypes.filter(pt => pt !== opusPayloadType)]
        const port = audioMatch[0].split(' ')[1]
        sdp = sdp.replace(audioLineRegex, `m=audio ${port} UDP/TLS/RTP/SAVPF ${reorderedTypes.join(' ')}\r\n`)
      }
      
      // Add Opus-specific optimizations
      const opusSettings = `a=fmtp:${opusPayloadType} minptime=10;useinbandfec=1;usedtx=1\r\n`
      if (!sdp.includes(opusSettings)) {
        sdp = sdp.replace(opusMatch[0], opusMatch[0] + opusSettings)
      }
    }
    
    // Add audio quality settings
    sdp += 'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n'
    
    return new RTCSessionDescription({
      type: sessionDescription.type,
      sdp: sdp
    })
  }

  const createPeerConnection = (peerSocketId, socket) => {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
    
    // Audio-optimized peer connection configuration
    const config = {
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
      // Audio-specific optimizations
      sdpSemantics: 'unified-plan'
    }
    
    const pc = new RTCPeerConnection(config)

    // send local ICE candidates to the peer via server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { to: peerSocketId, candidate: event.candidate })
      }
    }

    // Handle incoming remote streams (from broadcast test pattern)
    pc.ontrack = (event) => {
      try {
        console.log(`[Audio][Debug] ontrack event for peer: ${peerSocketId}`)
        const remoteStream = event.streams[0]
        if (remoteStream) {
          // Store remote stream in state for UI components
          setRemoteStreams(prev => ({ ...prev, [peerSocketId]: remoteStream }))
          // Optionally, also play audio for debugging (hidden)
          const audioElement = document.createElement('audio')
          audioElement.srcObject = remoteStream
          audioElement.autoplay = true
          audioElement.controls = false
          audioElement.id = `remote-audio-${peerSocketId}`
          audioElement.volume = 1.0
          let container = document.getElementById('remote-audio-container')
          if (!container) {
            container = document.createElement('div')
            container.id = 'remote-audio-container'
            container.style.display = 'none'
            document.body.appendChild(container)
          }
          const oldElement = document.getElementById(`remote-audio-${peerSocketId}`)
          if (oldElement) {
            oldElement.remove()
          }
          container.appendChild(audioElement)
        } else {
          console.warn(`[Audio][Debug] No remoteStream found in ontrack for peer: ${peerSocketId}`)
        }
      } catch (err) {
        console.error(`[Audio][Debug] Error handling ontrack event for ${peerSocketId}:`, err)
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }
    setAudioEnabled(false)
    setIsMuted(true)
    setAudioLevel(0)
  }

  /**
   * Enable audio for speaking (unmute)
   */
  const enableSpeaking = async () => {
    console.log('[Audio] enableSpeaking called');
    console.log('[Audio] Current state:', { localStream: !!localStream, isMuted, userRole });
    
    // Request microphone access if we don't have a local stream yet
    if (!localStream) {
      console.log('[Audio] Requesting microphone access for speaking')
      await requestMicrophoneAccess()
    }
    
    // Update user role to speaker
    updateUserRole('speaker')
    
    // Unmute if we're muted
    if (isMuted) {
      console.log('[Audio] Unmuting microphone');
      toggleMute()
    }
    
    console.log('[Audio] enableSpeaking completed');
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

  // On mount, set up local stream ONCE if user is speaker
  useEffect(() => {
    if (userRole === 'speaker' && !localStreamRef.current) {
      requestMicrophoneAccess()
    }
  }, [userRole])

  // Setup peer signaling when socket is available
  useEffect(() => {
    if (socket && connected) {
      setupPeerSignaling()
    }
  }, [socket, connected, userRole])

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
    userRole,
    remoteStreams,
    isWebRTCSupported: isWebRTCSupported(),
    requestMicrophoneAccess,
    updateUserRole,
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
    // Return default values instead of throwing error to prevent crashes
    console.warn('useAudio called outside AudioProvider, returning defaults')
    return {
      audioEnabled: false,
      micPermission: null,
      localStream: null,
      isMuted: true,
      audioLevel: 0,
      userRole: 'listener',
      isWebRTCSupported: false,
      requestMicrophoneAccess: () => Promise.resolve(null),
      updateUserRole: () => {},
      toggleMute: () => {},
      stopAudio: () => {},
      enableSpeaking: () => {},
      disableSpeaking: () => {},
      enableAudioPlayback: () => {}
    }
  }
  return context
}

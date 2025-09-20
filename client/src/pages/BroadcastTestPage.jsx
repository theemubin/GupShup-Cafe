import React, { useState, useEffect, useRef } from 'react'
import { useSocket } from '../contexts/SocketContext'

/**
 * Simple Broadcast Test Page
 * First person to join becomes broadcaster, others become listeners
 * No complex role logic - just pure WebRTC audio testing
 */
export default function BroadcastTestPage() {
  const [isBroadcaster, setIsBroadcaster] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [localStream, setLocalStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  
  const { socket, connected } = useSocket()
  const peersRef = useRef({})
  const localAudioRef = useRef()

  // Join test room on mount
  useEffect(() => {
    if (connected && socket) {
      console.log('[BroadcastTest] Joining broadcast test room...')
      socket.emit('join-broadcast-test')
      
      // Socket event listeners
      socket.on('broadcast-test-role', (role) => {
        console.log('[BroadcastTest] Assigned role:', role)
        setIsBroadcaster(role === 'broadcaster')
        if (role === 'broadcaster') {
          startBroadcasting()
        }
      })

      socket.on('broadcast-test-participants', (participantList) => {
        console.log('[BroadcastTest] Participants:', participantList)
        setParticipants(participantList)
      })

      socket.on('webrtc-offer', handleOffer)
      socket.on('webrtc-answer', handleAnswer)
      socket.on('webrtc-ice-candidate', handleIceCandidate)

      return () => {
        socket.off('broadcast-test-role')
        socket.off('broadcast-test-participants')
        socket.off('webrtc-offer')
        socket.off('webrtc-answer')
        socket.off('webrtc-ice-candidate')
      }
    }
  }, [connected, socket])

  // Start broadcasting (get mic and create connections)
  const startBroadcasting = async () => {
    try {
      console.log('[BroadcastTest] Starting broadcast...')
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      setLocalStream(stream)
      setAudioEnabled(true)
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream
      }
      
      console.log('[BroadcastTest] Microphone access granted')
      
      // Signal ready for WebRTC
      socket.emit('broadcaster-ready')
      
    } catch (error) {
      console.error('[BroadcastTest] Microphone access failed:', error)
      alert('Microphone access failed. Please allow microphone access and refresh.')
    }
  }

  // Create peer connection
  const createPeerConnection = (targetSocketId) => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    const pc = new RTCPeerConnection(config)
    peersRef.current[targetSocketId] = pc

    // Add local stream to connection (broadcaster only)
    if (isBroadcaster && localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }

    // Handle incoming stream (listeners only)
    pc.ontrack = (event) => {
      console.log('[BroadcastTest] Received remote stream')
      const remoteStream = event.streams[0]
      
      // Create audio element for remote stream
      const audioElement = document.createElement('audio')
      audioElement.srcObject = remoteStream
      audioElement.autoplay = true
      audioElement.controls = false
      audioElement.id = `remote-audio-${targetSocketId}`
      
      // Add to DOM
      const container = document.getElementById('remote-audio-container')
      if (container) {
        container.appendChild(audioElement)
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        })
      }
    }

    return pc
  }

  // Handle WebRTC offer (listener receives from broadcaster)
  const handleOffer = async ({ fromSocketId, offer }) => {
    console.log('[BroadcastTest] Received offer from:', fromSocketId)
    
    const pc = createPeerConnection(fromSocketId)
    
    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    socket.emit('webrtc-answer', {
      targetSocketId: fromSocketId,
      answer
    })
  }

  // Handle WebRTC answer (broadcaster receives from listener)
  const handleAnswer = async ({ fromSocketId, answer }) => {
    console.log('[BroadcastTest] Received answer from:', fromSocketId)
    
    const pc = peersRef.current[fromSocketId]
    if (pc) {
      await pc.setRemoteDescription(answer)
    }
  }

  // Handle ICE candidates
  const handleIceCandidate = async ({ fromSocketId, candidate }) => {
    const pc = peersRef.current[fromSocketId]
    if (pc) {
      await pc.addIceCandidate(candidate)
    }
  }

  // Create offer to listener (broadcaster initiates)
  const createOfferToListener = async (listenerSocketId) => {
    console.log('[BroadcastTest] Creating offer to listener:', listenerSocketId)
    
    const pc = createPeerConnection(listenerSocketId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    socket.emit('webrtc-offer', {
      targetSocketId: listenerSocketId,
      offer
    })
  }

  // Handle new listener joining (broadcaster creates offer)
  useEffect(() => {
    if (socket) {
      socket.on('new-listener-joined', ({ socketId }) => {
        if (isBroadcaster && localStream) {
          console.log('[BroadcastTest] New listener joined:', socketId)
          createOfferToListener(socketId)
        }
      })

      return () => {
        socket.off('new-listener-joined')
      }
    }
  }, [isBroadcaster, localStream, socket])

  // Toggle mute
  const toggleMute = () => {
    if (localStream && isBroadcaster) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🎤 Broadcast Test</h1>
          <p className="text-blue-200 text-lg">
            Simple audio broadcast - First person speaks, others listen
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-2">
                {isBroadcaster ? '📡' : '👂'}
              </div>
              <div className="text-white font-semibold">
                {isBroadcaster ? 'BROADCASTER' : 'LISTENER'}
              </div>
              <div className="text-blue-200 text-sm">
                {isBroadcaster ? 'You are speaking' : 'You are listening'}
              </div>
            </div>
            
            <div>
              <div className="text-2xl mb-2">
                {audioEnabled ? '🎵' : '🔇'}
              </div>
              <div className="text-white font-semibold">
                {audioEnabled ? 'AUDIO ON' : 'AUDIO OFF'}
              </div>
              <div className="text-blue-200 text-sm">
                {isBroadcaster ? 'Microphone' : 'Speakers'}
              </div>
            </div>
            
            <div>
              <div className="text-2xl mb-2">👥</div>
              <div className="text-white font-semibold">
                {participants.length} USERS
              </div>
              <div className="text-blue-200 text-sm">
                In broadcast
              </div>
            </div>
          </div>
        </div>

        {/* Broadcaster Controls */}
        {isBroadcaster && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">🎤 Broadcaster Controls</h3>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleMute}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <span>{isMuted ? '🔇' : '🎤'}</span>
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-blue-200">
                🗣️ Speak now - listeners should hear you!
              </p>
            </div>
          </div>
        )}

        {/* Listener Info */}
        {!isBroadcaster && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">👂 Listener Mode</h3>
            <div className="text-center">
              <p className="text-blue-200 mb-4">
                You should hear audio from the broadcaster automatically.
              </p>
              <div className="text-yellow-300 text-lg">
                🔊 Make sure your speakers/headphones are on!
              </div>
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-white text-xl font-semibold mb-4">👥 Participants</h3>
          {participants.length === 0 ? (
            <p className="text-blue-200">No participants yet...</p>
          ) : (
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={participant.socketId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {participant.role === 'broadcaster' ? '📡' : '👂'}
                    </div>
                    <div>
                      <div className="text-white font-medium">{participant.username || `User ${index + 1}`}</div>
                      <div className="text-blue-200 text-sm capitalize">{participant.role}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    participant.role === 'broadcaster' 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {participant.role}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h4 className="text-yellow-300 font-semibold mb-2">🧪 How to Test:</h4>
          <ol className="text-yellow-200 space-y-1 text-sm">
            <li>1. Open this page in first browser tab → You become BROADCASTER</li>
            <li>2. Open same page in second browser tab → You become LISTENER</li>
            <li>3. Allow microphone in first tab, speak into mic</li>
            <li>4. Check if you hear audio in second tab</li>
            <li>5. Check browser console (F12) for WebRTC connection logs</li>
          </ol>
        </div>

        {/* Hidden elements */}
        <audio ref={localAudioRef} muted style={{ display: 'none' }} />
        <div id="remote-audio-container" style={{ display: 'none' }}></div>
      </div>
    </div>
  )
}
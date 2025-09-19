import React, { useEffect, useRef, useState } from 'react';

export default function LiveAudioLevelBar({ stream = null, showLabel = true }) {
  const [level, setLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const animationRef = useRef();

  useEffect(() => {
    let audioContext, analyser, dataArray;

    async function setup() {
      try {
        // Use provided stream or get user media
        const audioStream = stream || await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        setIsActive(true);

        function update() {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          // Get average volume (0-255)
          const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
          // Convert to percentage (0-100)
          const percentage = Math.min((avg / 255) * 100, 100);
          setLevel(percentage);
          animationRef.current = requestAnimationFrame(update);
        }
        update();
      } catch (error) {
        console.warn('Failed to setup audio level monitoring:', error);
        setIsActive(false);
      }
    }

    setup();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContext) audioContext.close();
      setIsActive(false);
    };
  }, [stream]);

  if (!isActive) {
    return showLabel ? (
      <div className="text-xs text-gray-500">Audio unavailable</div>
    ) : null;
  }

  const isSpeaking = level > 15; // Threshold for speaking detection

  return (
    <div className="flex items-center space-x-2">
      {showLabel && (
        <span className="text-xs text-gray-600">
          {isSpeaking ? '🎤 Speaking' : '🔇 Quiet'}
        </span>
      )}
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-150 rounded-full ${
            isSpeaking ? 'bg-green-500' : 'bg-yellow-400'
          }`}
          style={{ width: `${Math.max(level, 5)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8">
        {Math.round(level)}%
      </span>
    </div>
  );
}

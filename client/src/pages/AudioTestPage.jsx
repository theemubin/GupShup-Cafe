import React, { useState } from 'react';
import LiveAudioLevelBar from '../components/LiveAudioLevelBar';

export default function AudioTestPage() {
  const [audioStream, setAudioStream] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const startAudioTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setAudioStream(stream);
      setIsListening(true);
    } catch (error) {
      console.error('Failed to access microphone:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopAudioTest = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    setIsListening(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Audio Test
        </h2>
        
        <div className="space-y-4">
          {!isListening ? (
            <button
              onClick={startAudioTest}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              🎤 Start Audio Test
            </button>
          ) : (
            <button
              onClick={stopAudioTest}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              🛑 Stop Audio Test
            </button>
          )}

          {isListening && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-gray-700">Live Audio Level:</h3>
              <LiveAudioLevelBar stream={audioStream} showLabel={true} />
              <p className="text-sm text-gray-600 mt-2">
                Speak into your microphone to see the level change!
              </p>
            </div>
          )}

          <div className="text-sm text-gray-500">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click "Start Audio Test" to begin</li>
              <li>Allow microphone access when prompted</li>
              <li>Speak to see the audio level bar animate</li>
              <li>Green = speaking, Yellow = quiet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
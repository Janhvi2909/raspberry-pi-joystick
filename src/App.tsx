import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Joystick from './components/Joystick';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const [speedValue, setSpeedValue] = useState<number>(0);
  const [directionValue, setDirectionValue] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const { status, sendMessage, disconnect } = useWebSocket('ws://localhost:8765');

  // Throttle the WebSocket messages to prevent flooding
  const throttleRef = useRef<NodeJS.Timeout>();
  const throttleDelay = 50; // ms

  const throttledSendMessage = (message: string) => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }
    throttleRef.current = setTimeout(() => {
      sendMessage(message);
    }, throttleDelay);
  };

  // Clean up throttle timeout
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  const handleSpeedChange = (value: number) => {
    setSpeedValue(value);
    throttledSendMessage(JSON.stringify({ type: 'speed', value }));
  };

  const handleDirectionChange = (x: number, y: number) => {
    setDirectionValue({ x, y });
    throttledSendMessage(JSON.stringify({ type: 'direction', x, y }));
  };

  // Get appropriate status message and color
  const getStatusDisplay = () => {
    if (status.connected) {
      return { message: 'Connected', color: '#4CAF50' };
    }
    if (status.reconnecting) {
      return { message: status.error || 'Reconnecting...', color: '#FFA726' };
    }
    return { message: status.error || 'Disconnected', color: '#F44336' };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="app">
      <h1>Robot Controller</h1>
      <div 
        className="status"
        style={{ 
          backgroundColor: statusDisplay.color,
          color: '#fff',
          transition: 'background-color 0.3s'
        }}
      >
        {statusDisplay.message}
      </div>
      
      <div className="controls-container">
        <div className="control-section">
          <h2>Speed Control</h2>
          <Joystick
            isSpeedControl
            onChange={handleSpeedChange}
            deadZone={5}
          />
          <div className="status">Speed: {Math.round(speedValue)}%</div>
        </div>

        <div className="control-section">
          <h2>Direction Control</h2>
          <Joystick
            onChange={(x, y) => handleDirectionChange(x, y)}
            deadZone={2}
          />
          <div className="status">
            X: {Math.round(directionValue.x)}%, Y: {Math.round(directionValue.y)}%
          </div>
        </div>
      </div>

      {!status.connected && !status.reconnecting && (
        <button
          className="reconnect-button"
          onClick={() => window.location.reload()}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}

export default App; 
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface JoystickProps {
  isSpeedControl?: boolean;
  onChange: (x: number, y: number) => void;
  deadZone?: number; // Percentage (0-100) for dead zone
}

const Joystick: React.FC<JoystickProps> = ({ 
  isSpeedControl = false, 
  onChange,
  deadZone = 5 // 5% dead zone by default
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [lastValidPosition, setLastValidPosition] = useState({ x: 0, y: 0 });
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  // Update center position when container size changes
  useEffect(() => {
    const updateCenter = () => {
      if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        setCenter({
          x: bounds.width / 2,
          y: bounds.height / 2
        });
      }
    };

    updateCenter();
    window.addEventListener('resize', updateCenter);
    return () => window.removeEventListener('resize', updateCenter);
  }, []);

  // Clean up animation frame
  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const applyDeadZone = useCallback((value: number, maxValue: number): number => {
    const deadZoneThreshold = (deadZone / 100) * maxValue;
    if (Math.abs(value) < deadZoneThreshold) {
      return 0;
    }
    // Adjust the value to make it smoother after dead zone
    const adjustedValue = (Math.abs(value) - deadZoneThreshold) / (maxValue - deadZoneThreshold) * maxValue;
    return value > 0 ? adjustedValue : -adjustedValue;
  }, [deadZone]);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      if (!isActive) {
        // Smooth return to center when released
        const dx = -lastValidPosition.x * 0.2;
        const dy = -lastValidPosition.y * 0.2;
        
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
          setLastValidPosition({ x: 0, y: 0 });
          onChange(0, 0);
          if (knobRef.current) {
            knobRef.current.style.transform = `translate(-50%, -50%)`;
          }
          return;
        }

        const newX = lastValidPosition.x + dx;
        const newY = lastValidPosition.y + dy;
        setLastValidPosition({ x: newX, y: newY });
        
        if (knobRef.current) {
          knobRef.current.style.transform = `translate(calc(-50% + ${newX}px), calc(-50% + ${newY}px))`;
        }
      }
    }

    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [isActive, lastValidPosition, onChange]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      if (knobRef.current) {
        setIsActive(true);
        knobRef.current.setPointerCapture(e.pointerId);
        handlePointerMove(e);
      }
    } catch (error) {
      console.error('Error in handlePointerDown:', error);
    }
  };

  const handlePointerUp = () => {
    try {
      setIsActive(false);
    } catch (error) {
      console.error('Error in handlePointerUp:', error);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    try {
      if (!isActive || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const deltaX = isSpeedControl ? 0 : (x - center.x);
      const deltaY = y - center.y;
      const angle = Math.atan2(deltaY, deltaX);
      const maxRadius = center.x - (knobRef.current?.offsetWidth || 0) / 2;
      const distance = Math.min(maxRadius, Math.hypot(deltaX, deltaY));

      let xPos = Math.cos(angle) * distance;
      let yPos = Math.sin(angle) * distance;

      if (isSpeedControl) {
        xPos = 0;
      }

      // Apply dead zone
      xPos = applyDeadZone(xPos, maxRadius);
      yPos = applyDeadZone(yPos, maxRadius);

      setLastValidPosition({ x: xPos, y: yPos });

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
      }

      // Calculate percentage values (-100 to 100)
      const xPercent = (xPos / maxRadius) * 100;
      const yPercent = -(yPos / maxRadius) * 100;

      onChange(isSpeedControl ? yPercent : xPercent, isSpeedControl ? 0 : yPercent);
    } catch (error) {
      console.error('Error in handlePointerMove:', error);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="joystick-container"
      style={{ touchAction: 'none' }} // Prevent scrolling on touch devices
    >
      <div className={isSpeedControl ? "speed-base" : "direction-base"}></div>
      <div className={isSpeedControl ? "speed-ring-1" : "direction-ring-1"}></div>
      <div className={isSpeedControl ? "speed-ring-2" : "direction-ring-2"}></div>
      {isSpeedControl ? (
        <div className="speed-guide"></div>
      ) : (
        <>
          <div className="direction-guide-x"></div>
          <div className="direction-guide-y"></div>
        </>
      )}
      <div
        ref={knobRef}
        className={`joystick-knob ${isActive ? 'active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      ></div>
    </div>
  );
};

export default Joystick; 
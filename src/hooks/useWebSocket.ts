import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketStatus {
  connected: boolean;
  error: string | null;
  reconnecting: boolean;
}

export const useWebSocket = (url: string, reconnectDelay: number = 3000) => {
  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    error: null,
    reconnecting: false
  });
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('Connected to robot!');
        setStatus({
          connected: true,
          error: null,
          reconnecting: false
        });
        reconnectAttemptsRef.current = 0;
      };

      socket.onclose = (event) => {
        console.log('Disconnected from robot:', event.code, event.reason);
        setStatus(prev => ({
          ...prev,
          connected: false,
          error: `Connection closed (${event.code})`
        }));

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000) {
          handleReconnect();
        }
      };

      socket.onerror = (error) => {
        console.error('Socket connection error:', error);
        setStatus(prev => ({
          ...prev,
          connected: false,
          error: 'Connection error occurred'
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.current = socket;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setStatus({
        connected: false,
        error: 'Failed to create connection',
        reconnecting: false
      });
    }
  }, [url]);

  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setStatus(prev => ({
        ...prev,
        reconnecting: false,
        error: 'Max reconnection attempts reached'
      }));
      return;
    }

    setStatus(prev => ({
      ...prev,
      reconnecting: true,
      error: `Reconnecting... (Attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      connect();
    }, reconnectDelay);
  }, [connect, reconnectDelay]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(message);
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        return false;
      }
    }
    return false;
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close(1000, 'Intentional disconnect');
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setStatus({
      connected: false,
      error: null,
      reconnecting: false
    });
  }, []);

  return {
    status,
    sendMessage,
    disconnect
  };
}; 
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { socketService } from '../services/socket';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection on mount
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  const connect = () => {
    if (socketService.getSocket()?.connected) {
      setIsConnected(true);
      setSocket(socketService.getSocket());
      return;
    }

    socketService.connect();
    const socketInstance = socketService.getSocket();
    
    if (socketInstance) {
      setSocket(socketInstance);
      
      socketInstance.on('connect', () => {
        setIsConnected(true);
        toast.success('Connected to server', {
          duration: 2000,
          position: 'bottom-right',
        });
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        toast.error('Disconnected from server', {
          duration: 2000,
          position: 'bottom-right',
        });
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Make socket available globally for debugging
      if (typeof window !== 'undefined') {
        (window as any).io = socketInstance;
      }
    }
  };

  const disconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
    setSocket(null);
    
    // Remove global reference
    if (typeof window !== 'undefined') {
      delete (window as any).io;
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    connect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
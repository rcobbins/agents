import { io, Socket } from 'socket.io-client';

// Vite uses import.meta.env instead of process.env
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinProject(projectId: string): void {
    if (this.socket) {
      this.socket.emit('join:project', projectId);
    }
  }

  leaveProject(projectId: string): void {
    if (this.socket) {
      this.socket.emit('leave:project', projectId);
    }
  }

  launchAgent(projectId: string, agentType: string, config?: any): void {
    if (this.socket) {
      this.socket.emit('agent:launch', { projectId, agentType, config });
    }
  }

  stopAgent(projectId: string, agentId: string): void {
    if (this.socket) {
      this.socket.emit('agent:stop', { projectId, agentId });
    }
  }

  sendMessage(data: {
    projectId: string;
    from: string;
    to: string;
    type: string;
    content: any;
  }): void {
    if (this.socket) {
      this.socket.emit('message:send', data);
    }
  }

  updateGoal(projectId: string, goalId: string, update: any): void {
    if (this.socket) {
      this.socket.emit('goal:update', { projectId, goalId, update });
    }
  }

  startWatching(projectId: string, path: string): void {
    if (this.socket) {
      this.socket.emit('watch:start', { projectId, path });
    }
  }

  stopWatching(projectId: string): void {
    if (this.socket) {
      this.socket.emit('watch:stop', { projectId });
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
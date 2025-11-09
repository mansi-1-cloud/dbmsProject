import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { authService } from '../services/AuthService.js';

let io: Server;

export const initializeWebSocket = (server: HTTPServer) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());
  
  console.log('🌐 WebSocket CORS enabled for:', allowedOrigins);
  
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = authService.verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    console.log(`✅ User connected: ${user.email} (${user.role})`);

    // Join user to their personal room
    if (user.role === 'USER') {
      socket.join(`user:${user.id}`);
    } else if (user.role === 'VENDOR') {
      socket.join(`vendor:${user.id}`);
    }

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.email}`);
    });

    // Heartbeat for keeping connection alive
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  try {
    console.log(`📤 Emitting to user ${userId}: ${event}`);
    getIO().to(`user:${userId}`).emit(event, data);
  } catch (error) {
    console.error('Error emitting to user:', error);
  }
};

export const emitToVendor = (vendorId: string, event: string, data: any) => {
  try {
    console.log(`📤 Emitting to vendor ${vendorId}: ${event}`);
    getIO().to(`vendor:${vendorId}`).emit(event, data);
  } catch (error) {
    console.error('Error emitting to vendor:', error);
  }
};

export const broadcast = (event: string, data: any) => {
  try {
    getIO().emit(event, data);
  } catch (error) {
    console.error('Error broadcasting:', error);
  }
};

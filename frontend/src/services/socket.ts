import { io, Socket } from 'socket.io-client';
import { getDefaultStore } from 'jotai';
import { tokenAtom } from '../store/authAtoms';

const RAW_SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
const DISABLE_WEBSOCKET = import.meta.env.VITE_DISABLE_WEBSOCKET === 'true';

const store = getDefaultStore();

type EmitQueueItem = { event: string; data?: any };

class SocketService {
  private socket: Socket | null = null;
  private heartbeatTimer: number | null = null;
  private emitQueue: EmitQueueItem[] = [];

  /** Create normalized URL: convert http -> ws and https -> wss if not provided */
  private getSocketUrl() {
    try {
      const u = new URL(RAW_SOCKET_URL);
      if (!u.protocol || u.protocol === ':') return RAW_SOCKET_URL;
      if (u.protocol.startsWith('http')) {
        u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        return u.toString();
      }
      return RAW_SOCKET_URL;
    } catch (e) {
      return RAW_SOCKET_URL;
    }
  }

  connect() {
    if (DISABLE_WEBSOCKET) {
      console.log('⚠️ WebSocket disabled by env');
      return;
    }

    const token = store.get(tokenAtom);
    if (!token) {
      console.warn('No token available — socket will not connect until token exists');
      return;
    }

    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }

    // Ensure any previous socket cleaned
    this.cleanup();

    const url = this.getSocketUrl();

    // Use socket.io built-in reconnection with exponential backoff
    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected', this.socket?.id);
      // flush queued emits
      this.emitQueue.forEach(it => this.emit(it.event, it.data));
      this.emitQueue = [];
      // heartbeat (client-initiated ping) — optional; socket.io has own heartbeat
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.stopHeartbeat();
      // If the disconnect was auth-related, you might want to try reconnect after token refresh
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connect_error:', err.message || err);
      // If server rejects auth, you can attempt to refresh token logic here
    });

    // Example server 'pong' listener (if you implement ping-pong custom events)
    this.socket.on('pong', () => {
      // optional latency handling
    });

    // If token can change while page is open, listen to store updates and reconnect automatically
    // (Optional — only if your app might update token after initial load)
    // store.sub((get) => { if token changed -> this.reconnectWithToken(newToken) })
  }

  /** Disconnect but mark as manual so auto-reconnect attempts can be suppressed if desired */
  disconnect(_manual = true) {
    if (this.socket) {
      this.socket.disconnect();
      this.cleanup();
    }
  }

  /** Clean local resources (timers, event handlers kept by socket.io are removed by disconnect()) */
  private cleanup() {
    this.stopHeartbeat();
    // don't null socket here until after disconnect to avoid removing handlers prematurely
    this.socket = null;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // using window.setInterval to get numeric id for clearInterval
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.connected) this.socket.emit('ping_from_client');
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any) {
    // If not connected, queue emits (useful for quick client actions immediately after login)
    if (!this.socket || !this.socket.connected) {
      this.emitQueue.push({ event, data });
      return;
    }
    this.socket.emit(event, data);
  }

  isConnected() {
    return !!(this.socket && this.socket.connected);
  }

  /** Use when token changed (refresh) to reconnect with new token */
  async reconnectWithToken() {
    // disconnect & create new io instance with updated auth
    this.disconnect(false);
    // small delay to ensure resources freed (optional)
    setTimeout(() => this.connect(), 50);
  }
}

export const socket = new SocketService();
export default socket;

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export type ChatEvent = 'chat:message' | 'chat:read' | 'chat:unread';

const MAX_TIMER_MS = 2147483647;

// Evaluated per request so FRONTEND_URL is read after ConfigModule has loaded .env.
export const chatCorsOrigin = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void): void =>
  callback(null, !origin || origin === (process.env.FRONTEND_URL ?? 'http://localhost:3000'));

@Injectable()
@WebSocketGateway({ cors: { origin: chatCorsOrigin, credentials: true } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(private jwt: JwtService) {}

  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (typeof token !== 'string' || !token) throw new Error('no token');
        const payload = await this.jwt.verifyAsync<{ sub?: string; exp?: number }>(token);
        if (!payload?.sub) throw new Error('no sub');
        socket.data.userId = payload.sub;
        socket.data.expiresAt = payload.exp;
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    });
  }

  handleConnection(client: Socket): void {
    const userId = client.data?.userId;
    if (typeof userId !== 'string' || !userId) {
      client.disconnect(true);
      return;
    }
    void client.join('user:' + userId);
    const expiresAt = client.data.expiresAt;
    if (typeof expiresAt === 'number') {
      const delay = Math.min(Math.max(expiresAt * 1000 - Date.now(), 0), MAX_TIMER_MS);
      const timer = setTimeout(() => client.disconnect(true), delay);
      client.once('disconnect', () => clearTimeout(timer));
    }
  }

  emitToUser(userId: string, event: ChatEvent, payload: unknown): void {
    this.server.to('user:' + userId).emit(event, payload);
  }
}

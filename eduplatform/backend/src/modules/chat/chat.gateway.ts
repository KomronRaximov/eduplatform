import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export type ChatEvent = 'chat:message' | 'chat:read' | 'chat:unread';

@Injectable()
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token;
      if (typeof token !== 'string' || !token) throw new Error('no token');
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (!payload?.sub) throw new Error('no sub');
      await client.join('user:' + payload.sub);
    } catch {
      client.disconnect(true);
    }
  }

  emitToUser(userId: string, event: ChatEvent, payload: unknown): void {
    this.server.to('user:' + userId).emit(event, payload);
  }
}

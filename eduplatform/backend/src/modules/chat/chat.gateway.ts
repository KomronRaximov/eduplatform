import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatGateway {
  emitToUser(userId: string, event: 'chat:message' | 'chat:read' | 'chat:unread', payload: unknown): void {}
}

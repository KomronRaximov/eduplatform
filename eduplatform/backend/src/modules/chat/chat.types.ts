export type ChatContact = { id: string; firstName: string; lastName: string; role: 'STUDENT' | 'TEACHER'; email?: string };
export type ChatAttachmentDto = { name: string; mimeType: string; size: number };
export type ChatMessageDto = { id: string; conversationId: string; senderId: string; body: string; attachment: ChatAttachmentDto | null; createdAt: string; readAt: string | null };
export type ChatConversationDto = { id: string; other: ChatContact; lastMessage: { body: string; attachmentName: string | null; senderId: string; createdAt: string } | null; unreadCount: number };

export const MAX_BODY = 2000;
export const RATE_LIMIT_PER_MINUTE = 30;
export const DEFAULT_PAGE = 50;
export const MAX_PAGE = 100;

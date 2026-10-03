import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ContactsQueryDto, MessagesQueryDto, OpenConversationDto, SendMessageDto } from './dto/chat.dto';

@ApiTags('Chat') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}
  @Get('contacts') contacts(@CurrentUser() user: JwtUser, @Query() q: ContactsQueryDto) { return this.chat.contacts(user.sub, q.q, q.limit); }
  @Get('unread-count') unread(@CurrentUser() user: JwtUser) { return this.chat.unreadTotal(user.sub); }
  @Get('conversations') conversations(@CurrentUser() user: JwtUser) { return this.chat.conversations(user.sub); }
  @Post('conversations') open(@CurrentUser() user: JwtUser, @Body() dto: OpenConversationDto) { return this.chat.openConversation(user.sub, dto.userId); }
  @Get('conversations/:id/messages') messages(@CurrentUser() user: JwtUser, @Param('id') id: string, @Query() q: MessagesQueryDto) { return this.chat.messages(user.sub, id, q.before, q.limit); }
  @Post('conversations/:id/read') read(@CurrentUser() user: JwtUser, @Param('id') id: string) { return this.chat.markRead(user.sub, id); }
  @Post('conversations/:id/messages') send(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: SendMessageDto) { return this.chat.send(user.sub, id, dto.body); }
}

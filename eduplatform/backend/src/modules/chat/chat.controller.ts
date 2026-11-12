import { Body, Controller, Get, NotFoundException, Param, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, promises as fs } from 'fs';
import { chatMulterOptions } from './chat-files';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ContactsQueryDto, MessagesQueryDto, OpenConversationDto, SendAttachmentDto, SendMessageDto } from './dto/chat.dto';

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
  @Post('conversations/:id/attachments') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', chatMulterOptions))
  sendAttachment(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: SendAttachmentDto, @UploadedFile() file?: Express.Multer.File) { return this.chat.sendAttachment(user.sub, id, file, dto.body); }

  @Get('messages/:id/attachment')
  async download(@CurrentUser() user: JwtUser, @Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.chat.attachment(user.sub, id);
    const stat = await fs.stat(file.filePath).catch(() => null);
    if (!stat?.isFile()) throw new NotFoundException('Fayl topilmadi');
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(stat.size),
      'Content-Disposition': `${file.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(createReadStream(file.filePath));
  }
}

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { MessengerService } from './messenger.service';
import { SendMessageDto } from './dto/messenger.dto';

@ApiTags('Messenger - Сообщения')
@Controller('messenger')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessengerController {
  constructor(private messengerService: MessengerService) {}

  @Get('chats')
  @ApiOperation({
    summary: 'Получить список чатов',
    description: `
Возвращает список всех диалогов текущей персоны.

Каждый чат содержит:
- \`targetType\` - тип собеседника (PERSONA или HOST)
- \`targetId\` - ID собеседника
- \`lastMessage\` - последнее сообщение в чате
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Список чатов',
    schema: {
      example: [
        {
          targetType: 'PERSONA',
          targetId: 'persona123',
          lastMessage: { id: 'msg1', text: 'Привет!', createdAt: '2026-01-21T20:00:00Z' },
        },
      ],
    },
  })
  async getChats(@CurrentUser() user: CurrentUserPayload) {
    return this.messengerService.getChats(user.personaId);
  }

  @Get('chat/:targetType/:targetId')
  @ApiOperation({
    summary: 'Получить сообщения чата',
    description: `
Возвращает все сообщения диалога с указанной персоной или хостом.
Сообщения отсортированы по времени (от старых к новым).
    `,
  })
  @ApiParam({ name: 'targetType', description: 'Тип собеседника', enum: ['PERSONA', 'HOST'] })
  @ApiParam({ name: 'targetId', description: 'ID собеседника' })
  @ApiResponse({ status: 200, description: 'Список сообщений' })
  async getChat(
    @CurrentUser() user: CurrentUserPayload,
    @Param('targetType') targetType: 'PERSONA' | 'HOST',
    @Param('targetId') targetId: string,
  ) {
    return this.messengerService.getChat(user.personaId, targetType, targetId);
  }

  @Post('send')
  @ApiOperation({
    summary: 'Отправить сообщение',
    description: `
Отправляет сообщение персоне или хосту.

**Ограничения:**
- Максимальная длина: 280 символов

Создаёт запись в GridLog.
    `,
  })
  @ApiResponse({ status: 201, description: 'Сообщение отправлено' })
  @ApiResponse({ status: 400, description: 'Текст слишком длинный' })
  @ApiResponse({ status: 404, description: 'Получатель не найден' })
  async sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.messengerService.sendMessage(user.personaId, dto);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications - Уведомления')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить уведомления',
    description: `
Возвращает последние уведомления для текущей персоны.

**Типы уведомлений:**
- \`hack_started\` - кто-то начал взлом вашей LLS
- \`balance_low\` - баланс ушёл в минус из-за подписки
- \`spider_alert\` - уведомление пауку о взломе хоста
- \`counter_success\` - успешный контр-взлом

Для real-time уведомлений используйте WebSocket:
\`\`\`javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});
socket.on('notification:new', (data) => console.log(data));
\`\`\`
    `,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Количество уведомлений (по умолчанию 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список уведомлений',
    schema: {
      example: [
        {
          id: 'notif123',
          type: 'hack_started',
          payload: { attackerPersonaId: 'attacker123' },
          createdAt: '2026-01-21T20:00:00Z',
        },
      ],
    },
  })
  async getNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getNotifications(
      user.personaId,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}

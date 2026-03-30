import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
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

**Типы уведомлений (примеры):**
- \`hack_started\`, \`hack_session_finished\`, \`hack_session_cancelled\`, \`hack_session_expired\`
- \`spider_countered\` — паук сорвал взлом на хосте
- \`subscription_negative_balance\`, \`subscription_payer_negative\`
- \`transfer_sent\`, \`transfer_received\`, \`payment_request_completed\`, \`static_qr_payment_received\`
- \`message_received\`, \`licenses_issued\`, \`device_unbricked\`, \`device_bricked_by_spider\`, \`subscription_cancelled_by_grid\`
- \`sin_stolen_alert\`, \`funds_stolen_via_hack\`, \`device_bricked_via_hack\`, \`file_copied_via_hack\`
- \`admin_broadcast\` — рассылка из админки (тип задаётся администратором)

Для real-time доставки включите настройку \`push_notifications_enabled\` и WebSocket:
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

  @Post(':id/read')
  @ApiOperation({ summary: 'Отметить уведомление как прочитанное' })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiResponse({ status: 200, description: 'Количество обновлённых записей (0 или 1)' })
  async markAsRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const result = await this.notificationsService.markAsRead(id, user.personaId);
    return { updated: result.count };
  }
}

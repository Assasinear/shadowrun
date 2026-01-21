import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GridgodService } from './gridgod.service';
import { IssueLicensesDto } from './dto/gridgod.dto';

@ApiTags('Gridgod - Администрирование (только GRIDGOD)')
@Controller('grid')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@ApiBearerAuth()
export class GridgodController {
  constructor(private gridgodService: GridgodService) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Получить логи Grid',
    description: `
Возвращает логи всех операций в системе (GridLog).

**Типы событий:**
- \`transfer\` - переводы средств
- \`payment_request_completed\` - завершённые платежи
- \`subscription_tick\` - списание по подписке
- \`hack_started\` / \`hack_completed\` - взломы
- \`message_sent\` - отправка сообщений
- \`device_bricked\` / \`device_unbricked\` - блокировка устройств
- \`license_issued\` - выдача лицензий
- \`subscription_cancelled\` - отмена подписок
- \`funds_stolen\` - кража средств

**Фильтры:**
- \`type\` - тип события
- \`personaId\` - ID персоны-актора
- \`hostId\` - ID хоста
- \`since\` - начиная с даты (ISO формат)
    `,
  })
  @ApiQuery({ name: 'type', required: false, description: 'Фильтр по типу события' })
  @ApiQuery({ name: 'personaId', required: false, description: 'Фильтр по персоне' })
  @ApiQuery({ name: 'hostId', required: false, description: 'Фильтр по хосту' })
  @ApiQuery({ name: 'since', required: false, description: 'Начиная с даты (ISO)' })
  @ApiResponse({ status: 200, description: 'Список логов' })
  async getLogs(
    @Query('type') type?: string,
    @Query('personaId') personaId?: string,
    @Query('hostId') hostId?: string,
    @Query('since') since?: string,
  ) {
    return this.gridgodService.getLogs({ type, personaId, hostId, since });
  }

  @Post('subscriptions/:id/cancel')
  @ApiOperation({
    summary: 'Отменить подписку',
    description: `
Принудительно отменяет активную подписку.

Используется для:
- Разрешения споров между игроками
- Исправления ошибок
- Административных действий

Создаёт запись в GridLog.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID подписки' })
  @ApiResponse({ status: 200, description: 'Подписка отменена' })
  @ApiResponse({ status: 404, description: 'Подписка не найдена' })
  async cancelSubscription(@Param('id') subscriptionId: string) {
    return this.gridgodService.cancelSubscription(subscriptionId);
  }

  @Post('licenses/issue')
  @ApiOperation({
    summary: 'Выдать лицензии персоне',
    description: `
Выдаёт одну или несколько лицензий указанной персоне.

**Типы лицензий:**
- \`driving\` - водительские права
- \`weapon\` - разрешение на оружие
- \`magic\` - лицензия на магию
- \`cyber\` - лицензия на киберимпланты
- \`medical\` - медицинская лицензия
- (любой другой тип)

Лицензии отображаются в профиле персоны.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Лицензии выданы',
    schema: {
      example: [
        { id: 'lic123', type: 'weapon', name: 'Разрешение на тяжёлое оружие' },
      ],
    },
  })
  async issueLicenses(@Body() dto: IssueLicensesDto) {
    return this.gridgodService.issueLicenses(dto.personaId, dto);
  }
}

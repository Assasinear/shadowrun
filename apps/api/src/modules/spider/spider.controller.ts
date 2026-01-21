import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { SpiderService } from './spider.service';
import { StartCounterDto, CompleteCounterDto } from './dto/spider.dto';

@ApiTags('Spider - Защита хоста (только SPIDER)')
@Controller('spider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SPIDER')
@ApiBearerAuth()
export class SpiderController {
  constructor(private spiderService: SpiderService) {}

  @Get('hosts')
  @ApiOperation({
    summary: 'Получить хосты где я паук',
    description: `
Возвращает список хостов, где текущая персона назначена пауком (spiderPersonaId).

Паук — это защитник хоста, который:
- Видит все файлы хоста
- Получает уведомления о взломах
- Может запускать контр-взлом
    `,
  })
  @ApiResponse({ status: 200, description: 'Список хостов' })
  async getHosts(@CurrentUser() user: CurrentUserPayload) {
    return this.spiderService.getHosts(user.personaId);
  }

  @Post('counter/start')
  @ApiOperation({
    summary: 'Начать контр-взлом',
    description: `
Запускает контр-взлом против декера, атакующего ваш хост.

**Требования:**
- Вы должны быть пауком указанного хоста
- Должна существовать активная сессия взлома этого хоста

После запуска контр-взлома паук должен завершить его через \`/spider/counter/:id/complete\`.
    `,
  })
  @ApiResponse({ status: 200, description: 'Контр-взлом начат' })
  @ApiResponse({ status: 404, description: 'Сессия взлома не найдена' })
  @ApiResponse({ status: 403, description: 'Вы не паук этого хоста' })
  async startCounter(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: StartCounterDto,
  ) {
    return this.spiderService.startCounter(user.personaId, dto);
  }

  @Post('counter/:counterSessionId/complete')
  @ApiOperation({
    summary: 'Завершить контр-взлом',
    description: `
Завершает контр-взлом с указанным результатом.

**При успехе (\`success: true\`):**
- Устройство декера (COMMLINK или DECK) блокируется на 5 минут
- Исходная сессия взлома отменяется
- Декер получает уведомление "Паук в сети!"

**При неудаче (\`success: false\`):**
- Ничего не происходит, декер продолжает взлом
    `,
  })
  @ApiParam({ name: 'counterSessionId', description: 'ID сессии контр-взлома (= ID исходной сессии взлома)' })
  @ApiResponse({ status: 200, description: 'Контр-взлом завершён' })
  async completeCounter(
    @CurrentUser() user: CurrentUserPayload,
    @Param('counterSessionId') counterSessionId: string,
    @Body() dto: CompleteCounterDto,
  ) {
    return this.spiderService.completeCounter(user.personaId, counterSessionId, dto);
  }
}

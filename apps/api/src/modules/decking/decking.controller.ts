import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DeckingService } from './decking.service';
import {
  AddTargetDto,
  StartHackDto,
  CompleteHackDto,
  StealSinDto,
  TransferFundsDto,
  BrickDeviceOpDto,
  DownloadFileDto,
} from './dto/decking.dto';

@ApiTags('Decking - Хакерство (только DECKER)')
@Controller('decking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DECKER')
@ApiBearerAuth()
export class DeckingController {
  constructor(private deckingService: DeckingService) {}

  @Get('known-targets')
  @ApiOperation({
    summary: 'Получить известные цели',
    description: `
Возвращает список целей (персон и хостов), которые декер добавил в свой список.
Цели можно добавлять через \`/decking/add-target\` или находить через \`/decking/random\`.
    `,
  })
  @ApiResponse({ status: 200, description: 'Список известных целей' })
  async getKnownTargets(@CurrentUser() user: CurrentUserPayload) {
    return this.deckingService.getKnownTargets(user.personaId);
  }

  @Post('add-target')
  @ApiOperation({
    summary: 'Добавить цель в список известных',
    description: 'Добавляет персону или хост в список целей для будущих атак.',
  })
  @ApiResponse({ status: 201, description: 'Цель добавлена' })
  @ApiResponse({ status: 400, description: 'Цель уже в списке' })
  async addTarget(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddTargetDto,
  ) {
    return this.deckingService.addTarget(user.personaId, dto);
  }

  @Get('random')
  @ApiOperation({
    summary: 'Получить случайную неизвестную цель',
    description: `
Возвращает случайную цель (персону или хост), которая ещё не в списке известных.
Используется для "сканирования сети" в поисках новых жертв.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Случайная цель',
    schema: { example: { type: 'PERSONA', id: 'cuid123' } },
  })
  @ApiResponse({ status: 404, description: 'Все цели уже известны' })
  async getRandomTarget(@CurrentUser() user: CurrentUserPayload) {
    return this.deckingService.getRandomTarget(user.personaId);
  }

  @Post('hack/start')
  @ApiOperation({
    summary: 'Начать взлом',
    description: `
Создаёт сессию взлома с таймером 2 минуты.

**Параметры:**
- \`targetType\`: PERSONA или HOST
- \`targetId\`: ID цели
- \`elementType\`: что ломаем (LLS, FILE, DEVICE и т.д.)

**Уведомления:**
- Жертве отправляется уведомление о взломе
- Если взламывается HOST с пауком, паук тоже получает алерт

**Статусы сессии:**
- ACTIVE - идёт взлом
- SUCCESS - успешно завершён
- FAILED - неудача
- CANCELLED - отменён
- EXPIRED - истёк таймер
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Сессия взлома создана',
    schema: {
      example: {
        id: 'session123',
        status: 'ACTIVE',
        expiresAt: '2026-01-21T20:25:00.000Z',
      },
    },
  })
  async startHack(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: StartHackDto,
  ) {
    return this.deckingService.startHack(user.personaId, dto);
  }

  @Post('hack/:sessionId/complete')
  @ApiOperation({
    summary: 'Завершить взлом',
    description: `
Завершает сессию взлома с указанным результатом.

**При успехе (\`success: true\`):**
- Сессия переходит в статус SUCCESS
- Можно выполнить ОДНУ операцию (steal-sin, transfer-funds, brick-device, download-file)

**При неудаче (\`success: false\`):**
- Сессия переходит в статус FAILED
- Никаких операций выполнить нельзя
    `,
  })
  @ApiParam({ name: 'sessionId', description: 'ID сессии взлома' })
  @ApiResponse({ status: 200, description: 'Взлом завершён' })
  @ApiResponse({ status: 404, description: 'Сессия не найдена' })
  @ApiResponse({ status: 400, description: 'Сессия уже завершена' })
  async completeHack(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sessionId') sessionId: string,
    @Body() dto: CompleteHackDto,
  ) {
    return this.deckingService.completeHack(user.personaId, sessionId, dto);
  }

  @Post('hack/:sessionId/cancel')
  @ApiOperation({
    summary: 'Отменить взлом',
    description: 'Отменяет активную сессию взлома. Сессия переходит в статус CANCELLED.',
  })
  @ApiParam({ name: 'sessionId', description: 'ID сессии взлома' })
  @ApiResponse({ status: 200, description: 'Взлом отменён' })
  async cancelHack(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.deckingService.cancelHack(user.personaId, sessionId);
  }

  @Post('op/steal-sin')
  @ApiOperation({
    summary: 'Украсть SIN',
    description: `
**Требует успешную сессию взлома LLS персоны.**

Копирует SIN жертвы в файл в LLS атакующего.
Файл содержит JSON с данными SIN и может использоваться для подделки личности.

⚠️ Операция потребляет сессию - больше никаких операций по ней выполнить нельзя.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'SIN украден, файл создан в LLS',
    schema: { example: { file: { id: 'file123', name: 'stolen_sin.json' } } },
  })
  @ApiResponse({ status: 400, description: 'Сессия не активна или уже использована' })
  async stealSin(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: StealSinDto,
  ) {
    return this.deckingService.stealSin(user.personaId, dto);
  }

  @Post('op/transfer-funds')
  @ApiOperation({
    summary: 'Украсть 10% средств',
    description: `
**Требует успешную сессию взлома LLS персоны.**

Переводит 10% баланса жертвы на кошелёк атакующего.
Транзакция помечается как \`isTheft=true\` и НЕ отображается в истории жертвы.

⚠️ Операция потребляет сессию.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Средства украдены',
    schema: { example: { success: true, amount: 150 } },
  })
  @ApiResponse({ status: 400, description: 'Сессия не активна или уже использована' })
  async transferFunds(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: TransferFundsDto,
  ) {
    return this.deckingService.transferFunds(user.personaId, dto);
  }

  @Post('op/brick-device')
  @ApiOperation({
    summary: 'Заблокировать устройство жертвы',
    description: `
**Требует успешную сессию взлома LLS персоны.**

"Кирпичит" устройство жертвы на 5 минут.
Устройство переходит в статус BRICKED и не может использоваться.

⚠️ Операция потребляет сессию.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Устройство заблокировано',
    schema: { example: { success: true, brickUntil: '2026-01-21T20:30:00.000Z' } },
  })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  async brickDevice(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BrickDeviceOpDto,
  ) {
    return this.deckingService.brickDeviceOp(user.personaId, dto);
  }

  @Post('op/download-file')
  @ApiOperation({
    summary: 'Скачать файл из LLS/хоста жертвы',
    description: `
**Требует успешную сессию взлома LLS персоны или хоста.**

Копирует файл из архива жертвы в LLS атакующего.

⚠️ Операция потребляет сессию.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Файл скопирован',
  })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async downloadFile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DownloadFileDto,
  ) {
    return this.deckingService.downloadFile(user.personaId, dto);
  }
}

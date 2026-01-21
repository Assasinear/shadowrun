import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { BindDeviceDto, UnbindDeviceDto, BrickDeviceDto } from './dto/devices.dto';

@ApiTags('Devices - Устройства')
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить свои устройства',
    description: `
Возвращает список устройств, привязанных к персоне.

**Типы устройств:**
- COMMLINK - коммуникатор
- DECK - хакерская дека
- DRONE - дрон
- VEHICLE - транспорт
- OTHER - прочее

**Статусы:**
- ACTIVE - активно
- BRICKED - заблокировано (кирпич)
    `,
  })
  @ApiResponse({ status: 200, description: 'Список устройств' })
  async getDevices(@CurrentUser() user: CurrentUserPayload) {
    return this.devicesService.getDevices(user.personaId);
  }

  @Post('bind')
  @ApiOperation({
    summary: 'Привязать устройство по коду',
    description: `
Привязывает бесхозное устройство к персоне по уникальному коду.

Устройства "в луте" имеют код (например, \`DEVICE-001\`), 
который можно найти физически на игре.
    `,
  })
  @ApiResponse({ status: 200, description: 'Устройство привязано' })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  @ApiResponse({ status: 400, description: 'Устройство уже привязано' })
  async bindDevice(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BindDeviceDto,
  ) {
    return this.devicesService.bindDevice(user.personaId, dto);
  }

  @Post('unbind')
  @ApiOperation({
    summary: 'Отвязать устройство',
    description: 'Отвязывает устройство от персоны. Устройство становится бесхозным.',
  })
  @ApiResponse({ status: 200, description: 'Устройство отвязано' })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  @ApiResponse({ status: 403, description: 'Устройство не принадлежит вам' })
  async unbindDevice(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UnbindDeviceDto,
  ) {
    return this.devicesService.unbindDevice(user.personaId, dto);
  }

  @Post(':deviceId/brick')
  @Roles('DECKER')
  @ApiOperation({
    summary: 'Заблокировать устройство (DECKER)',
    description: `
**Только для роли DECKER после успешного взлома LLS владельца устройства.**

"Кирпичит" устройство на 5 минут.
Требует ID активной успешной сессии взлома.
    `,
  })
  @ApiParam({ name: 'deviceId', description: 'ID устройства' })
  @ApiResponse({ status: 200, description: 'Устройство заблокировано' })
  @ApiResponse({ status: 403, description: 'Нет прав или неверная сессия взлома' })
  async brickDevice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('deviceId') deviceId: string,
    @Body() dto: BrickDeviceDto,
  ) {
    return this.devicesService.brickDevice(user.personaId, deviceId, dto);
  }
}

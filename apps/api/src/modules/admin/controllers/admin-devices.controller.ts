import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminDevicesService } from '../services/admin-devices.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';
import { CreateDeviceDto, BindDeviceDto } from '../dto/admin-devices.dto';

@ApiTags('Admin - Устройства')
@ApiBearerAuth()
@Controller('admin/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminDevicesController {
  constructor(private readonly service: AdminDevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Список всех устройств' })
  @ApiQuery({ name: 'unownedOnly', required: false, type: Boolean })
  findAll(@Query('unownedOnly') unownedOnly?: string) {
    return this.service.findAll(unownedOnly === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Создать устройство' })
  create(@Body() dto: CreateDeviceDto) {
    return this.service.create(dto);
  }

  @Post(':id/bind')
  @ApiOperation({ summary: 'Привязать устройство к персоне' })
  bind(@Param('id') id: string, @Body() dto: BindDeviceDto) {
    return this.service.bind(id, dto.personaId);
  }

  @Post(':id/unbind')
  @ApiOperation({ summary: 'Отвязать устройство от персоны' })
  unbind(@Param('id') id: string) {
    return this.service.unbind(id);
  }

  @Post(':id/reset-brick')
  @ApiOperation({ summary: 'Сбросить brick-статус устройства' })
  resetBrick(@Param('id') id: string) {
    return this.service.resetBrick(id);
  }
}

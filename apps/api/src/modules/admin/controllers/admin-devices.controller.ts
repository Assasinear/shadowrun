import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CreateDeviceDto, UpdateDeviceDto, BindDeviceDto } from '../dto/admin-devices.dto';

@ApiTags('Admin - Устройства')
@ApiBearerAuth()
@Controller('admin/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminDevicesController {
  constructor(private readonly service: AdminDevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Список всех устройств (фильтры, пагинация)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'unownedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('unownedOnly') unownedOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      type,
      status,
      unownedOnly: unownedOnly === 'true',
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Создать устройство' })
  create(@Body() dto: CreateDeviceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить устройство' })
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить устройство' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
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

  @Post('mass/unbind')
  @ApiOperation({ summary: 'Массовое отвязывание устройств' })
  massUnbind(@Body() body: { ids: string[] }) {
    return this.service.massUnbind(body.ids);
  }

  @Post('mass/reset-brick')
  @ApiOperation({ summary: 'Массовый сброс brick-статуса' })
  massResetBrick(@Body() body: { ids: string[] }) {
    return this.service.massResetBrick(body.ids);
  }

  @Post('mass/delete')
  @ApiOperation({ summary: 'Массовое удаление устройств' })
  massDelete(@Body() body: { ids: string[] }) {
    return this.service.massDelete(body.ids);
  }
}

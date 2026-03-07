import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminSettingsService } from '../services/admin-settings.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';
import { UpdateSettingDto, BulkUpdateSettingsDto } from '../dto/admin-settings.dto';

@ApiTags('Admin - Настройки системы')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все системные настройки' })
  getAll() {
    return this.service.getAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Получить настройку по ключу' })
  get(@Param('key') key: string) {
    return this.service.get(key);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Обновить настройку' })
  set(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.service.set(key, dto.value);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Массовое обновление настроек' })
  bulkUpdate(@Body() dto: BulkUpdateSettingsDto) {
    return this.service.bulkUpdate(dto.settings);
  }
}

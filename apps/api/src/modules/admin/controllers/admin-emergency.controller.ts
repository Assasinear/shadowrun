import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminEmergencyService } from '../services/admin-emergency.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Экстренные действия')
@ApiBearerAuth()
@Controller('admin/emergency')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminEmergencyController {
  constructor(private readonly service: AdminEmergencyService) {}

  @Post('terminate-all-hacks')
  @ApiOperation({ summary: 'Прервать все активные хак-сессии' })
  terminateAllHacks() {
    return this.service.terminateAllHacks();
  }

  @Post('disable-decking')
  @ApiOperation({ summary: 'Отключить декинг' })
  disableDecking() {
    return this.service.disableDecking();
  }

  @Post('enable-decking')
  @ApiOperation({ summary: 'Включить декинг' })
  enableDecking() {
    return this.service.enableDecking();
  }

  @Get('decking-status')
  @ApiOperation({ summary: 'Статус декинга (включён/выключен)' })
  getDeckingStatus() {
    return this.service.isDeckingEnabled();
  }

  @Post('reset-all-bricks')
  @ApiOperation({ summary: 'Сбросить все brick-статусы устройств' })
  resetAllBricks() {
    return this.service.resetAllBricks();
  }

  @Get('export-db')
  @ApiOperation({ summary: 'Экспорт всей базы данных в JSON' })
  exportDatabase() {
    return this.service.exportDatabase();
  }
}

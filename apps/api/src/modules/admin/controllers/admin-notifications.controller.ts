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
import { AdminNotificationsService } from '../services/admin-notifications.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Уведомления')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminNotificationsController {
  constructor(private readonly service: AdminNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Список уведомлений (фильтры, пагинация)' })
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('personaId') personaId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      personaId,
      type,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Рассылка уведомлений (всем или выбранным)' })
  broadcast(@Body() body: { type: string; payload?: any; personaIds?: string[] }) {
    return this.service.broadcast(body);
  }

  @Post(':personaId/mark-all-read')
  @ApiOperation({ summary: 'Отметить все уведомления персоны как прочитанные' })
  markAllRead(@Param('personaId') personaId: string) {
    return this.service.markAllRead(personaId);
  }
}

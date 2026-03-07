import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminLogsService } from '../services/admin-logs.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Логи')
@ApiBearerAuth()
@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminLogsController {
  constructor(private readonly service: AdminLogsService) {}

  @Get('grid')
  @ApiOperation({ summary: 'Логи Grid (фильтры, пагинация)' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'hostId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getGridLogs(
    @Query('type') type?: string,
    @Query('personaId') personaId?: string,
    @Query('hostId') hostId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getGridLogs({
      type,
      personaId,
      hostId,
      dateFrom,
      dateTo,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('admin')
  @ApiOperation({ summary: 'Логи администраторских действий' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'adminUserId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAdminLogs(
    @Query('action') action?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAdminLogs({
      action,
      adminUserId,
      dateFrom,
      dateTo,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('grid/csv')
  @ApiOperation({ summary: 'Экспорт Grid-логов в CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="grid-logs.csv"')
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'hostId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getGridLogsCsv(
    @Query('type') type?: string,
    @Query('personaId') personaId?: string,
    @Query('hostId') hostId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getGridLogsCsv({ type, personaId, hostId, dateFrom, dateTo });
  }

  @Get('admin/csv')
  @ApiOperation({ summary: 'Экспорт админ-логов в CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="admin-logs.csv"')
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'adminUserId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getAdminLogsCsv(
    @Query('action') action?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getAdminLogsCsv({ action, adminUserId, dateFrom, dateTo });
  }
}

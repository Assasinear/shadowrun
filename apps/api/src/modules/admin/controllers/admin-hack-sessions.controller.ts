import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminHackSessionsService } from '../services/admin-hack-sessions.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Хак-сессии')
@ApiBearerAuth()
@Controller('admin/hack-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminHackSessionsController {
  constructor(private readonly service: AdminHackSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Список хак-сессий (фильтры, пагинация)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'attackerPersonaId', required: false })
  @ApiQuery({ name: 'targetType', required: false })
  @ApiQuery({ name: 'targetPersonaId', required: false })
  @ApiQuery({ name: 'targetHostId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('attackerPersonaId') attackerPersonaId?: string,
    @Query('targetType') targetType?: string,
    @Query('targetPersonaId') targetPersonaId?: string,
    @Query('targetHostId') targetHostId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      attackerPersonaId,
      targetType,
      targetPersonaId,
      targetHostId,
      dateFrom,
      dateTo,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить хак-сессию' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Post('mass/cancel-active')
  @ApiOperation({ summary: 'Отменить все активные хак-сессии' })
  massCancelActive() {
    return this.service.massCancelActive();
  }
}

import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminPaymentRequestsService } from '../services/admin-payment-requests.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Платёжные запросы')
@ApiBearerAuth()
@Controller('admin/payment-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminPaymentRequestsController {
  constructor(private readonly service: AdminPaymentRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Список платёжных запросов (фильтры, пагинация)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'creatorPersonaId', required: false })
  @ApiQuery({ name: 'targetPersonaId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('creatorPersonaId') creatorPersonaId?: string,
    @Query('targetPersonaId') targetPersonaId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      creatorPersonaId,
      targetPersonaId,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }
}

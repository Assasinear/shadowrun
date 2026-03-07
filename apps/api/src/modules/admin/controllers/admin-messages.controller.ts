import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminMessagesService } from '../services/admin-messages.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Сообщения')
@ApiBearerAuth()
@Controller('admin/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminMessagesController {
  constructor(private readonly service: AdminMessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Все сообщения (фильтры, пагинация)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'senderPersonaId', required: false })
  @ApiQuery({ name: 'receiverPersonaId', required: false })
  @ApiQuery({ name: 'senderType', required: false })
  @ApiQuery({ name: 'receiverType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('senderPersonaId') senderPersonaId?: string,
    @Query('receiverPersonaId') receiverPersonaId?: string,
    @Query('senderType') senderType?: string,
    @Query('receiverType') receiverType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      senderPersonaId,
      receiverPersonaId,
      senderType,
      receiverType,
      dateFrom,
      dateTo,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('threads')
  @ApiOperation({ summary: 'Список тредов с последним сообщением' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getThreads(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getThreads({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Сообщения в треде' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getThreadMessages(
    @Param('threadId') threadId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getThreadMessages(threadId, page ? +page : 1, limit ? +limit : 50);
  }
}

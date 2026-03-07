import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminAccessTokensService } from '../services/admin-access-tokens.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Токены доступа')
@ApiBearerAuth()
@Controller('admin/access-tokens')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminAccessTokensController {
  constructor(private readonly service: AdminAccessTokensService) {}

  @Get()
  @ApiOperation({ summary: 'Список токенов доступа (фильтры, пагинация)' })
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'hostId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('personaId') personaId?: string,
    @Query('hostId') hostId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      personaId,
      hostId,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить токен доступа' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

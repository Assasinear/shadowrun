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
import { AdminLicensesService } from '../services/admin-licenses.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Лицензии')
@ApiBearerAuth()
@Controller('admin/licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminLicensesController {
  constructor(private readonly service: AdminLicensesService) {}

  @Get()
  @ApiOperation({ summary: 'Список лицензий (фильтры, пагинация)' })
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

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить лицензию' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

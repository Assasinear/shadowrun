import {
  Controller,
  Get,
  Post,
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
import { AdminBlogPostsService } from '../services/admin-blog-posts.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';

@ApiTags('Admin - Блог-посты')
@ApiBearerAuth()
@Controller('admin/blog-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminBlogPostsController {
  constructor(private readonly service: AdminBlogPostsService) {}

  @Get()
  @ApiOperation({ summary: 'Список блог-постов (фильтры, пагинация)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'hostId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('personaId') personaId?: string,
    @Query('hostId') hostId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      personaId,
      hostId,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Создать блог-пост' })
  create(@Body() body: { text: string; personaId?: string; hostId?: string }) {
    return this.service.create(body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить блог-пост' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('mass/delete')
  @ApiOperation({ summary: 'Массовое удаление блог-постов' })
  massDelete(@Body() body: { ids: string[] }) {
    return this.service.massDelete(body.ids);
  }
}

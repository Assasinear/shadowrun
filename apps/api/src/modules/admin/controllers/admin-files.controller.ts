import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AdminFilesService } from '../services/admin-files.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';
import { CreateFileDto, UpdateFileDto } from '../dto/admin-files.dto';

@ApiTags('Admin - Файлы')
@ApiBearerAuth()
@Controller('admin/files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminFilesController {
  constructor(private readonly service: AdminFilesService) {}

  @Get()
  @ApiOperation({ summary: 'Список всех файлов (поиск, фильтр по персоне/хосту)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'hostId', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('personaId') personaId?: string,
    @Query('hostId') hostId?: string,
  ) {
    return this.service.findAll(search, personaId, hostId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная информация о файле' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать файл' })
  create(@Body() dto: CreateFileDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить файл' })
  update(@Param('id') id: string, @Body() dto: UpdateFileDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить файл' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

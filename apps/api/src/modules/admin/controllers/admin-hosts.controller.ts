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
import { AdminHostsService } from '../services/admin-hosts.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';
import {
  CreateHostDto,
  UpdateHostDto,
  CreateHostFileDto,
  CreateAccessTokenDto,
} from '../dto/admin-hosts.dto';

@ApiTags('Admin - Хосты')
@ApiBearerAuth()
@Controller('admin/hosts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminHostsController {
  constructor(private readonly service: AdminHostsService) {}

  @Get()
  @ApiOperation({ summary: 'Список всех хостов' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная информация о хосте' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать хост' })
  create(@Body() dto: CreateHostDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить хост' })
  update(@Param('id') id: string, @Body() dto: UpdateHostDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить хост' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/files')
  @ApiOperation({ summary: 'Добавить файл в хост' })
  addFile(@Param('id') id: string, @Body() dto: CreateHostFileDto) {
    return this.service.addFile(id, dto);
  }

  @Post(':id/access-tokens')
  @ApiOperation({ summary: 'Создать токен доступа для хоста' })
  createAccessToken(@Param('id') id: string, @Body() dto: CreateAccessTokenDto) {
    return this.service.createAccessToken(id, dto);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Сгенерировать QR-код хоста' })
  generateHostQr(@Param('id') id: string) {
    return this.service.generateHostQr(id);
  }
}

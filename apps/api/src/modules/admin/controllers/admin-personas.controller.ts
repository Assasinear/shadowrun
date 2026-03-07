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
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AdminPersonasService } from '../services/admin-personas.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';
import {
  CreatePersonaDto,
  UpdatePersonaDto,
  ChangeRoleDto,
  IssueLicensesDto,
} from '../dto/admin-personas.dto';

@ApiTags('Admin - Персоны')
@ApiBearerAuth()
@Controller('admin/personas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminPersonasController {
  constructor(private readonly service: AdminPersonasService) {}

  @Get()
  @ApiOperation({ summary: 'Список всех персон (пагинация, поиск)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(search, page ? +page : 1, limit ? +limit : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная информация о персоне' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать персону (User + Persona + LLS + Wallet)' })
  create(@Body() dto: CreatePersonaDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить данные персоны' })
  update(@Param('id') id: string, @Body() dto: UpdatePersonaDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Заблокировать пользователя' })
  block(@Param('id') id: string) {
    return this.service.block(id);
  }

  @Post(':id/unblock')
  @ApiOperation({ summary: 'Разблокировать пользователя' })
  unblock(@Param('id') id: string) {
    return this.service.unblock(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить пользователя и персону' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/licenses')
  @ApiOperation({ summary: 'Выдать лицензии персоне' })
  issueLicenses(
    @Param('id') id: string,
    @Body() dto: IssueLicensesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.issueLicenses(id, dto.licenses, user.personaId);
  }

  @Delete(':id/licenses/:licenseId')
  @ApiOperation({ summary: 'Удалить лицензию' })
  removeLicense(@Param('licenseId') licenseId: string) {
    return this.service.removeLicense(licenseId);
  }

  @Post(':id/role')
  @ApiOperation({ summary: 'Изменить роль пользователя' })
  changeRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.service.changeRole(id, dto.role);
  }

  @Get(':id/qr-sin')
  @ApiOperation({ summary: 'Сгенерировать QR-код SIN для персоны' })
  generateSinQr(@Param('id') id: string) {
    return this.service.generateSinQr(id);
  }
}

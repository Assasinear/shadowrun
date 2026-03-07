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
  @ApiOperation({ summary: 'Список всех персон (пагинация, поиск, фильтры)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'isBlocked', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isBlocked') isBlocked?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      role,
      isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
      page: page ? +page : 1,
      limit: limit ? +limit : 50,
    });
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

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Сбросить пароль пользователя' })
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.service.resetPassword(id, body.password);
  }

  @Post('mass/block')
  @ApiOperation({ summary: 'Массовая блокировка' })
  massBlock(@Body() body: { ids: string[] }) {
    return this.service.massBlock(body.ids);
  }

  @Post('mass/unblock')
  @ApiOperation({ summary: 'Массовая разблокировка' })
  massUnblock(@Body() body: { ids: string[] }) {
    return this.service.massUnblock(body.ids);
  }

  @Post('mass/delete')
  @ApiOperation({ summary: 'Массовое удаление' })
  massDelete(@Body() body: { ids: string[] }) {
    return this.service.massDelete(body.ids);
  }

  @Post('mass/set-balance')
  @ApiOperation({ summary: 'Массовая установка баланса' })
  massSetBalance(@Body() body: { ids: string[]; balance: number }) {
    return this.service.massSetBalance(body.ids, body.balance);
  }

  @Post('mass/change-role')
  @ApiOperation({ summary: 'Массовая смена роли' })
  massChangeRole(@Body() body: { ids: string[]; role: string }) {
    return this.service.massChangeRole(body.ids, body.role);
  }
}

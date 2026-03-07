import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminRolesService } from '../services/admin-roles.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';
import { ChangeRoleDto } from '../dto/admin-personas.dto';

@ApiTags('Admin - Роли')
@ApiBearerAuth()
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminRolesController {
  constructor(private readonly service: AdminRolesService) {}

  @Get()
  @ApiOperation({ summary: 'Список пользователей со специальными ролями' })
  getSpecialRoles() {
    return this.service.getSpecialRoles();
  }

  @Post(':personaId/assign')
  @ApiOperation({ summary: 'Назначить роль персоне' })
  assignRole(@Param('personaId') personaId: string, @Body() dto: ChangeRoleDto) {
    return this.service.changeRole(personaId, dto.role);
  }

  @Post(':personaId/remove')
  @ApiOperation({ summary: 'Снять роль (вернуть USER)' })
  removeRole(@Param('personaId') personaId: string) {
    return this.service.removeRole(personaId);
  }
}

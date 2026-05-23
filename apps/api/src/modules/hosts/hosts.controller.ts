import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { HostsService } from './hosts.service';
import { OpenArchiveDto, UpdateHostDto, HostBlogPostDto } from './dto/hosts.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Hosts - Хосты (серверы)')
@Controller('hosts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HostsController {
  constructor(private hostsService: HostsService) {}

  @Public()
  @Get('public/:id')
  @ApiOperation({
    summary: 'Получить публичную информацию о хосте',
    description: `
Возвращает публичные данные хоста: название, описание, 
публичные файлы, блог, информация о владельце и пауке.

Не требует авторизации.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiResponse({ status: 200, description: 'Информация о хосте' })
  @ApiResponse({ status: 404, description: 'Хост не найден' })
  async getPublicHost(@Param('id') hostId: string) {
    return this.hostsService.getPublicHost(hostId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить полную информацию о хосте',
    description: `
Возвращает полные данные хоста включая приватные файлы.

**Доступ имеют:**
- Владелец хоста
- Паук (Spider) хоста
- Декер с активной сессией взлома

Для остальных — ошибка 403.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiResponse({ status: 200, description: 'Полная информация о хосте' })
  @ApiResponse({ status: 403, description: 'Нет доступа' })
  async getHost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') hostId: string,
  ) {
    return this.hostsService.getHost(hostId, user.personaId, user.role as any);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Обновить хост (владелец)',
    description: `
Доступно только владельцу хоста (\`ownerPersonaId === personaId\`).

Можно изменить:
- \`description\` — описание
- \`isPublic\` — публичность
- \`spiderPersonaId\` — назначить/снять паука (передать \`null\` чтобы снять)
    `,
  })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiResponse({ status: 200, description: 'Хост обновлён' })
  @ApiResponse({ status: 403, description: 'Не владелец' })
  async updateHost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') hostId: string,
    @Body() dto: UpdateHostDto,
  ) {
    return this.hostsService.updateHost(hostId, user.personaId, dto);
  }

  @Post(':id/blog')
  @ApiOperation({
    summary: 'Создать пост в блоге хоста',
    description: 'Доступно владельцу или пауку хоста. Максимум 70 символов.',
  })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiResponse({ status: 201, description: 'Пост создан' })
  @ApiResponse({ status: 403, description: 'Не владелец/паук' })
  async createBlogPost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') hostId: string,
    @Body() dto: HostBlogPostDto,
  ) {
    return this.hostsService.createBlogPost(hostId, user.personaId, dto);
  }

  @Delete(':id/blog/:postId')
  @ApiOperation({
    summary: 'Удалить пост из блога хоста',
    description: 'Доступно владельцу или пауку хоста.',
  })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiParam({ name: 'postId', description: 'ID поста' })
  @ApiResponse({ status: 200, description: 'Пост удалён' })
  @ApiResponse({ status: 403, description: 'Не владелец/паук' })
  async deleteBlogPost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') hostId: string,
    @Param('postId') postId: string,
  ) {
    return this.hostsService.deleteBlogPost(hostId, postId, user.personaId);
  }

  @Post(':id/files/:fileId/public/toggle')
  @ApiOperation({
    summary: 'Переключить публичность файла хоста',
    description: 'Делает файл публичным или приватным. Только для владельца или паука.',
  })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiParam({ name: 'fileId', description: 'ID файла' })
  @ApiResponse({ status: 200, description: 'Статус изменён' })
  @ApiResponse({ status: 403, description: 'Нет прав' })
  async toggleFilePublic(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') hostId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.hostsService.toggleFilePublic(hostId, fileId, user.personaId);
  }

  @Post(':id/open-archive')
  @ApiOperation({
    summary: 'Выдать доступ к архиву хоста',
    description: `
Создаёт токен доступа (AccessToken) для указанной персоны.

**Только владелец или паук хоста** могут открыть архив. Токен действует 24 часа.
    `,
  })
  @ApiResponse({ status: 403, description: 'Не владелец и не паук хоста' })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiResponse({
    status: 201,
    description: 'Токен доступа создан',
    schema: {
      example: {
        id: 'token123',
        token: 'AT-123456789',
        expiresAt: '2026-01-22T20:00:00.000Z',
      },
    },
  })
  async openArchive(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') hostId: string,
    @Body() dto: OpenArchiveDto,
  ) {
    return this.hostsService.openArchive(hostId, user.personaId, dto);
  }

  @Get(':id/qr')
  @ApiOperation({
    summary: 'Получить QR-код для доната хосту',
    description: `
Генерирует QR-код для добровольного платежа (доната) на кошелёк хоста.

Возвращает:
- \`token\` - текстовый токен
- \`qrDataUrl\` - PNG картинка в base64 (data:image/png;base64,...)
- \`paymentRequest\` - данные запроса

Плательщик сканирует QR через \`/bank/scan-qr\` и подтверждает через \`/bank/confirm-payment\`.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID хоста' })
  @ApiResponse({
    status: 200,
    description: 'QR-код создан',
    schema: {
      example: {
        token: 'abc123...',
        qrDataUrl: 'data:image/png;base64,iVBORw0KGgo...',
        paymentRequest: { id: 'pr123', amount: '0', purpose: 'Донат' },
      },
    },
  })
  async getHostQr(@Param('id') hostId: string) {
    return this.hostsService.getHostQr(hostId);
  }
}

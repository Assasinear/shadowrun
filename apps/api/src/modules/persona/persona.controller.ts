import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PersonaService } from './persona.service';
import {
  UpdatePersonaDto,
  TogglePublicDto,
  BlogPostDto,
  RedeemFileDto,
} from './dto/persona.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Persona - Персона и LLS')
@Controller('persona')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PersonaController {
  constructor(private personaService: PersonaService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Получить свою персону',
    description: `
Возвращает полную информацию о персоне текущего пользователя, включая:
- Основные данные (имя, аватар, адрес, профессия)
- LLS (личная локальная сеть) с SIN
- Кошелёк с балансом
- Лицензии
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о персоне',
  })
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.personaService.getMe(user.personaId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Обновить информацию о персоне',
    description: 'Позволяет изменить адрес, профессию и дополнительную информацию.',
  })
  @ApiResponse({ status: 200, description: 'Персона обновлена' })
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdatePersonaDto,
  ) {
    return this.personaService.updateMe(user.personaId, dto);
  }

  @Post('public/toggle')
  @ApiOperation({
    summary: 'Переключить публичность LLS',
    description: `
Если LLS публичная, персона отображается в \`/grid/public-personas\` 
и её файлы видны другим пользователям.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Статус публичности изменён',
    schema: { example: { isPublic: true } },
  })
  async togglePublic(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: TogglePublicDto,
  ) {
    return this.personaService.togglePublic(user.personaId, dto);
  }

  @Post('qr/sin')
  @ApiOperation({
    summary: 'Создать QR-код SIN',
    description: `
Генерирует QR-код с SIN персоны для идентификации.
Возвращает:
- \`token\` - текстовый токен
- \`qrDataUrl\` - PNG изображение в формате base64 (data:image/png;base64,...)
- \`payload\` - данные SIN
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'QR-код создан',
    schema: {
      example: {
        token: 'abc123...',
        qrDataUrl: 'data:image/png;base64,iVBORw0KGgo...',
        payload: { sin: 'SIN-123', name: 'John Doe' },
        type: 'SIN',
      },
    },
  })
  async createSinQr(@CurrentUser() user: CurrentUserPayload) {
    return this.personaService.createSinQr(user.personaId);
  }

  @Public()
  @Get(':id/public')
  @ApiOperation({
    summary: 'Получить публичную информацию о персоне',
    description: 'Возвращает публичные данные персоны: имя, аватар, блог, публичные файлы.',
  })
  @ApiParam({ name: 'id', description: 'ID персоны' })
  @ApiResponse({ status: 200, description: 'Публичная информация о персоне' })
  @ApiResponse({ status: 404, description: 'Персона не найдена' })
  async getPublicPersona(@Param('id') personaId: string) {
    return this.personaService.getPublicPersona(personaId);
  }

  @Get('me/blog')
  @ApiOperation({
    summary: 'Получить свой блог',
    description: 'Возвращает все посты в блоге текущей персоны.',
  })
  @ApiResponse({ status: 200, description: 'Список постов' })
  async getMyBlog(@CurrentUser() user: CurrentUserPayload) {
    return this.personaService.getMyBlog(user.personaId);
  }

  @Post('me/blog')
  @ApiOperation({
    summary: 'Создать пост в блоге',
    description: 'Добавляет новый пост в блог. Максимальная длина текста: 70 символов.',
  })
  @ApiResponse({ status: 201, description: 'Пост создан' })
  @ApiResponse({ status: 400, description: 'Текст слишком длинный' })
  async createBlogPost(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BlogPostDto,
  ) {
    return this.personaService.createBlogPost(user.personaId, dto);
  }

  @Public()
  @Get(':id/blog')
  @ApiOperation({
    summary: 'Получить блог персоны',
    description: 'Возвращает публичные посты блога указанной персоны.',
  })
  @ApiParam({ name: 'id', description: 'ID персоны' })
  @ApiResponse({ status: 200, description: 'Список постов' })
  async getPersonaBlog(@Param('id') personaId: string) {
    return this.personaService.getPersonaBlog(personaId);
  }

  @Get('me/files')
  @ApiOperation({
    summary: 'Получить свои файлы',
    description: 'Возвращает все файлы в LLS архиве персоны.',
  })
  @ApiResponse({ status: 200, description: 'Список файлов' })
  async getMyFiles(@CurrentUser() user: CurrentUserPayload) {
    return this.personaService.getMyFiles(user.personaId);
  }

  @Post('me/files/redeem')
  @ApiOperation({
    summary: 'Активировать файл по коду',
    description: `
Привязывает файл с указанным redeemCode к LLS текущей персоны.
Файлы с кодами могут быть "в луте" или выданы игротехниками.
    `,
  })
  @ApiResponse({ status: 200, description: 'Файл привязан' })
  @ApiResponse({ status: 404, description: 'Файл с таким кодом не найден' })
  async redeemFile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RedeemFileDto,
  ) {
    return this.personaService.redeemFile(user.personaId, dto);
  }

  @Post('me/files/:fileId/public/toggle')
  @ApiOperation({
    summary: 'Переключить публичность файла',
    description: 'Делает файл публичным или приватным. Публичные файлы видны при просмотре LLS.',
  })
  @ApiParam({ name: 'fileId', description: 'ID файла' })
  @ApiResponse({ status: 200, description: 'Статус публичности изменён' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async toggleFilePublic(
    @CurrentUser() user: CurrentUserPayload,
    @Param('fileId') fileId: string,
  ) {
    return this.personaService.toggleFilePublic(user.personaId, fileId);
  }
}

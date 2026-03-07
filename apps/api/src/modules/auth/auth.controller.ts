import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, Verify2faDto, VerifyLogin2faDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth - Аутентификация')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Вход в систему',
    description: `
Аутентификация пользователя по логину и паролю.
Возвращает JWT токен для дальнейших запросов.
Если включена 2FA, вернёт \`{ requires2fa: true, userId }\` — нужно вызвать /auth/verify-login-2fa.

**Тестовые аккаунты:**
- \`gridgod/gridgod\` - роль GRIDGOD (администратор)
- \`decker/decker\` - роль DECKER (хакер)
- \`spider/spider\` - роль SPIDER (защитник хоста)
- \`user/user\` - роль USER (обычный пользователь)
    `,
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Успешная аутентификация',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        personaId: 'cuid123',
        role: 'USER',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Неверные учётные данные' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Регистрация нового пользователя',
    description: `
Создание нового аккаунта. **Работает только если ENV переменная \`ENABLE_REGISTER=true\`**.

При регистрации автоматически создаются:
- User (аккаунт)
- Persona (персонаж)
- LLS (личная локальная сеть) с уникальным SIN
- Wallet (кошелёк) с нулевым балансом
    `,
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Успешная регистрация',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        personaId: 'cuid123',
        role: 'USER',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Регистрация отключена или пользователь уже существует' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.username, dto.password, dto.personaName);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Настроить 2FA (получить секрет и otpauth URL)' })
  @ApiResponse({ status: 200, description: 'Секрет и URL для QR-кода' })
  async setup2fa(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.setup2fa(user.userId);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подтвердить 2FA (активировать)' })
  @ApiBody({ type: Verify2faDto })
  @ApiResponse({ status: 200, description: '2FA активирована' })
  async verify2fa(@CurrentUser() user: CurrentUserPayload, @Body() dto: Verify2faDto) {
    return this.authService.verify2fa(user.userId, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отключить 2FA' })
  @ApiResponse({ status: 200, description: '2FA отключена' })
  async disable2fa(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.disable2fa(user.userId);
  }

  @Public()
  @Post('verify-login-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Подтвердить вход с 2FA',
    description: 'Вызывается после login, если вернулся requires2fa: true',
  })
  @ApiBody({ type: VerifyLogin2faDto })
  @ApiResponse({ status: 200, description: 'JWT токен при успешной верификации' })
  async verifyLogin2fa(@Body() dto: VerifyLogin2faDto) {
    return this.authService.verifyLoginCode(dto.userId, dto.code);
  }
}

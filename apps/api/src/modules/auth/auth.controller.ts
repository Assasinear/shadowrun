import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';

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
}

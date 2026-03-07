import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check для Railway / load balancer' })
  @ApiResponse({ status: 200, description: 'Сервис запущен' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

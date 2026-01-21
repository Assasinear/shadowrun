import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GridService } from './grid.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Grid - Публичная сеть')
@Controller('grid')
export class GridController {
  constructor(private gridService: GridService) {}

  @Public()
  @Get('public-hosts')
  @ApiOperation({
    summary: 'Получить публичные хосты',
    description: `
Возвращает список хостов с флагом \`isPublic=true\`.
Публичные хосты видны всем в сети Матрицы.

Включает базовую информацию: название, описание, владелец, паук.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Список публичных хостов',
  })
  async getPublicHosts() {
    return this.gridService.getPublicHosts();
  }

  @Public()
  @Get('public-personas')
  @ApiOperation({
    summary: 'Получить публичные персоны',
    description: `
Возвращает список персон, чья LLS имеет флаг \`isPublic=true\`.
Публичные персоны видны всем в сети Матрицы.

Включает: имя, аватар, профессию, блог.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Список публичных персон',
  })
  async getPublicPersonas() {
    return this.gridService.getPublicPersonas();
  }
}

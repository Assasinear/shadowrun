import { Module } from '@nestjs/common';
import { GridController } from './grid.controller';
import { GridService } from './grid.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GridController],
  providers: [GridService],
})
export class GridModule {}

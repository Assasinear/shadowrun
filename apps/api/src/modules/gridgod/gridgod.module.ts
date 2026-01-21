import { Module } from '@nestjs/common';
import { GridgodController } from './gridgod.controller';
import { GridgodService } from './gridgod.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GridgodController],
  providers: [GridgodService],
})
export class GridgodModule {}

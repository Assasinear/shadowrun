import { Module } from '@nestjs/common';
import { GridgodController } from './gridgod.controller';
import { GridgodService } from './gridgod.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebSocketModule],
  controllers: [GridgodController],
  providers: [GridgodService],
})
export class GridgodModule {}

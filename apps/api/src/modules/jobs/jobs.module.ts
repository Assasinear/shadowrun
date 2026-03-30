import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebSocketModule],
  providers: [JobsService],
})
export class JobsModule {}

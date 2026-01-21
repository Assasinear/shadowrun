import { Module } from '@nestjs/common';
import { DeckingController } from './decking.controller';
import { DeckingService } from './decking.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebSocketModule],
  controllers: [DeckingController],
  providers: [DeckingService],
})
export class DeckingModule {}

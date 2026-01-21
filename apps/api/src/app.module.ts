import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PersonaModule } from './modules/persona/persona.module';
import { DevicesModule } from './modules/devices/devices.module';
import { GridModule } from './modules/grid/grid.module';
import { HostsModule } from './modules/hosts/hosts.module';
import { BankModule } from './modules/bank/bank.module';
import { MessengerModule } from './modules/messenger/messenger.module';
import { DeckingModule } from './modules/decking/decking.module';
import { SpiderModule } from './modules/spider/spider.module';
import { GridgodModule } from './modules/gridgod/gridgod.module';
import { LogsModule } from './modules/logs/logs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    PersonaModule,
    DevicesModule,
    GridModule,
    HostsModule,
    BankModule,
    MessengerModule,
    DeckingModule,
    SpiderModule,
    GridgodModule,
    LogsModule,
    NotificationsModule,
    JobsModule,
    WebSocketModule,
  ],
})
export class AppModule {}

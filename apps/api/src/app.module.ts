import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { SystemSettingsModule } from './common/services/system-settings.module';
import { AppController } from './app.controller';
import { AdminPanelController } from './admin-panel.controller';
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
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'admin', 'dist'),
      serveRoot: '/panel',
      serveStaticOptions: {
        index: false,
        redirect: false,
      },
    }),
    PrismaModule,
    SystemSettingsModule,
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
    NotificationsModule,
    JobsModule,
    WebSocketModule,
    AdminModule,
  ],
  controllers: [AppController, AdminPanelController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../../common/prisma/prisma.module';

import { AdminPersonasController } from './controllers/admin-personas.controller';
import { AdminHostsController } from './controllers/admin-hosts.controller';
import { AdminDevicesController } from './controllers/admin-devices.controller';
import { AdminEconomyController } from './controllers/admin-economy.controller';
import { AdminLogsController } from './controllers/admin-logs.controller';
import { AdminEmergencyController } from './controllers/admin-emergency.controller';
import { AdminFilesController } from './controllers/admin-files.controller';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { AdminHackSessionsController } from './controllers/admin-hack-sessions.controller';
import { AdminMessagesController } from './controllers/admin-messages.controller';
import { AdminBlogPostsController } from './controllers/admin-blog-posts.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminPaymentRequestsController } from './controllers/admin-payment-requests.controller';
import { AdminAccessTokensController } from './controllers/admin-access-tokens.controller';
import { AdminLicensesController } from './controllers/admin-licenses.controller';

import { AdminPersonasService } from './services/admin-personas.service';
import { AdminHostsService } from './services/admin-hosts.service';
import { AdminDevicesService } from './services/admin-devices.service';
import { AdminEconomyService } from './services/admin-economy.service';
import { AdminLogsService } from './services/admin-logs.service';
import { AdminEmergencyService } from './services/admin-emergency.service';
import { AdminFilesService } from './services/admin-files.service';
import { AdminRolesService } from './services/admin-roles.service';
import { AdminSettingsService } from './services/admin-settings.service';
import { AdminHackSessionsService } from './services/admin-hack-sessions.service';
import { AdminMessagesService } from './services/admin-messages.service';
import { AdminBlogPostsService } from './services/admin-blog-posts.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { AdminPaymentRequestsService } from './services/admin-payment-requests.service';
import { AdminAccessTokensService } from './services/admin-access-tokens.service';
import { AdminLicensesService } from './services/admin-licenses.service';

import { AdminLogInterceptor } from './admin-log.interceptor';
import { IpRestrictionGuard } from '../../common/guards/ip-restriction.guard';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebSocketModule],
  controllers: [
    AdminPersonasController,
    AdminHostsController,
    AdminDevicesController,
    AdminEconomyController,
    AdminLogsController,
    AdminEmergencyController,
    AdminFilesController,
    AdminRolesController,
    AdminSettingsController,
    AdminHackSessionsController,
    AdminMessagesController,
    AdminBlogPostsController,
    AdminNotificationsController,
    AdminPaymentRequestsController,
    AdminAccessTokensController,
    AdminLicensesController,
  ],
  providers: [
    AdminPersonasService,
    AdminHostsService,
    AdminDevicesService,
    AdminEconomyService,
    AdminLogsService,
    AdminEmergencyService,
    AdminFilesService,
    AdminRolesService,
    AdminSettingsService,
    AdminHackSessionsService,
    AdminMessagesService,
    AdminBlogPostsService,
    AdminNotificationsService,
    AdminPaymentRequestsService,
    AdminAccessTokensService,
    AdminLicensesService,
    AdminLogInterceptor,
    {
      provide: APP_GUARD,
      useClass: IpRestrictionGuard,
    },
  ],
})
export class AdminModule {}

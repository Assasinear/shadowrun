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

import { AdminPersonasService } from './services/admin-personas.service';
import { AdminHostsService } from './services/admin-hosts.service';
import { AdminDevicesService } from './services/admin-devices.service';
import { AdminEconomyService } from './services/admin-economy.service';
import { AdminLogsService } from './services/admin-logs.service';
import { AdminEmergencyService } from './services/admin-emergency.service';
import { AdminFilesService } from './services/admin-files.service';
import { AdminRolesService } from './services/admin-roles.service';
import { AdminSettingsService } from './services/admin-settings.service';

import { AdminLogInterceptor } from './admin-log.interceptor';
import { IpRestrictionGuard } from '../../common/guards/ip-restriction.guard';

@Module({
  imports: [PrismaModule],
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
    AdminLogInterceptor,
    {
      provide: APP_GUARD,
      useClass: IpRestrictionGuard,
    },
  ],
})
export class AdminModule {}

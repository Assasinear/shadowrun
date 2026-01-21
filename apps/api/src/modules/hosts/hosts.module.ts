import { Module } from '@nestjs/common';
import { HostsController } from './hosts.controller';
import { HostsService } from './hosts.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PersonaModule } from '../persona/persona.module';

@Module({
  imports: [PrismaModule, PersonaModule],
  controllers: [HostsController],
  providers: [HostsService],
})
export class HostsModule {}

import { Module } from '@nestjs/common';
import { PersonaController } from './persona.controller';
import { PersonaService } from './persona.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { QrService } from './qr.service';

@Module({
  imports: [PrismaModule],
  controllers: [PersonaController],
  providers: [PersonaService, QrService],
  exports: [PersonaService, QrService],
})
export class PersonaModule {}

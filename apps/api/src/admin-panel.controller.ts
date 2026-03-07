import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { Public } from './common/decorators/public.decorator';

const ADMIN_INDEX_PATH = join(__dirname, '..', '..', '..', 'admin', 'dist', 'index.html');

let cachedHtml: string | null = null;

function getIndexHtml(): string | null {
  if (cachedHtml) return cachedHtml;
  if (existsSync(ADMIN_INDEX_PATH)) {
    cachedHtml = readFileSync(ADMIN_INDEX_PATH, 'utf-8');
    return cachedHtml;
  }
  return null;
}

@ApiExcludeController()
@Controller('panel')
export class AdminPanelController {
  @Public()
  @Get()
  serveRoot(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('login')
  serveLogin(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('personas')
  servePersonas(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('personas/:id')
  servePersonaDetail(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('hosts')
  serveHosts(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('hosts/:id')
  serveHostDetail(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('devices')
  serveDevices(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('economy')
  serveEconomy(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('economy/transactions')
  serveTransactions(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('logs')
  serveLogs(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('emergency')
  serveEmergency(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('files')
  serveFiles(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('roles')
  serveRoles(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('settings')
  serveSettings(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  @Public()
  @Get('security')
  serveSecurity(@Res() reply: any) {
    return this.serveIndex(reply);
  }

  private serveIndex(reply: any) {
    const html = getIndexHtml();
    if (html) {
      return reply.header('content-type', 'text/html; charset=utf-8').send(html);
    }
    return reply.code(404).send('Admin panel not built. Run: pnpm build:admin');
  }
}

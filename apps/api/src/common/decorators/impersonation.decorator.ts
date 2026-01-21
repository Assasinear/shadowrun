import { Injectable, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class ImpersonationService {
  async getPersonaId(context: ExecutionContext, currentPersonaId: string, currentRole: Role): Promise<string> {
    const request = context.switchToHttp().getRequest();
    const impersonationHeader = request.headers['x-persona-id'];
    
    if (impersonationHeader && process.env.ALLOW_IMPERSONATION_HEADER === 'true') {
      if (currentRole === 'GRIDGOD') {
        return impersonationHeader;
      }
    }
    
    return currentPersonaId;
  }
}

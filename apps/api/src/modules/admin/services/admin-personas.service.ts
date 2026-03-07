import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePersonaDto, UpdatePersonaDto } from '../dto/admin-personas.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class AdminPersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    search?: string;
    role?: string;
    isBlocked?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { lls: { sin: { contains: filters.search, mode: 'insensitive' } } },
        { user: { username: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.role) {
      where.user = { ...where.user, role: filters.role };
    }
    if (filters.isBlocked !== undefined) {
      where.user = { ...where.user, isBlocked: filters.isBlocked };
    }

    const [items, total] = await Promise.all([
      this.prisma.persona.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, role: true, isBlocked: true } },
          lls: true,
          wallet: true,
          licenses: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.persona.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: {
        user: { select: { id: true, username: true, role: true, isBlocked: true, createdAt: true } },
        lls: true,
        wallet: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } } },
        licenses: true,
        devices: true,
        files: true,
        ownedHosts: { select: { id: true, name: true } },
        spiderHosts: { select: { id: true, name: true } },
        accessTokens: true,
      },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return persona;
  }

  async create(dto: CreatePersonaDto, adminUserId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const sin = dto.sinNumber || this.generateSin();

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          password: hashedPassword,
          role: dto.role ?? Role.USER,
        },
      });

      const persona = await tx.persona.create({
        data: {
          userId: user.id,
          name: dto.personaName,
          avatar: dto.avatar,
          address: dto.address,
          profession: dto.profession,
          extraInfo: dto.extraInfo,
        },
      });

      const lls = await tx.lls.create({
        data: {
          personaId: persona.id,
          sin,
        },
      });

      const wallet = await tx.wallet.create({
        data: {
          personaId: persona.id,
          balance: dto.initialBalance ?? 0,
        },
      });

      await tx.adminLog.create({
        data: {
          action: 'CREATE_PERSONA',
          adminUserId,
          targetType: 'persona',
          targetId: persona.id,
          details: { username: dto.username, personaName: dto.personaName, role: dto.role },
        },
      });

      return { user: { id: user.id, username: user.username, role: user.role }, persona, lls, wallet };
    });

    return result;
  }

  async update(personaId: string, dto: UpdatePersonaDto) {
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return this.prisma.persona.update({
      where: { id: personaId },
      data: {
        name: dto.name,
        avatar: dto.avatar,
        address: dto.address,
        profession: dto.profession,
        extraInfo: dto.extraInfo,
        isPublic: dto.isPublic,
      },
    });
  }

  async changeRole(personaId: string, role: Role) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { userId: true },
    });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return this.prisma.user.update({
      where: { id: persona.userId },
      data: { role },
      select: { id: true, username: true, role: true },
    });
  }

  async block(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { userId: true },
    });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return this.prisma.user.update({
      where: { id: persona.userId },
      data: { isBlocked: true },
      select: { id: true, username: true, isBlocked: true },
    });
  }

  async unblock(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { userId: true },
    });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return this.prisma.user.update({
      where: { id: persona.userId },
      data: { isBlocked: false },
      select: { id: true, username: true, isBlocked: true },
    });
  }

  async remove(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { userId: true },
    });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    await this.prisma.user.delete({ where: { id: persona.userId } });
    return { success: true };
  }

  async issueLicenses(
    personaId: string,
    licenses: { type: string; name: string; description?: string }[],
    issuedBy?: string,
  ) {
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    const created = await Promise.all(
      licenses.map((lic) =>
        this.prisma.license.create({
          data: {
            personaId,
            type: lic.type,
            name: lic.name,
            description: lic.description,
            issuedBy,
          },
        }),
      ),
    );

    return created;
  }

  async removeLicense(licenseId: string) {
    const license = await this.prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) {
      throw new NotFoundException('License not found');
    }

    await this.prisma.license.delete({ where: { id: licenseId } });
    return { success: true };
  }

  async generateSinQr(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { lls: true },
    });
    if (!persona || !persona.lls) {
      throw new NotFoundException('Persona or LLS not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const qrToken = await this.prisma.qrToken.create({
      data: {
        token,
        type: 'SIN',
        payload: { personaId, sin: persona.lls.sin, personaName: persona.name },
        expiresAt,
      },
    });

    const qrDataUrl = await QRCode.toDataURL(qrToken.token, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return { token: qrToken.token, qrDataUrl, sin: persona.lls.sin };
  }

  async resetPassword(personaId: string, newPassword: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { userId: true },
    });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id: persona.userId },
      data: { password: hashedPassword },
      select: { id: true, username: true },
    });
  }

  async massBlock(personaIds: string[]) {
    const personas = await this.prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { userId: true },
    });
    const userIds = personas.map((p) => p.userId);
    return this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isBlocked: true },
    });
  }

  async massUnblock(personaIds: string[]) {
    const personas = await this.prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { userId: true },
    });
    const userIds = personas.map((p) => p.userId);
    return this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isBlocked: false },
    });
  }

  async massDelete(personaIds: string[]) {
    const personas = await this.prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { userId: true },
    });
    const userIds = personas.map((p) => p.userId);
    return this.prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  async massSetBalance(personaIds: string[], balance: number) {
    return this.prisma.wallet.updateMany({
      where: { personaId: { in: personaIds } },
      data: { balance },
    });
  }

  async massChangeRole(personaIds: string[], role: string) {
    const personas = await this.prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { userId: true },
    });
    const userIds = personas.map((p) => p.userId);
    return this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { role: role as Role },
    });
  }

  private generateSin(): string {
    const segments = [
      'SIN',
      '2080',
      crypto.randomBytes(2).toString('hex').toUpperCase(),
      crypto.randomBytes(2).toString('hex').toUpperCase(),
    ];
    return segments.join('-');
  }
}

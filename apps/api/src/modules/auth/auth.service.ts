import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { persona: true },
    });

    if (!user || !user.persona) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      personaId: user.persona.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      personaId: user.persona.id,
      role: user.role,
    };
  }

  async register(username: string, password: string, personaName: string) {
    if (process.env.ENABLE_REGISTER !== 'true') {
      throw new BadRequestException('Registration is disabled');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sin = `SIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'USER',
        },
      });

      const persona = await tx.persona.create({
        data: {
          userId: newUser.id,
          name: personaName,
        },
      });

      await tx.lls.create({
        data: {
          personaId: persona.id,
          sin,
        },
      });

      await tx.wallet.create({
        data: {
          personaId: persona.id,
          balance: 0,
        },
      });

      return { user: newUser, persona };
    });

    const payload = {
      sub: user.user.id,
      personaId: user.persona.id,
      role: user.user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      personaId: user.persona.id,
      role: user.user.role,
    };
  }
}

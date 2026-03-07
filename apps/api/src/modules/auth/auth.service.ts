import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

function generateTOTP(secret: string, timeStep?: number): string {
  const step = timeStep ?? Math.floor(Date.now() / 1000 / 30);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(step, 4);

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
}

function verifyTOTP(secret: string, code: string): boolean {
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (let i = -1; i <= 1; i++) {
    if (generateTOTP(secret, currentStep + i) === code) {
      return true;
    }
  }
  return false;
}

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

    if (user.is2faEnabled) {
      return {
        requires2fa: true,
        userId: user.id,
      };
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

  async setup2fa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.is2faEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = generateSecret();

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret },
    });

    const issuer = 'Shadowrun';
    const otpauthUrl = `otpauth://totp/${issuer}:${user.username}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      otpauthUrl,
    };
  }

  async verify2fa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      throw new BadRequestException('2FA setup not started');
    }

    if (!verifyTOTP(user.totpSecret, code)) {
      throw new ForbiddenException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { is2faEnabled: true },
    });

    return { success: true, message: '2FA enabled successfully' };
  }

  async disable2fa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, is2faEnabled: false },
    });

    return { success: true, message: '2FA disabled' };
  }

  async verifyLoginCode(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { persona: true },
    });

    if (!user || !user.persona) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is2faEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    if (!verifyTOTP(user.totpSecret, code)) {
      throw new ForbiddenException('Invalid 2FA code');
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
}

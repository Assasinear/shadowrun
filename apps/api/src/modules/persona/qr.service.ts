import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QrTokenType } from '@prisma/client';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  constructor(private prisma: PrismaService) {}

  async createQrToken(type: QrTokenType, payload: any, generateImage = true) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 часа

    const qrToken = await this.prisma.qrToken.create({
      data: {
        token,
        type,
        payload,
        expiresAt,
      },
    });

    let qrDataUrl: string | undefined;
    if (generateImage) {
      try {
        // Генерируем QR-код как Data URL (base64 PNG)
        qrDataUrl = await QRCode.toDataURL(token, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      } catch (e) {
        console.warn('Failed to generate QR image:', e);
      }
    }

    return {
      token: qrToken.token,
      payload: qrToken.payload,
      type: qrToken.type,
      qrDataUrl, // base64 PNG image: "data:image/png;base64,..."
    };
  }

  async getQrToken(token: string) {
    const qrToken = await this.prisma.qrToken.findUnique({
      where: { token },
      include: { paymentRequest: true },
    });

    if (!qrToken) {
      return null;
    }

    if (qrToken.expiresAt && qrToken.expiresAt < new Date()) {
      return null;
    }

    return qrToken;
  }

  async generateQrImage(content: string): Promise<string> {
    return QRCode.toDataURL(content, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(personaId: string, type: string, payload?: any) {
    return this.prisma.notification.create({
      data: {
        personaId,
        type,
        payload,
      },
    });
  }

  async getNotifications(personaId: string, limit: number = 50) {
    return this.prisma.notification.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, personaId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        personaId,
      },
      data: {
        readAt: new Date(),
      },
    });
  }
}

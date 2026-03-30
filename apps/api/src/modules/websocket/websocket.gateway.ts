import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Notification } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SystemSettingsService } from '../../common/services/system-settings.service';
import { NotificationsService } from '../notifications/notifications.service';

@WSGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private personaSockets = new Map<string, string[]>(); // personaId -> socketIds[]

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private settings: SystemSettingsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { persona: true },
      });

      if (!user || !user.persona) {
        client.disconnect();
        return;
      }

      client.data.personaId = user.persona.id;
      client.data.role = user.role;

      if (!this.personaSockets.has(user.persona.id)) {
        this.personaSockets.set(user.persona.id, []);
      }
      this.personaSockets.get(user.persona.id)?.push(client.id);

      console.log(`WebSocket connected: ${user.persona.id} (${client.id})`);
    } catch (error) {
      console.error('WebSocket auth error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const personaId = client.data.personaId;
    if (personaId) {
      const sockets = this.personaSockets.get(personaId);
      if (sockets) {
        const index = sockets.indexOf(client.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          this.personaSockets.delete(personaId);
        }
      }
    }
    console.log(`WebSocket disconnected: ${client.id}`);
  }

  /** Сохраняет уведомление в БД и доставляет по WebSocket (если включено в настройках). */
  async sendNotification(personaId: string, notification: { type: string; payload?: any }) {
    const created = await this.notificationsService.createNotification(
      personaId,
      notification.type,
      notification.payload,
    );
    await this.emitNotificationRecord(created);
    return created;
  }

  /** Только WebSocket для уже сохранённых записей (например массовая рассылка). */
  async emitNotificationRecord(record: Notification) {
    if (!(await this.settings.getBoolean('push_notifications_enabled', true))) {
      return;
    }
    const payload = this.serializeNotification(record);
    const sockets = this.personaSockets.get(record.personaId);
    if (sockets?.length) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification:new', payload);
      });
    }
  }

  async emitNotificationRecords(records: Notification[]) {
    if (records.length === 0) return;
    if (!(await this.settings.getBoolean('push_notifications_enabled', true))) {
      return;
    }
    for (const record of records) {
      const payload = this.serializeNotification(record);
      const sockets = this.personaSockets.get(record.personaId);
      sockets?.forEach((socketId) => {
        this.server.to(socketId).emit('notification:new', payload);
      });
    }
  }

  private serializeNotification(record: Notification) {
    return JSON.parse(
      JSON.stringify({
        id: record.id,
        personaId: record.personaId,
        type: record.type,
        payload: record.payload,
        readAt: record.readAt,
        createdAt: record.createdAt,
      }),
    );
  }

  notifyBalanceUpdate(personaId: string, balance: number) {
    const sockets = this.personaSockets.get(personaId);
    if (sockets && sockets.length > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('bank:balanceUpdated', { balance });
      });
    }
  }

  sendSpiderAlert(personaId: string, hostId: string, hackSessionId: string) {
    const sockets = this.personaSockets.get(personaId);
    if (sockets && sockets.length > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('spider:alert', { hostId, hackSessionId });
      });
    }
  }

  sendGridLog(logEntry: any) {
    // Отправляем всем gridgod
    this.personaSockets.forEach((sockets, personaId) => {
      // Проверяем роль через подключённые сокеты (упрощённо)
      sockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket?.data.role === 'GRIDGOD') {
          this.server.to(socketId).emit('grid:log', logEntry);
        }
      });
    });
  }
}

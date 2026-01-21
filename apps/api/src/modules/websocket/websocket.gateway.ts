import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
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

  sendNotification(personaId: string, notification: { type: string; payload?: any }) {
    const sockets = this.personaSockets.get(personaId);
    if (sockets && sockets.length > 0) {
      this.notificationsService.createNotification(personaId, notification.type, notification.payload);
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification:new', notification);
      });
    }
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

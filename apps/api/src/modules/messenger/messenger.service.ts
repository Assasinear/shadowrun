import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SystemSettingsService } from '../../common/services/system-settings.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { SendMessageDto } from './dto/messenger.dto';
import { MessageTargetType } from '@prisma/client';

@Injectable()
export class MessengerService {
  constructor(
    private prisma: PrismaService,
    private settings: SystemSettingsService,
    private wsGateway: WebSocketGateway,
  ) {}

  async getChats(personaId: string) {
    // Получаем все диалоги где персона является отправителем или получателем
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderType: 'PERSONA', senderPersonaId: personaId },
          { receiverType: 'PERSONA', receiverPersonaId: personaId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Группируем по собеседникам
    const chats = new Map<string, any>();

    for (const msg of messages) {
      let chatKey: string;
      let targetType: MessageTargetType;
      let targetId: string;

      if (msg.senderType === 'PERSONA' && msg.senderPersonaId === personaId) {
        targetType = msg.receiverType;
        targetId = msg.receiverType === 'PERSONA' ? msg.receiverPersonaId! : msg.receiverHostId!;
        chatKey = `${targetType}:${targetId}`;
      } else {
        targetType = msg.senderType;
        targetId = msg.senderType === 'PERSONA' ? msg.senderPersonaId! : msg.senderHostId!;
        chatKey = `${targetType}:${targetId}`;
      }

      if (!chats.has(chatKey)) {
        chats.set(chatKey, {
          targetType,
          targetId,
          lastMessage: msg,
        });
      }
    }

    return Array.from(chats.values());
  }

  async getChat(personaId: string, targetType: MessageTargetType, targetId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          {
            senderType: 'PERSONA',
            senderPersonaId: personaId,
            receiverType: targetType,
            ...(targetType === 'PERSONA' ? { receiverPersonaId: targetId } : { receiverHostId: targetId }),
          },
          {
            senderType: targetType,
            ...(targetType === 'PERSONA' ? { senderPersonaId: targetId } : { senderHostId: targetId }),
            receiverType: 'PERSONA',
            receiverPersonaId: personaId,
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  async sendMessage(personaId: string, dto: SendMessageDto) {
    if (!(await this.settings.getBoolean('messenger_enabled', true))) {
      throw new ForbiddenException('Messenger is currently disabled');
    }

    if (dto.text.length > 280) {
      throw new Error('Message text must be <= 280 characters');
    }

    // Проверка существования получателя
    if (dto.targetType === 'PERSONA') {
      const target = await this.prisma.persona.findUnique({
        where: { id: dto.targetId },
      });
      if (!target) {
        throw new NotFoundException('Target persona not found');
      }
    } else {
      const target = await this.prisma.host.findUnique({
        where: { id: dto.targetId },
      });
      if (!target) {
        throw new NotFoundException('Target host not found');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        senderType: 'PERSONA',
        senderPersonaId: personaId,
        receiverType: dto.targetType,
        receiverPersonaId: dto.targetType === 'PERSONA' ? dto.targetId : null,
        receiverHostId: dto.targetType === 'HOST' ? dto.targetId : null,
        text: dto.text,
      },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'message_sent',
        actorPersonaId: personaId,
        targetPersonaId: dto.targetType === 'PERSONA' ? dto.targetId : null,
        metaJson: { messageId: message.id, targetType: dto.targetType },
      },
    });

    if (dto.targetType === 'PERSONA') {
      try {
        await this.wsGateway.sendNotification(dto.targetId, {
          type: 'message_received',
          payload: {
            messageId: message.id,
            senderPersonaId: personaId,
            textPreview: dto.text.length > 120 ? `${dto.text.slice(0, 120)}…` : dto.text,
          },
        });
      } catch (e) {
        console.warn('message_received notification failed:', e);
      }
    }

    return message;
  }
}

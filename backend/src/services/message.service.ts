import { prisma } from '../config/database';
import { Message, MessageDirection, ConversationStatus } from '@prisma/client';
import { evolutionRequest } from '../config/evolution';

interface CreateMessageDTO {
  content: string;
  direction: MessageDirection;
  conversationId: string;
  instanceId: string;
  timestamp?: Date;
}

export const messageService = {
  async create(data: CreateMessageDTO): Promise<Message> {
    const timestamp = data.timestamp || new Date();

    // Atualiza analytics
    await this.updateAnalytics(data.instanceId, data.direction);

    return prisma.message.create({
      data: {
        ...data,
        timestamp,
      },
      include: {
        conversation: {
          include: {
            agent: true,
            lead: true,
          },
        },
      },
    });
  },

  async findByConversation(conversationId: string, limit = 50): Promise<Message[]> {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  },

  async sendWhatsAppMessage(instanceId: string, phoneNumber: string, content: string): Promise<void> {
    const number = phoneNumber.replace(/\D/g, '');

    await evolutionRequest(instanceId, 'message/sendText', {
      method: 'POST',
      body: JSON.stringify({
        number,
        textMessage: {
          text: content,
        },
      }),
    });
  },

  async updateAnalytics(instanceId: string, direction: MessageDirection): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const field = direction === MessageDirection.OUTBOUND ? 'messagesSent' : 'messagesReceived';

    await prisma.analytics.upsert({
      where: {
        date_instanceId: {
          date: today,
          instanceId,
        },
      },
      update: {
        [field]: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        date: today,
        instanceId,
        [field]: 1,
      },
    });
  },
};

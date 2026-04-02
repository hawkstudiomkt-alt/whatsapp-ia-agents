import { prisma } from '../config/database';
import { messageService } from './message.service';

export const conversationService = {
  async findAll(instanceId?: string) {
    return prisma.conversation.findMany({
      where: instanceId ? { instanceId } : undefined,
      include: {
        agent: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, phone: true, status: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        agent: true,
        lead: true,
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 100,
        },
      },
    });
  },

  async getMessages(conversationId: string, limit = 50) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  },

  async saveOutboundMessage(conversationId: string, instanceId: string, content: string) {
    // Busca a conversa para garantir que existe
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return messageService.create({
      content,
      direction: 'OUTBOUND',
      conversationId,
      instanceId,
      timestamp: new Date(),
    });
  },

  async updateStatus(id: string, status: 'ACTIVE' | 'CLOSED' | 'TRANSFERRED') {
    return prisma.conversation.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  },
};

import { FastifyRequest, FastifyReply } from 'fastify';
import { conversationService } from '../services/conversation.service';
import { z } from 'zod';

const saveMessageSchema = z.object({
  content: z.string().min(1),
  instanceId: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'CLOSED', 'TRANSFERRED']),
});

export const conversationController = {
  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    const conversations = await conversationService.findAll(instanceId);
    return reply.send(conversations);
  },

  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const conversation = await conversationService.findById(id);
    if (!conversation) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }
    return reply.send(conversation);
  },

  async getMessages(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { limit } = request.query as { limit?: string };
    const messages = await conversationService.getMessages(
      id,
      limit ? parseInt(limit, 10) : 50
    );
    return reply.send(messages);
  },

  async saveOutboundMessage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
      const { content, instanceId } = saveMessageSchema.parse(request.body);
      const message = await conversationService.saveOutboundMessage(id, instanceId, content);
      return reply.status(201).send(message);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Conversation not found') {
        return reply.status(404).send({ error: 'Conversation not found' });
      }
      throw error;
    }
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { status } = updateStatusSchema.parse(request.body);
    const conversation = await conversationService.updateStatus(id, status);
    return reply.send(conversation);
  },
};

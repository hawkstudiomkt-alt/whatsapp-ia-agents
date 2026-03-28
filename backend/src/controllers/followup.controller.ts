import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { z } from 'zod';

const createFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(['REMINDER', 'NO_RESPONSE', 'CUSTOM']),
  scheduledFor: z.string().datetime(),
  notes: z.string().optional(),
});

export const followupController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createFollowUpSchema.parse(request.body);

    const followup = await prisma.leadFollowUp.create({
      data: {
        leadId: data.leadId,
        type: data.type,
        scheduledFor: new Date(data.scheduledFor),
        notes: data.notes,
        status: 'PENDING',
      },
    });

    return reply.status(201).send(followup);
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const followups = await prisma.leadFollowUp.findMany({
      include: {
        lead: true,
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    return reply.send(followups);
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    await prisma.leadFollowUp.delete({
      where: { id },
    });

    return reply.status(204).send();
  },
};

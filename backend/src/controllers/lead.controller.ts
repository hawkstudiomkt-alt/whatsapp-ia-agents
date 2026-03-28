import { FastifyRequest, FastifyReply } from 'fastify';
import { leadService } from '../services/lead.service';
import { LeadStatus } from '@prisma/client';
import { z } from 'zod';

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['NEW', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED']).optional(),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const createLeadSchema = z.object({
  phone: z.string().min(8),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  instanceId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

export const leadController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createLeadSchema.parse(request.body);
    const existing = await leadService.findByPhone(data.phone);
    
    if (existing) {
      return reply.status(400).send({ error: 'Lead with this phone already exists' });
    }

    const lead = await leadService.create(data);
    return reply.status(201).send(lead);
  },
  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const { status } = request.query as { status?: LeadStatus };
    const leads = await leadService.findAll(status);
    return reply.send(leads);
  },

  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const lead = await leadService.findById(id);

    if (!lead) {
      return reply.status(404).send({ error: 'Lead not found' });
    }

    return reply.send(lead);
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = updateLeadSchema.parse(request.body);

    try {
      const lead = await leadService.update(id, data);
      return reply.send(lead);
    } catch {
      return reply.status(404).send({ error: 'Lead not found' });
    }
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: LeadStatus };

    try {
      const lead = await leadService.updateStatus(id, status);
      return reply.send(lead);
    } catch {
      return reply.status(404).send({ error: 'Lead not found' });
    }
  },
};

import { FastifyRequest, FastifyReply } from 'fastify';
import { agentService } from '../services/agent.service';
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().min(1),
  systemPrompt: z.string().min(1),
  instanceId: z.string().uuid(),
  tone: z.string().optional(),
  language: z.string().optional(),
  aiModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  historyLimit: z.number().int().min(1).max(50).optional(),
  guardrails: z.string().optional(),
  humanInterventionEnabled: z.boolean().optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'STOPPED']).optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
  aiModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  historyLimit: z.number().int().min(1).max(50).optional(),
  guardrails: z.string().optional(),
  humanInterventionEnabled: z.boolean().optional(),
});

export const agentController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createAgentSchema.parse(request.body);
    const agent = await agentService.create(data);
    return reply.status(201).send(agent);
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const agents = await agentService.findAll();
    return reply.send(agents);
  },

  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const agent = await agentService.findById(id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    return reply.send(agent);
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = updateAgentSchema.parse(request.body);
    try {
      const agent = await agentService.update(id, data);
      return reply.send(agent);
    } catch {
      return reply.status(404).send({ error: 'Agent not found' });
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
      await agentService.delete(id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Agent not found' });
    }
  },

  async findByInstance(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.params as { instanceId: string };
    const agents = await agentService.findByInstance(instanceId);
    return reply.send(agents);
  },
};

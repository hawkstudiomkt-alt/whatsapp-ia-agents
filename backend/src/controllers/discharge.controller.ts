import { FastifyRequest, FastifyReply } from 'fastify';
import { dischargeService } from '../services/discharge.service';
import { z } from 'zod';

const createDischargeSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1),
  phoneList: z.array(z.string()).min(1),
  message: z.string().min(1),
  delaySeconds: z.number().min(5).max(300).optional(),
  scheduledFor: z.string().datetime().optional(),
  useAI: z.boolean().optional(),
  // JSON string com array de variações: '["Oi {nome}!", "Olá {nome}!"]'
  aiIdeas: z.string().optional(),
  // Config pós-envio
  postSendConfig: z.any().optional(),
});

export const dischargeController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createDischargeSchema.parse(request.body);
    const discharge = await dischargeService.create({
      ...data,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
    });
    return reply.status(201).send(discharge);
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const discharges = await dischargeService.findAll();
    return reply.send(discharges);
  },

  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const discharge = await dischargeService.findById(id);

    if (!discharge) {
      return reply.status(404).send({ error: 'Discharge not found' });
    }

    return reply.send(discharge);
  },

  async start(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      await dischargeService.startDischarge(id);
      return reply.status(200).send({ success: true, message: 'Discharge started' });
    } catch (error: unknown) {
      return reply.status(500).send({
        error: 'Failed to start discharge',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      const discharge = await dischargeService.cancelDischarge(id);
      return reply.send(discharge);
    } catch {
      return reply.status(404).send({ error: 'Discharge not found' });
    }
  },
};

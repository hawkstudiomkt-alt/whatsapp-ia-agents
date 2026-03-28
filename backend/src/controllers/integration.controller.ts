import { FastifyRequest, FastifyReply } from 'fastify';
import { integrationService } from '../services/integration.service';
import { IntegrationType } from '@prisma/client';
import { z } from 'zod';

const upsertIntegrationSchema = z.object({
  instanceId: z.string().uuid(),
  type: z.enum(['GOOGLE_CALENDAR', 'NOTION', 'OTHER_CRM']),
  config: z.record(z.any()),
  isActive: z.boolean().optional(),
});

export const integrationController = {
  async upsert(request: FastifyRequest, reply: FastifyReply) {
    const data = upsertIntegrationSchema.parse(request.body);
    const integration = await integrationService.upsert(data as any);
    return reply.send(integration);
  },

  async findByInstance(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.params as { instanceId: string };
    const integrations = await integrationService.findByInstance(instanceId);
    return reply.send(integrations);
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId, type } = request.params as { instanceId: string; type: IntegrationType };
    await integrationService.delete(instanceId, type);
    return reply.status(204).send();
  },
};

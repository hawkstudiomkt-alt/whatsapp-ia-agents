import { FastifyRequest, FastifyReply } from 'fastify';
import { campaignService } from '../services/campaign.service';
import { z } from 'zod';

const contactSchema = z.object({
  phone: z.string().min(8),
  name: z.string().optional(),
  variables: z.record(z.string()).optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1),
  instanceId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  message: z.string().min(1),
  useAsBase: z.boolean().optional(),
  intervalMin: z.number().min(3).max(300).optional(),
  intervalMax: z.number().min(3).max(600).optional(),
  scheduledFor: z.string().datetime().optional(),
  contacts: z.array(contactSchema).min(1),
});

export const campaignController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createCampaignSchema.parse(request.body);
      const campaign = await campaignService.create({
        ...data,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      });
      return reply.status(201).send(campaign);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validação falhou', details: error.errors });
      }
      request.log.error(error);
      return reply.status(500).send({ error: error.message });
    }
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    const campaigns = await campaignService.findAll(instanceId);
    return reply.send(campaigns);
  },

  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const campaign = await campaignService.findById(id);
    if (!campaign) return reply.status(404).send({ error: 'Campanha não encontrada' });
    return reply.send(campaign);
  },

  async trigger(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
      const campaign = await campaignService.trigger(id);
      return reply.send({ success: true, message: 'Campanha iniciada', campaignId: campaign.id });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  },

  // Called by n8n after each message is sent
  async updateContactStatus(request: FastifyRequest, reply: FastifyReply) {
    const { contactId } = request.params as { contactId: string };
    const { status, errorMessage } = request.body as {
      status: 'SENT' | 'FAILED' | 'SKIPPED';
      errorMessage?: string;
    };
    try {
      const contact = await campaignService.updateContactStatus(
        contactId,
        status as any,
        errorMessage,
      );
      return reply.send(contact);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  },

  // Called by n8n to create/update lead from campaign contact
  async upsertLead(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const contact = request.body as { phone: string; name?: string; variables?: any };
    try {
      const campaign = await campaignService.findById(id);
      if (!campaign) return reply.status(404).send({ error: 'Campanha não encontrada' });
      const lead = await campaignService.upsertLeadFromContact(contact, {
        instanceId: campaign.instanceId,
        agentId: campaign.agentId,
        name: campaign.name,
      });
      return reply.send(lead);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  },

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    const stats = await campaignService.getStats(instanceId);
    return reply.send(stats);
  },

  async getAllContacts(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    const contacts = await campaignService.getAllContacts(instanceId);
    return reply.send(contacts);
  },

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
      const campaign = await campaignService.cancel(id);
      return reply.send(campaign);
    } catch {
      return reply.status(404).send({ error: 'Campanha não encontrada' });
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
      await campaignService.delete(id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Campanha não encontrada' });
    }
  },
};

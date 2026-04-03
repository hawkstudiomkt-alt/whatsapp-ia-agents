import { prisma } from '../config/database';
import { CampaignStatus, CampaignContactStatus } from '@prisma/client';

interface ContactInput {
  phone: string;
  name?: string;
  variables?: Record<string, string>;
}

export const campaignService = {
  async create(data: {
    name: string;
    instanceId: string;
    agentId?: string;
    message: string;
    useAsBase?: boolean;
    intervalMin?: number;
    intervalMax?: number;
    scheduledFor?: Date;
    contacts: ContactInput[];
  }) {
    return prisma.campaign.create({
      data: {
        name: data.name,
        instanceId: data.instanceId,
        agentId: data.agentId || null,
        message: data.message,
        useAsBase: data.useAsBase ?? false,
        intervalMin: data.intervalMin ?? 5,
        intervalMax: data.intervalMax ?? 15,
        scheduledFor: data.scheduledFor,
        contacts: {
          create: data.contacts.map(c => ({
            phone: c.phone,
            name: c.name,
            variables: c.variables ?? undefined,
          })),
        },
      },
      include: {
        contacts: true,
        instance: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        _count: { select: { contacts: true } },
      },
    });
  },

  async findAll(instanceId?: string) {
    return prisma.campaign.findMany({
      where: instanceId ? { instanceId } : undefined,
      include: {
        instance: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        contacts: { select: { status: true } },
        _count: { select: { contacts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        instance: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        contacts: { orderBy: { createdAt: 'asc' } },
        _count: { select: { contacts: true } },
      },
    });
  },

  async trigger(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        contacts: { where: { status: CampaignContactStatus.PENDING } },
        instance: true,
        agent: true,
      },
    });

    if (!campaign) throw new Error('Campanha não encontrada');
    if (campaign.status === CampaignStatus.RUNNING) throw new Error('Campanha já está em execução');
    if (campaign.contacts.length === 0) throw new Error('Nenhum contato pendente para disparar');

    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
    });

    const n8nUrl = process.env.N8N_CAMPAIGN_WEBHOOK_URL;
    if (!n8nUrl) {
      // Fallback: mark as failed if n8n not configured
      await prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.FAILED } });
      throw new Error('N8N_CAMPAIGN_WEBHOOK_URL não configurado nas variáveis de ambiente');
    }

    const payload = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      instanceName: campaign.instance.name,
      agentId: campaign.agentId,
      message: campaign.message,
      useAsBase: campaign.useAsBase,
      intervalMin: campaign.intervalMin,
      intervalMax: campaign.intervalMax,
      backendUrl: process.env.BACKEND_URL,
      contacts: campaign.contacts.map(c => ({
        id: c.id,
        phone: c.phone,
        name: c.name || '',
        variables: c.variables || {},
      })),
    };

    try {
      await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e: any) {
      await prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.FAILED } });
      throw new Error(`Falha ao chamar n8n: ${e.message}`);
    }

    return campaign;
  },

  async updateContactStatus(
    contactId: string,
    status: CampaignContactStatus,
    errorMessage?: string,
  ) {
    const contact = await prisma.campaignContact.update({
      where: { id: contactId },
      data: {
        status,
        sentAt: status === CampaignContactStatus.SENT ? new Date() : undefined,
        errorMessage: errorMessage || null,
      },
    });

    // Update campaign totals and check completion
    const allContacts = await prisma.campaignContact.findMany({
      where: { campaignId: contact.campaignId },
    });

    const totalSent = allContacts.filter(c => c.status === 'SENT').length;
    const totalFailed = allContacts.filter(c => c.status === 'FAILED').length;
    const allDone = allContacts.every(c => c.status !== 'PENDING');

    await prisma.campaign.update({
      where: { id: contact.campaignId },
      data: {
        totalSent,
        totalFailed,
        ...(allDone ? { status: CampaignStatus.COMPLETED, completedAt: new Date() } : {}),
      },
    });

    return contact;
  },

  async upsertLeadFromContact(
    contact: ContactInput,
    campaign: { instanceId: string; agentId?: string | null; name: string },
  ) {
    const tag = `campanha:${campaign.name.toLowerCase().replace(/[\s]+/g, '-').replace(/[^a-z0-9:-]/g, '')}`;
    try {
      const existing = await prisma.lead.findFirst({
        where: { phone: contact.phone, instanceId: campaign.instanceId },
      });

      if (existing) {
        const tags = existing.tags || [];
        if (!tags.includes(tag)) {
          await prisma.lead.update({
            where: { id: existing.id },
            data: { tags: [...tags, tag] },
          });
        }
        return existing;
      }

      return await prisma.lead.create({
        data: {
          phone: contact.phone,
          name: contact.name || null,
          instanceId: campaign.instanceId,
          agentId: campaign.agentId || null,
          tags: [tag],
          status: 'NEW',
        },
      });
    } catch (e: any) {
      console.warn(`[campaign] Erro ao upsert lead ${contact.phone}: ${e.message}`);
      return null;
    }
  },

  async getStats(instanceId?: string) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = instanceId ? { campaign: { instanceId } } : {};

    const [totalSent24h, totalFailed24h, activeCampaigns, totalContacts] = await Promise.all([
      prisma.campaignContact.count({ where: { ...where, status: 'SENT', sentAt: { gte: since24h } } }),
      prisma.campaignContact.count({ where: { ...where, status: 'FAILED', sentAt: { gte: since24h } } }),
      prisma.campaign.count({ where: { status: 'RUNNING', ...(instanceId ? { instanceId } : {}) } }),
      prisma.campaignContact.count({ where }),
    ]);

    const deliveryRate = (totalSent24h + totalFailed24h) > 0
      ? Math.round((totalSent24h / (totalSent24h + totalFailed24h)) * 100)
      : 0;

    return { totalSent24h, totalFailed24h, activeCampaigns, totalContacts, deliveryRate };
  },

  async getAllContacts(instanceId?: string) {
    return prisma.campaignContact.findMany({
      where: instanceId ? { campaign: { instanceId } } : undefined,
      include: {
        campaign: { select: { id: true, name: true, instanceId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  },

  async cancel(id: string) {
    return prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.FAILED },
    });
  },

  async delete(id: string) {
    await prisma.campaign.delete({ where: { id } });
  },
};

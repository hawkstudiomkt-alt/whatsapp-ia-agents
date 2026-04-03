import { prisma } from '../config/database';
import { Lead, LeadStatus } from '@prisma/client';
import { messageService } from './message.service';

interface CreateLeadDTO {
  phone: string;
  name?: string;
  email?: string;
  conversationId?: string;
  instanceId?: string;
  agentId?: string;
  tags?: string[];
}

interface UpdateLeadDTO {
  name?: string;
  email?: string;
  status?: LeadStatus;
  score?: number;
  notes?: string;
  tags?: string[];
  agentId?: string | null;
  assignedToHuman?: boolean;
}

// Palavras-chave para qualificação automática
const QUALIFYING_KEYWORDS = {
  highIntent: ['comprar', 'preço', 'valor', 'quanto custa', 'quero', 'tenho interesse', 'orçamento'],
  contactInfo: ['email', 'telefone', 'whatsapp', 'nome'],
  product: ['produto', 'serviço', 'plano', 'pacote'],
};

export const leadService = {
  async create(data: CreateLeadDTO): Promise<Lead> {
    return prisma.lead.create({
      data: {
        phone: data.phone,
        name: data.name,
        email: data.email,
        instanceId: data.instanceId as string,
        agentId: data.agentId,
        conversationId: data.conversationId,
        tags: data.tags || [],
      },
    });
  },

  async findByPhone(phone: string, instanceId?: string): Promise<Lead | null> {
    return prisma.lead.findFirst({
      where: {
        phone,
        ...(instanceId ? { instanceId } : {})
      },
    });
  },

  async findById(id: string): Promise<Lead | null> {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            agent: true,
          },
        },
        instance: { select: { id: true, name: true, supportPhone: true } },
        agent: { select: { id: true, name: true } },
      },
    });
  },

  async update(id: string, data: UpdateLeadDTO): Promise<Lead> {
    return prisma.lead.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.lead.delete({ where: { id } });
  },

  async findAll(status?: LeadStatus): Promise<any[]> {
    const where = status ? { status } : {};

    return prisma.lead.findMany({
      where,
      include: {
        conversation: {
          select: {
            id: true,
            phone: true,
            instanceId: true,
            isHumanHandling: true,
            agent: {
              select: { name: true },
            },
          },
        },
        instance: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    return prisma.lead.update({
      where: { id },
      data: { status },
    });
  },

  /**
   * Alterna o modo de atendimento entre IA e Humano.
   * Quando ativado como humano: envia notificação WhatsApp para o supportPhone da instância.
   */
  async toggleHuman(leadId: string, reason?: string): Promise<{ lead: any; isHumanHandling: boolean }> {
    // Busca o lead com todos os dados necessários
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        conversation: true,
        instance: {
          select: { id: true, name: true, supportPhone: true, apiKey: true },
        },
        agent: { select: { id: true, name: true } },
      },
    });

    if (!lead) throw new Error('Lead não encontrado');

    const currentlyHuman = lead.conversation?.isHumanHandling ?? lead.assignedToHuman;
    const newValue = !currentlyHuman;

    // Atualiza o lead (assignedToHuman)
    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToHuman: newValue },
    });

    // Atualiza a conversa (isHumanHandling) se existir
    if (lead.conversation) {
      await prisma.conversation.update({
        where: { id: lead.conversation.id },
        data: {
          isHumanHandling: newValue,
          ...(newValue ? { humanInterventionAt: new Date() } : {}),
        },
      });
    }

    // Se ativando suporte humano E a instância tem supportPhone, notifica via WhatsApp
    if (newValue && lead.instance?.supportPhone && lead.instance?.id) {
      try {
        const leadName = lead.name || lead.phone;
        const agentName = lead.agent?.name || 'Agente IA';
        const statusLabel: Record<string, string> = {
          NEW: 'Novo', QUALIFIED: 'Qualificado',
          DISQUALIFIED: 'Desqualificado', CONVERTED: 'Convertido',
        };
        const reasonText = reason || 'Solicitação manual pelo painel';
        const score = lead.score ?? 0;

        const notificationMsg = [
          `🚨 *Suporte Humano Solicitado*`,
          ``,
          `👤 *Lead:* ${leadName}`,
          `📱 *Telefone:* ${lead.phone}`,
          `⭐ *Score:* ${score}/100`,
          `📊 *Status:* ${statusLabel[lead.status] || lead.status}`,
          `🤖 *Agente:* ${agentName}`,
          ``,
          `📋 *Motivo:* ${reasonText}`,
          ``,
          `Acesse o painel para assumir o atendimento.`,
        ].join('\n');

        await messageService.sendWhatsAppMessage(
          lead.instance.id,
          lead.instance.supportPhone,
          notificationMsg
        );
      } catch (err) {
        // Não bloqueia a operação se a notificação falhar
        console.error('[toggleHuman] Falha ao enviar notificação de suporte:', err);
      }
    }

    const updatedLead = await leadService.findById(leadId);
    return { lead: updatedLead, isHumanHandling: newValue };
  },

  /**
   * Analisa mensagens para extrair informações do lead
   */
  async extractLeadInfo(content: string): Promise<Partial<Lead>> {
    const info: Partial<Lead> = {};

    // Extrai email
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = content.match(emailRegex);
    if (emailMatch) {
      info.email = emailMatch[0];
    }

    // Detecta intenção de compra
    const hasHighIntent = QUALIFYING_KEYWORDS.highIntent.some(
      keyword => content.toLowerCase().includes(keyword)
    );

    if (hasHighIntent) {
      info.score = (info.score || 0) + 10;
    }

    return info;
  },

  /**
   * Qualifica lead baseado em critérios
   */
  shouldQualify(lead: Partial<Lead>, messageCount: number): boolean {
    if ((lead.score || 0) >= 20) return true;
    if (lead.email && lead.name) return true;
    if (messageCount >= 5 && (lead.score || 0) >= 10) return true;
    return false;
  },
};

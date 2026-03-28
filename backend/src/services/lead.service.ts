import { prisma } from '../config/database';
import { Lead, LeadStatus } from '@prisma/client';

interface CreateLeadDTO {
  phone: string;
  name?: string;
  email?: string;
  conversationId?: string;
  instanceId?: string;
  agentId?: string;
}

interface UpdateLeadDTO {
  name?: string;
  email?: string;
  status?: LeadStatus;
  score?: number;
  notes?: string;
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
      },
    });
  },

  async update(id: string, data: UpdateLeadDTO): Promise<Lead> {
    return prisma.lead.update({
      where: { id },
      data,
    });
  },

  async findAll(status?: LeadStatus): Promise<Lead[]> {
    const where = status ? { status } : {};

    return prisma.lead.findMany({
      where,
      include: {
        conversation: {
          select: {
            id: true,
            phone: true,
            agent: {
              select: {
                name: true,
              },
            },
          },
        },
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
    // Lead é qualificado se:
    // - Tem score >= 20
    // - OU tem email + nome
    // - OU trocou mais de 5 mensagens com intenção positiva

    if ((lead.score || 0) >= 20) return true;
    if (lead.email && lead.name) return true;
    if (messageCount >= 5 && (lead.score || 0) >= 10) return true;

    return false;
  },
};

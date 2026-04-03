import { prisma } from '../config/database';
import { Discharge, DischargeStatus, MessageDirection, FollowUpType } from '@prisma/client';
import { messageService } from './message.service';

interface CreateDischargeDTO {
  agentId: string;
  name: string;
  phoneList: string[];
  message: string;
  delaySeconds?: number;
  scheduledFor?: Date;
  useAI?: boolean;
  // JSON string com array de variações de mensagem: ["Oi {nome}!", "Olá {nome}, tudo bem?", ...]
  aiIdeas?: string;
  // Config pós-envio: { action: 'followup'|'agent'|'none', followUpType?: string, agentId?: string }
  postSendConfig?: any;
}

/**
 * Seleciona a melhor variação de mensagem para um destinatário específico.
 * Evita repetir a mesma mensagem para leads com histórico de conversa.
 * Rotaciona variações para novos leads.
 */
function pickMessageVariation(
  ideas: string[],
  phone: string,
  lastMessages: string[],
  index: number
): string {
  if (!ideas || ideas.length === 0) return '';

  if (ideas.length === 1) return ideas[0];

  // Se não tem histórico, rotaciona por índice (garante distribuição uniforme)
  if (!lastMessages || lastMessages.length === 0) {
    return ideas[index % ideas.length];
  }

  // Tenta encontrar uma variação que seja diferente das últimas mensagens enviadas
  const recentContent = lastMessages.join(' ').toLowerCase();

  // Calcula similaridade simplificada: conta palavras em comum
  const scored = ideas.map((idea, i) => {
    const ideaWords = idea.toLowerCase().split(/\s+/);
    const overlap = ideaWords.filter(w => w.length > 4 && recentContent.includes(w)).length;
    return { idea, score: overlap, i };
  });

  // Ordena por menor sobreposição (mais diferente do histórico)
  scored.sort((a, b) => a.score - b.score);
  return scored[0].idea;
}

/**
 * Substitui variáveis de template na mensagem.
 * Suporta: {nome}, {phone}, {primeiro_nome}
 */
function applyTemplateVars(message: string, phone: string, leadName?: string): string {
  const firstName = leadName ? leadName.split(' ')[0] : '';
  return message
    .replace(/\{nome\}/gi, leadName || 'você')
    .replace(/\{primeiro_nome\}/gi, firstName || 'você')
    .replace(/\{phone\}/gi, phone)
    .replace(/\{telefone\}/gi, phone);
}

export const dischargeService = {
  async create(data: CreateDischargeDTO): Promise<Discharge> {
    return prisma.discharge.create({
      data: {
        agentId: data.agentId,
        name: data.name,
        phoneList: data.phoneList,
        message: data.message,
        useAI: data.useAI || false,
        aiIdeas: data.aiIdeas || null,
        postSendConfig: data.postSendConfig || null,
        delaySeconds: data.delaySeconds || 30,
        scheduledFor: data.scheduledFor,
        status: DischargeStatus.PENDING,
        results: [],
      },
    });
  },

  async findAll(): Promise<Discharge[]> {
    return prisma.discharge.findMany({
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            instance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findById(id: string): Promise<Discharge | null> {
    return prisma.discharge.findUnique({
      where: { id },
      include: {
        agent: true,
      },
    });
  },

  async startDischarge(id: string): Promise<void> {
    const discharge = await prisma.discharge.update({
      where: { id },
      data: {
        status: DischargeStatus.PROCESSING,
        startedAt: new Date(),
      },
      include: {
        agent: {
          include: {
            instance: true,
          },
        },
      },
    });

    // Roda em background para não bloquear a resposta HTTP
    this.processDischarge(discharge).catch(err => {
      console.error(`[discharge] Erro ao processar campanha ${id}:`, err);
    });
  },

  async processDischarge(discharge: Discharge & { agent: any }): Promise<void> {
    const { phoneList, message, delaySeconds, agent, useAI, aiIdeas: rawAiIdeas, postSendConfig } = discharge;

    // Parse das ideias de variação de mensagem
    let ideas: string[] = [];
    if (useAI && rawAiIdeas) {
      try {
        ideas = JSON.parse(rawAiIdeas);
      } catch {
        // Se o parse falhar, usa a mensagem principal como única opção
        ideas = [message];
      }
    }

    const results: any[] = [];

    for (let i = 0; i < phoneList.length; i++) {
      const phone = phoneList[i];
      let statusStr = 'SENT';

      try {
        // Busca ou cria conversa
        let conversation = await prisma.conversation.findFirst({
          where: { instanceId: agent.instanceId, phone, status: 'ACTIVE' },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              phone,
              agentId: agent.id,
              instanceId: agent.instanceId,
              status: 'ACTIVE',
            },
          });
        }

        // Busca ou cria lead
        let lead = await prisma.lead.findFirst({
          where: { instanceId: agent.instanceId, phone },
        });

        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              phone,
              instanceId: agent.instanceId,
              status: 'NEW',
            },
          });
        }

        // Determina a mensagem a enviar
        let finalMessage = message;

        if (useAI && ideas.length > 0) {
          // Busca últimas mensagens enviadas para este lead (para evitar repetição)
          const recentMessages = await prisma.message.findMany({
            where: {
              conversationId: conversation.id,
              direction: MessageDirection.OUTBOUND,
            },
            orderBy: { timestamp: 'desc' },
            take: 5,
            select: { content: true },
          });
          const lastContents = recentMessages.map(m => m.content);

          // Escolhe variação inteligente
          finalMessage = pickMessageVariation(ideas, phone, lastContents, i);
        }

        // Substitui variáveis de template
        finalMessage = applyTemplateVars(finalMessage, phone, lead.name || undefined);

        // Message Splitter - divide em blocos por parágrafo duplo
        const messageBlocks = finalMessage
          .split(/\n\n+/)
          .map(b => b.trim())
          .filter(b => b.length > 0);

        for (let j = 0; j < messageBlocks.length; j++) {
          const block = messageBlocks[j];

          await messageService.create({
            content: block,
            direction: MessageDirection.OUTBOUND,
            conversationId: conversation.id,
            instanceId: agent.instanceId,
          });

          await messageService.sendWhatsAppMessage(agent.instanceId, phone, block);

          if (j < messageBlocks.length - 1) {
            await new Promise(r =>
              setTimeout(r, Math.min(Math.max(block.length * 30, 1500), 4000))
            );
          }
        }

        // Ação pós-envio
        if (postSendConfig && lead) {
          const config = typeof postSendConfig === 'string'
            ? JSON.parse(postSendConfig)
            : postSendConfig;

          if (config.action === 'followup' && config.followUpType) {
            const scheduledFor = new Date();
            scheduledFor.setHours(scheduledFor.getHours() + (config.delayHours || 24));

            await prisma.leadFollowUp.create({
              data: {
                leadId: lead.id,
                type: (config.followUpType as FollowUpType) || FollowUpType.REMINDER,
                scheduledFor,
                notes: config.followUpNote || `Follow-up após disparo: ${discharge.name}`,
              },
            });
          } else if (config.action === 'agent' && config.agentId) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { agentId: config.agentId },
            });
          }
        }

        await prisma.discharge.update({
          where: { id: discharge.id },
          data: { totalSent: { increment: 1 } },
        });

      } catch (error) {
        console.error(`Erro ao enviar para ${phone}:`, error);
        statusStr = 'FAILED';
        await prisma.discharge.update({
          where: { id: discharge.id },
          data: { totalFailed: { increment: 1 } },
        });
      }

      results.push({ phone, status: statusStr, deliveredAt: new Date().toISOString() });

      await prisma.discharge.update({
        where: { id: discharge.id },
        data: { results },
      });

      // Delay aleatório entre envios (anti-ban): base + jitter de ±30%
      if (i < phoneList.length - 1) {
        const jitter = (Math.random() * 0.6 - 0.3) * delaySeconds;
        const actualDelay = Math.max(10, delaySeconds + jitter);
        await this.sleep(actualDelay * 1000);
      }
    }

    await prisma.discharge.update({
      where: { id: discharge.id },
      data: {
        status: DischargeStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  },

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async cancelDischarge(id: string): Promise<Discharge> {
    return prisma.discharge.update({
      where: { id },
      data: { status: DischargeStatus.FAILED },
    });
  },
};

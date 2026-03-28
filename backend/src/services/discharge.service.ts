import { prisma } from '../config/database';
import { Discharge, DischargeStatus } from '@prisma/client';
import { messageService } from './message.service';
import { conversationService } from './conversation.service';
import { aiService } from './ai.service';
import { MessageDirection } from '@prisma/client';

interface CreateDischargeDTO {
  agentId: string;
  name: string;
  phoneList: string[];
  message: string;
  delaySeconds?: number;
  scheduledFor?: Date;
  useAI?: boolean;
}

export const dischargeService = {
  async create(data: CreateDischargeDTO): Promise<Discharge> {
    return prisma.discharge.create({
      data: {
        ...data,
        useAI: data.useAI || false,
        delaySeconds: data.delaySeconds || 30,
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

    // Processa os disparos em fila
    await this.processDischarge(discharge);
  },

  async processDischarge(discharge: Discharge & { agent: any }): Promise<void> {
    const { phoneList, message, delaySeconds, agent, useAI } = discharge;
    const results: any[] = [];

    for (let i = 0; i < phoneList.length; i++) {
      const phone = phoneList[i];
      let finalMessage = message;
      let statusStr = 'SENT';

      try {
        // Cria Conversa/Lead para trazer pro painel central
        const conversation = await conversationService.findOrCreateConversation({
          instanceId: agent.instanceId,
          phoneNumber: phone
        });

        // IA Opcional
        if (useAI) {
          const leadData = conversation.lead ? {
            name: conversation.lead.name || undefined,
            status: conversation.lead.status,
            notes: conversation.lead.notes || undefined
          } : undefined;

          // Pede para a IA gerar texto único
          const prompt = `Por favor, baseie-se nesta mensagem base de disparo: "${message}". Reescreva ou adapte de forma pessoal para enviar agora. Não seja longo nem explique. Apenas passe o texto.`;
          
          const aiResp = await aiService.generateResponse({
             agentId: agent.id,
             instanceId: agent.instanceId,
             userMessage: prompt,
             conversationHistory: [],
             lead: leadData as any
          });

          if (aiResp.text && aiResp.text.trim() !== '') {
            finalMessage = aiResp.text;
          }
        }

        // Message Splitter
        const messageBlocks = finalMessage.split(/\n\n+/).map(b => b.trim()).filter(b => b.length > 0);

        for (let j = 0; j < messageBlocks.length; j++) {
          const block = messageBlocks[j];

          await messageService.create({
            content: block,
            direction: MessageDirection.OUTBOUND,
            conversationId: conversation.id,
            instanceId: agent.instanceId
          });

          await messageService.sendWhatsAppMessage(agent.instanceId, phone, block);

          if (j < messageBlocks.length - 1) {
            await new Promise(r => setTimeout(r, Math.min(Math.max(block.length * 30, 1500), 4000)));
          }
        }

        await prisma.discharge.update({
          where: { id: discharge.id },
          data: { totalSent: { increment: 1 } }
        });

      } catch (error) {
        console.error(`Erro ao enviar para ${phone}:`, error);
        statusStr = 'FAILED/INVALID';
        await prisma.discharge.update({
          where: { id: discharge.id },
          data: { totalFailed: { increment: 1 } }
        });
      }

      // Adiciona pra auditoria visual
      results.push({ phone, status: statusStr, deliveredAt: new Date().toISOString() });

      // Atualiza resultados no DB tempo real
      await prisma.discharge.update({
        where: { id: discharge.id },
        data: { results: results }
      });

      // Delay entre clientes (Evitar Ban)
      if (i < phoneList.length - 1) {
        await this.sleep(delaySeconds * 1000);
      }
    }

    // Finaliza o disparo
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
      data: {
        status: DischargeStatus.FAILED,
      },
    });
  },
};

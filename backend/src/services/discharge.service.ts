import { prisma } from '../config/database';
import { Discharge, DischargeStatus, MessageDirection } from '@prisma/client';
import { messageService } from './message.service';

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

    await this.processDischarge(discharge);
  },

  async processDischarge(discharge: Discharge & { agent: any }): Promise<void> {
    const { phoneList, message, delaySeconds, agent } = discharge;
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

        // Message Splitter
        const messageBlocks = message
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

      if (i < phoneList.length - 1) {
        await this.sleep(delaySeconds * 1000);
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
import { prisma } from '../config/database';
import { MessageDirection } from '@prisma/client';
import { messageService } from './message.service';

const FollowUpStatus: any = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const followupService = {
  startEngine() {
    console.log('🤖 Follow-up engine started...');
    setInterval(() => this.processPendingFollowUps(), 60000);
  },

  async processPendingFollowUps(): Promise<void> {
    const now = new Date();

    try {
      const pendingFollowUps = await (prisma as any).leadFollowUp.findMany({
        where: {
          status: FollowUpStatus.PENDING,
          scheduledFor: { lte: now },
        },
        include: {
          lead: {
            include: {
              conversation: {
                include: { agent: true },
              },
            },
          },
        },
      });

      if (pendingFollowUps.length === 0) return;

      console.log(`🕒 Processing ${pendingFollowUps.length} pending follow-ups...`);

      for (const followup of pendingFollowUps) {
        await this.executeFollowUp(followup);
      }
    } catch (error) {
      console.error('❌ Error processing follow-ups:', error);
    }
  },

  async executeFollowUp(followup: any): Promise<void> {
    const { lead } = followup;

    if (!lead || !lead.conversation) {
      await this.markAsCancelled(followup.id);
      return;
    }

    const { conversation } = lead;

    try {
      const message = followup.notes || 'Olá! Estamos entrando em contato para acompanhar seu atendimento. Podemos ajudar?';

      const messageBlocks = message
        .split(/\n\n+/)
        .map((b: string) => b.trim())
        .filter((b: string) => b.length > 0);

      for (let i = 0; i < messageBlocks.length; i++) {
        const block = messageBlocks[i];

        await messageService.create({
          content: block,
          direction: MessageDirection.OUTBOUND,
          conversationId: conversation.id,
          instanceId: conversation.instanceId,
        });

        await messageService.sendWhatsAppMessage(
          conversation.instanceId,
          lead.phone,
          block
        );

        if (i < messageBlocks.length - 1) {
          const delayMs = Math.min(Math.max(block.length * 30, 1500), 4000);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      await (prisma as any).leadFollowUp.update({
        where: { id: followup.id },
        data: {
          status: FollowUpStatus.COMPLETED,
          executedAt: new Date(),
        },
      });

      console.log(`✅ Follow-up ${followup.id} executed successfully.`);
    } catch (error) {
      console.error(`❌ Failed to execute follow-up ${followup.id}:`, error);
    }
  },

  async markAsCancelled(id: string): Promise<void> {
    await (prisma as any).leadFollowUp.update({
      where: { id },
      data: { status: FollowUpStatus.CANCELLED },
    });
  },
};
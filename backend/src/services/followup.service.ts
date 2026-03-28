import { prisma } from '../config/database';
import { MessageDirection } from '@prisma/client';
const FollowUpStatus: any = { PENDING: 'PENDING', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' };
import { messageService } from './message.service';
import { aiService } from './ai.service';
import { conversationService } from './conversation.service';

export const followupService = {
  /**
   * Inicia o motor de processamento de follow-ups
   */
  startEngine() {
    console.log('🤖 Follow-up engine started...');
    // Verifica a cada 1 minuto (60000ms)
    setInterval(() => this.processPendingFollowUps(), 60000);
  },

  /**
   * Processa follow-ups agendados para agora ou no passado que ainda estão pendentes
   */
  async processPendingFollowUps(): Promise<void> {
    const now = new Date();

    try {
      const pendingFollowUps = await (prisma as any).leadFollowUp.findMany({
        where: {
          status: FollowUpStatus.PENDING,
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          lead: {
            include: {
              conversation: {
                include: {
                  agent: true,
                },
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

  /**
   * Executa um follow-up específico
   */
  async executeFollowUp(followup: any): Promise<void> {
    const { lead } = followup;
    if (!lead || !lead.conversation) {
      console.warn(`⚠️ Lead or conversation not found for follow-up ${followup.id}`);
      await this.markAsCancelled(followup.id);
      return;
    }

    const { conversation } = lead;
    const { agent } = conversation;

    try {
      // Gera mensagem de acompanhamento com IA
      const history = await conversationService.getConversationHistory(conversation.id);
      
      const prompt = followup.notes 
        ? `Gere uma mensagem de acompanhamento para o cliente baseada nesta observação: "${followup.notes}".` 
        : `Gere uma mensagem de acompanhamento amigável para este cliente que não respondeu.`;

      const aiResp = await aiService.generateResponse({
        agentId: agent.id,
        instanceId: conversation.instanceId,
        userMessage: prompt,
        conversationHistory: history,
        lead: {
          name: lead.name || undefined,
          status: lead.status,
          notes: lead.notes || undefined,
        },
      });

      if (aiResp.text) {
        // Message Splitter: Divide a resposta em blocos
        const messageBlocks = aiResp.text
          .split(/\n\n+/)
          .map(b => b.trim())
          .filter(b => b.length > 0);

        for (let i = 0; i < messageBlocks.length; i++) {
          const block = messageBlocks[i];

          // Salva mensagem
          await messageService.create({
            content: block,
            direction: MessageDirection.OUTBOUND,
            conversationId: conversation.id,
            instanceId: conversation.instanceId,
          });

          // Envia WhatsApp
          await messageService.sendWhatsAppMessage(
            conversation.instanceId,
            lead.phone,
            block
          );

          // Pausa entre blocos
          if (i < messageBlocks.length - 1) {
            const delayMs = Math.min(Math.max(block.length * 30, 1500), 4000);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

        // Marca como concluído
        await (prisma as any).leadFollowUp.update({
          where: { id: followup.id },
          data: {
            status: FollowUpStatus.COMPLETED,
            updatedAt: new Date(),
          },
        });
        
        console.log(`✅ Follow-up ${followup.id} executed successfully.`);
      }
    } catch (error) {
      console.error(`❌ Failed to execute follow-up ${followup.id}:`, error);
    }
  },

  async markAsCancelled(id: string): Promise<void> {
    await (prisma as any).leadFollowUp.update({
      where: { id },
      data: { status: FollowUpStatus.CANCELLED },
    });
  }
};

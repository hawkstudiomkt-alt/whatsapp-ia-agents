import { prisma } from '../config/database';
import { ConversationStatus, MessageDirection } from '@prisma/client';
import { messageService } from './message.service';
import { leadService } from './lead.service';
import { aiService } from './ai.service';
import { analyticsService } from './analytics.service';
import { MessageContext } from '../types';

import { transcriptionService } from './transcription.service';

interface ProcessMessageParams {
  instanceId: string;
  phoneNumber: string;
  content: string;
  pushName?: string;
  messageType?: 'text' | 'audio' | 'image' | 'video' | 'document';
  mediaUrl?: string;
}

export const conversationService = {
  /**
   * Processa mensagem recebida e gera resposta com IA
   */
  async processIncomingMessage(params: ProcessMessageParams): Promise<{
    response?: string;
    conversationId: string;
  }> {
    const { instanceId, phoneNumber, content, pushName, messageType, mediaUrl } = params;

    // Busca ou cria conversa
    const conversation = await this.findOrCreateConversation({
      instanceId,
      phoneNumber,
      pushName,
    });

    let processedContent = content;

    // Se for áudio, transcreve antes de continuar
    if (messageType === 'audio' && mediaUrl && conversation.agent.transcriptionEnabled) {
      try {
        console.log(`🎙️ Transcrevendo áudio da conversa ${conversation.id}...`);
        const transcription = await transcriptionService.transcribe(
          mediaUrl,
          conversation.agent.transcriptionModel
        );
        processedContent = `[Áudio Transcrito]: ${transcription}`;
        console.log(`✅ Transcrição concluída: "${transcription}"`);
      } catch (error) {
        console.error('❌ Erro na transcrição rápida:', error);
        processedContent = '[Áudio não pôde ser transcrito]';
      }
    }

    // Salva mensagem recebida (usando o conteúdo processado/transcrito se for áudio)
    await messageService.create({
      content: processedContent,
      direction: MessageDirection.INBOUND,
      conversationId: conversation.id,
      instanceId,
      timestamp: new Date(),
    });

    // Verifica se o agente está ativo
    if (conversation.agent.status !== 'ACTIVE') {
      return { conversationId: conversation.id };
    }

    // Verifica se humano está atendendo
    if (conversation.isHumanHandling) {
      // Atualiza timestamp da última mensagem humana
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastHumanMessageAt: new Date() },
      });
      return { conversationId: conversation.id };
    }

    // Detecta intervenção humana
    const humanIntervention = await aiService.detectHumanIntervention(conversation.id);
    if (humanIntervention && conversation.agent.humanInterventionEnabled) {
      // Pausa atendimento e aguarda
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          isHumanHandling: true,
          humanInterventionAt: new Date(),
          lastHumanMessageAt: new Date(),
        },
      });

      // Notifica Admin
      if (conversation.instance.adminPhone) {
        const adminMsg = `⚠️ *Intervenção Detectada*\n\nO cliente *${pushName || phoneNumber}* enviou uma mensagem na instância *${conversation.instance.name}* que parece exigir atenção humana.\n\nAtendimento pausado para a IA.`;
        await messageService.sendWhatsAppMessage(instanceId, (conversation.instance as any).adminPhone, adminMsg);
      }

      console.log(`Intervenção humana detectada na conversa ${conversation.id}`);
      return { conversationId: conversation.id };
    }

    // Busca histórico da conversa
    const history = await this.getConversationHistory(conversation.id);

    // Busca lead associado
    const lead = conversation.lead
      ? {
          name: conversation.lead.name || undefined,
          email: conversation.lead.email || undefined,
          status: conversation.lead.status,
          score: conversation.lead.score || undefined,
          notes: conversation.lead.notes || undefined,
        }
      : undefined;

    // Gera resposta com IA
    const aiResponse = await aiService.generateResponse({
      agentId: conversation.agentId,
      instanceId: conversation.instanceId,
      userMessage: content,
      conversationHistory: history,
      lead,
      isHumanHandling: conversation.isHumanHandling,
    });

    // Verifica se deve transferir
    if (aiResponse.shouldTransfer || aiService.shouldTransferToHuman(history)) {
      await this.updateConversationStatus(conversation.id, 'TRANSFERRED');

      // Notifica Admin sobre transferência
      if (conversation.instance.adminPhone) {
        const adminMsg = `🚨 *Solicitação de Ajuda*\n\nO cliente *${pushName || phoneNumber}* solicitou falar com um atendente ou a IA identificou a necessidade de transferência.\n\nInstância: ${conversation.instance.name}`;
        await messageService.sendWhatsAppMessage(instanceId, (conversation.instance as any).adminPhone, adminMsg);
      }

      return {
        response: 'Vou transferir você para um de nossos atendentes. Aguarde um momento!',
        conversationId: conversation.id,
      };
    }

    // Message Splitter: Divide a resposta em blocos
    const messageBlocks = aiResponse.text
      .split(/\n\n+/)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    for (let i = 0; i < messageBlocks.length; i++) {
      const block = messageBlocks[i];

      // Salva bloco da resposta da IA
      await messageService.create({
        content: block,
        direction: MessageDirection.OUTBOUND,
        conversationId: conversation.id,
        instanceId,
        timestamp: new Date(),
      });

      // Envia via WhatsApp
      await messageService.sendWhatsAppMessage(
        instanceId,
        phoneNumber,
        block
      );

      // Simula pausa de "digitando" se não for a última mensagem
      if (i < messageBlocks.length - 1) {
        // Cálculo de caracteres (aprox 30ms/char, até max 4000ms de pausa)
        const delayMs = Math.min(Math.max(block.length * 30, 1500), 4000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Atualiza lead se houver informações
    if (aiResponse.leadUpdate) {
      await this.updateLead(conversation.id, aiResponse.leadUpdate);
    }

    return {
      response: aiResponse.text,
      conversationId: conversation.id,
    };
  },

  async findOrCreateConversation(params: {
    instanceId: string;
    phoneNumber: string;
    pushName?: string;
  }) {
    const { instanceId, phoneNumber, pushName } = params;

    // Tenta buscar conversa existente ativa
    let conversation = await prisma.conversation.findFirst({
      where: {
        instanceId,
        phone: phoneNumber,
        status: 'ACTIVE',
      },
      include: {
        agent: true,
        instance: true,
        lead: true,
      },
    });

    if (conversation) {
      return conversation;
    }

    // Busca o primeiro agente ativo da instância
    const activeAgent = await prisma.agent.findFirst({
      where: {
        instanceId,
        status: 'ACTIVE',
      },
    });

    if (!activeAgent) {
      throw new Error('Nenhum agente ativo nesta instância');
    }

    // Cria nova conversa
    conversation = await prisma.conversation.create({
      data: {
        phone: phoneNumber,
        agentId: activeAgent.id,
        instanceId,
        status: 'ACTIVE',
      },
      include: {
        agent: true,
        instance: true,
        lead: true,
      },
    });

    // Registra no analytics
    await analyticsService.recordConversationEvent(instanceId, 'started');

    // Cria ou atualiza lead
    let lead = await leadService.findByPhone(phoneNumber);

    if (!lead) {
      lead = await leadService.create({
        phone: phoneNumber,
        name: pushName,
        conversationId: conversation.id,
      });
    } else if (!lead.conversationId) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { conversationId: conversation.id },
      });
    }

    return conversation;
  },

  async getConversationHistory(conversationId: string): Promise<MessageContext[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: 50, // Últimas 50 mensagens
    });

    return messages.map(msg => ({
      role: msg.direction === MessageDirection.INBOUND ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  },

  async updateLead(
    conversationId: string,
    leadUpdate: { name?: string; email?: string; score?: number; status?: string; notes?: string }
  ): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { lead: true },
    });

    if (!conversation?.lead) return;

    const updates: any = {};

    if (leadUpdate.name) updates.name = leadUpdate.name;
    if (leadUpdate.email) updates.email = leadUpdate.email;
    if (leadUpdate.score !== undefined) {
      if (typeof leadUpdate.score === 'number') {
        updates.score = leadUpdate.score;
      }
    }
    
    // Status sugerido pela IA ou automático
    if (leadUpdate.status && ['NEW', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'].includes(leadUpdate.status)) {
      updates.status = leadUpdate.status;
    } else {
      // Verifica se deve qualificar automaticamente
      const currentLead = conversation.lead;
      const shouldQualify = leadService.shouldQualify(
        { ...currentLead, ...leadUpdate as any },
        await prisma.message.count({ where: { conversationId } })
      );

      if (shouldQualify && currentLead.status === 'NEW') {
        updates.status = 'QUALIFIED';
      }
    }

    if (leadUpdate.notes) {
      updates.notes = conversation.lead.notes
        ? `${conversation.lead.notes}\n${leadUpdate.notes}`
        : leadUpdate.notes;
    }

    await prisma.lead.update({
      where: { id: conversation.lead.id },
      data: updates,
    });
  },

  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus
  ): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status },
    });

    if (status === 'CLOSED') {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { instance: true },
      });

      if (conversation) {
        await analyticsService.recordConversationEvent(
          conversation.instanceId,
          'closed'
        );
      }
    }
  },

  async getActiveConversations(instanceId?: string) {
    const where = instanceId 
      ? { instanceId, status: ConversationStatus.ACTIVE } 
      : { status: ConversationStatus.ACTIVE };

    return prisma.conversation.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        lead: {
          select: {
            id: true,
            name: true,
            status: true,
            score: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  },
};

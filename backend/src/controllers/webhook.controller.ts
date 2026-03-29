import { FastifyRequest, FastifyReply } from 'fastify';
import { instanceService } from '../services/instance.service';
import { messageService } from '../services/message.service';
import { prisma } from '../config/database';
import { EvolutionWebhook } from '../types';

export const webhookController = {
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const { apiKey } = request.params as { apiKey?: string };
    const body = request.body as EvolutionWebhook & { instanceId?: string };

    // Autentica pela API Key na URL
    let instance = null;
    if (apiKey) {
      instance = await instanceService.findByApiKey(apiKey);
    }

    // Fallback: tenta pelo nome da instância no body
    if (!instance && body.instance) {
      instance = await instanceService.findByName(body.instance);
    }

    if (!instance) {
      return reply.status(200).send({ received: true, warning: 'Instance not found' });
    }

    // Trata atualização de conexão
    if (body.event === 'connection.update') {
      const status = body.data?.state;
      if (status === 'open') {
        await instanceService.updateStatus(instance.id, 'CONNECTED');
      } else if (status === 'close') {
        await instanceService.updateStatus(instance.id, 'DISCONNECTED');
      }
      return reply.status(200).send({ received: true });
    }

    // Ignora mensagens enviadas pelo próprio número
    if (body.data?.key?.fromMe) {
      return reply.status(200).send({ received: true });
    }

    // Ignora mensagens de grupos
    if (body.data?.key?.remoteJid?.endsWith('@g.us')) {
      return reply.status(200).send({ received: true, warning: 'Group message ignored' });
    }

    // Ignora status/broadcast
    if (body.data?.key?.remoteJid === 'status@broadcast') {
      return reply.status(200).send({ received: true });
    }

    // Processa apenas mensagens
    if (body.event !== 'messages.upsert') {
      return reply.status(200).send({ received: true });
    }

    const content =
      body.data?.message?.conversation ||
      body.data?.message?.extendedTextMessage?.text ||
      '';

    if (!content) {
      return reply.status(200).send({ received: true });
    }

    try {
      const phoneNumber = body.data.key.remoteJid
        .replace('@s.whatsapp.net', '')
        .replace(/\D/g, '');

      const pushName = body.data.pushName;

      // Busca ou cria lead
      let lead = await prisma.lead.findFirst({
        where: { instanceId: instance.id, phone: phoneNumber },
      });

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            phone: phoneNumber,
            name: pushName,
            instanceId: instance.id,
            status: 'NEW',
          },
        });
      }

      // Busca ou cria conversa
      let conversation = await prisma.conversation.findFirst({
        where: { instanceId: instance.id, phone: phoneNumber, status: 'ACTIVE' },
        include: { agent: true },
      });

      if (!conversation) {
        const activeAgent = await prisma.agent.findFirst({
          where: { instanceId: instance.id, status: 'ACTIVE' },
        });

        if (!activeAgent) {
          return reply.status(200).send({ received: true, warning: 'No active agent' });
        }

        conversation = await prisma.conversation.create({
          data: {
            phone: phoneNumber,
            agentId: activeAgent.id,
            instanceId: instance.id,
            status: 'ACTIVE',
          },
          include: { agent: true },
        });
      }

      // Salva mensagem recebida
      await messageService.create({
        content,
        direction: 'INBOUND',
        conversationId: conversation.id,
        instanceId: instance.id,
        timestamp: new Date(),
      });

      return reply.status(200).send({
        received: true,
        conversationId: conversation.id,
        leadId: lead.id,
        instanceId: instance.id,
        agentId: conversation.agentId,
        phoneNumber,
        content,
      });

    } catch (error: unknown) {
      console.error('Erro no webhook:', error);
      return reply.status(200).send({ received: true, error: 'Processing failed' });
    }
  },
};
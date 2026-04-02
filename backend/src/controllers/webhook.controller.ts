import { FastifyRequest, FastifyReply } from 'fastify';
import { instanceService } from '../services/instance.service';
import { messageService } from '../services/message.service';
import { prisma } from '../config/database';
import { EvolutionWebhook } from '../types';

// Chama o n8n de forma assíncrona (fire-and-forget) — não bloqueia a resposta ao Evolution
async function triggerN8n(payload: Record<string, unknown>) {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nWebhookUrl) return;

  try {
    await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Log mas não quebra o fluxo principal
    console.error('[webhook] Falha ao chamar n8n:', err);
  }
}

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

      // Busca conversa ativa para este número
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

        // Usa upsert para evitar erro de unique constraint caso exista conversa fechada
        conversation = await prisma.conversation.upsert({
          where: {
            instanceId_phone: { instanceId: instance.id, phone: phoneNumber },
          },
          create: {
            phone: phoneNumber,
            agentId: activeAgent.id,
            instanceId: instance.id,
            status: 'ACTIVE',
          },
          update: {
            status: 'ACTIVE',
            agentId: activeAgent.id,
            isHumanHandling: false,
            updatedAt: new Date(),
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

      // Dispara o n8n de forma assíncrona com todos os dados necessários
      const n8nPayload = {
        conversationId: conversation.id,
        leadId: lead.id,
        instanceId: instance.id,
        instanceName: instance.name,
        agentId: conversation.agentId,
        phoneNumber,
        pushName,
        content,
      };

      // Não aguarda — responde ao Evolution imediatamente
      triggerN8n(n8nPayload);

      return reply.status(200).send({
        received: true,
        ...n8nPayload,
      });

    } catch (error: unknown) {
      console.error('Erro no webhook:', error);
      return reply.status(200).send({ received: true, error: 'Processing failed' });
    }
  },
};

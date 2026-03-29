import { FastifyRequest, FastifyReply } from 'fastify';
import { instanceService } from '../services/instance.service';
import { conversationService } from '../services/conversation.service';
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

    body.instanceId = instance.id;

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

    // Ignora mensagens de broadcast/status
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
      const result = await conversationService.processIncomingMessage({
        instanceId: instance.id,
        phoneNumber: body.data.key.remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, ''),
        content,
        pushName: body.data.pushName,
      });

      return reply.status(200).send({
        received: true,
        conversationId: result.conversationId,
        hasResponse: !!result.response,
      });
    } catch (error: unknown) {
      console.error('Erro no webhook:', error);

      if (error instanceof Error && error.message === 'Nenhum agente ativo nesta instância') {
        return reply.status(200).send({ received: true, warning: 'No active agent' });
      }

      return reply.status(200).send({ received: true, error: 'Processing failed' });
    }
  },
};
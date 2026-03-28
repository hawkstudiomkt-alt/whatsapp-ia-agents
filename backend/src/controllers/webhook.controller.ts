import { FastifyRequest, FastifyReply } from 'fastify';
import { instanceService } from '../services/instance.service';
import { conversationService } from '../services/conversation.service';
import { EvolutionWebhook } from '../types';

/**
 * Webhook para receber mensagens da Evolution API
 * Deve ser configurado na Evolution API para cada instância
 */
export const webhookController = {
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as EvolutionWebhook & {
      instanceId?: string;
      apiKey?: string;
    };

    // Autenticação via API Key
    if (body.apiKey) {
      const instance = await instanceService.findByApiKey(body.apiKey);
      if (!instance) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }
      body.instanceId = instance.id;
    }

    // Ignora mensagens enviadas pelo próprio número
    if (body.data?.key?.fromMe) {
      return reply.status(200).send({ received: true });
    }

    // Processa apenas mensagens de texto
    if (body.event !== 'messages.upsert') {
      return reply.status(200).send({ received: true });
    }

    const content =
      body.data.message?.conversation ||
      body.data.message?.extendedTextMessage?.text ||
      '';

    if (!content || !body.instanceId) {
      return reply.status(400).send({ error: 'Missing content or instanceId' });
    }

    try {
      // Processa a mensagem e gera resposta com IA
      const result = await conversationService.processIncomingMessage({
        instanceId: body.instanceId,
        phoneNumber: body.data.key.remoteJid.replace(/\D/g, ''),
        content,
        pushName: body.data.pushName,
      });

      return reply.status(200).send({
        received: true,
        conversationId: result.conversationId,
        hasResponse: !!result.response,
      });
    } catch (error: unknown) {
      console.error('Error processing webhook:', error);

      // Se não houver agente ativo, apenas registra a mensagem
      if (error instanceof Error && error.message === 'Nenhum agente ativo nesta instância') {
        return reply.status(200).send({
          received: true,
          warning: 'No active agent for this instance',
        });
      }

      return reply.status(500).send({
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

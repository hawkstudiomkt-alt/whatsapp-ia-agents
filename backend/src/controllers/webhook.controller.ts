import { FastifyRequest, FastifyReply } from 'fastify';
import { instanceService } from '../services/instance.service';
import { messageService } from '../services/message.service';
import { leadService } from '../services/lead.service';
import { analyticsService } from '../services/analytics.service';
import { aiService } from '../services/ai.service';
import { prisma } from '../config/database';
import { EvolutionWebhook } from '../types';
import { LeadStatus } from '@prisma/client';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Dispara alerta de lead quente para o n8n (fire-and-forget).
 * N8n ainda cuida de alertas, relatórios e campanhas — apenas o agente IA foi movido para cá.
 */
async function triggerHotLeadAlert(leadId: string, reason: string) {
  const alertUrl = process.env.N8N_HOT_LEAD_WEBHOOK_URL;
  if (!alertUrl) return;

  try {
    await fetch(alertUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, reason, triggeredAt: new Date().toISOString() }),
    });
    console.log(`[webhook] Alerta de lead quente disparado: ${leadId} — ${reason}`);
  } catch (err) {
    console.error('[webhook] Falha ao disparar alerta de lead quente:', err);
  }
}

/**
 * Auto-qualifica lead com base na mensagem recebida.
 * Assíncrono (fire-and-forget) para não bloquear a resposta ao Evolution.
 */
async function autoQualifyLead(
  lead: { id: string; status: string; score: number | null; email: string | null; name: string | null },
  content: string,
  conversationId: string,
  instanceId: string
) {
  const updates: Record<string, unknown> = {};

  const extracted = await leadService.extractLeadInfo(content);

  if (extracted.email && !lead.email) {
    updates.email = extracted.email;
  }

  const scoreDelta = extracted.score || 0;
  const currentScore = (lead.score || 0) + scoreDelta;
  if (scoreDelta > 0) {
    updates.score = Math.min(100, currentScore);
  }

  const msgCount = await prisma.message.count({ where: { conversationId } });

  if (lead.status === 'NEW') {
    const candidate = {
      ...lead,
      status: lead.status as LeadStatus,
      score: currentScore,
      email: (extracted.email as string | undefined) || lead.email || undefined,
    };
    if (leadService.shouldQualify(candidate, msgCount)) {
      updates.status = 'QUALIFIED';
      await analyticsService.recordLeadQualified(instanceId);
      triggerHotLeadAlert(lead.id, 'Lead qualificado automaticamente pela IA').catch(() => {});
    }
  }

  if (!updates.status && currentScore >= 70 && (lead.score || 0) < 70) {
    triggerHotLeadAlert(lead.id, `Score atingiu ${currentScore}/100`).catch(() => {});
  }

  if (Object.keys(updates).length > 0) {
    await prisma.lead.update({ where: { id: lead.id }, data: updates });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Controller principal
// ──────────────────────────────────────────────────────────────────────────────

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

    // Normaliza o evento (v1: connection.update / v2: CONNECTION_UPDATE)
    const eventName = (body.event || '').toLowerCase().replace(/_/g, '.');

    // Trata atualização de conexão
    if (eventName === 'connection.update') {
      const status = body.data?.state;
      if (status === 'open') {
        await instanceService.updateStatus(instance.id, 'CONNECTED');
        console.log(`[webhook] Instância ${instance.name} → CONNECTED`);
      } else if (status === 'close' || status === 'closed') {
        await instanceService.updateStatus(instance.id, 'DISCONNECTED');
        console.log(`[webhook] Instância ${instance.name} → DISCONNECTED`);
      }
      return reply.status(200).send({ received: true });
    }

    // ── Filtros de mensagem ────────────────────────────────────────────────────

    // Ignora mensagens enviadas pelo próprio número (evita loop com follow-ups/campanhas)
    if (body.data?.key?.fromMe) {
      return reply.status(200).send({ received: true });
    }

    // Ignora grupos
    if (body.data?.key?.remoteJid?.endsWith('@g.us')) {
      return reply.status(200).send({ received: true, warning: 'Group message ignored' });
    }

    // Ignora status/broadcast
    if (body.data?.key?.remoteJid === 'status@broadcast') {
      return reply.status(200).send({ received: true });
    }

    // Processa apenas messages.upsert
    if (eventName !== 'messages.upsert') {
      return reply.status(200).send({ received: true });
    }

    const content =
      body.data?.message?.conversation ||
      body.data?.message?.extendedTextMessage?.text ||
      '';

    if (!content) {
      return reply.status(200).send({ received: true });
    }

    // ── Responde ao Evolution imediatamente ────────────────────────────────────
    // Todo processamento pesado acontece após o reply para não travar o Evolution API
    reply.status(200).send({ received: true });

    // ── Processamento assíncrono ───────────────────────────────────────────────
    setImmediate(async () => {
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

        // Busca conversa ativa
        let conversation = await prisma.conversation.findFirst({
          where: { instanceId: instance.id, phone: phoneNumber, status: 'ACTIVE' },
          include: { agent: true },
        });

        if (!conversation) {
          const activeAgent = await prisma.agent.findFirst({
            where: { instanceId: instance.id, status: 'ACTIVE' },
          });

          if (!activeAgent) {
            console.log(`[webhook] Sem agente ativo para instância ${instance.name}`);
            return;
          }

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

        // Auto-qualificação (fire-and-forget)
        autoQualifyLead(lead, content, conversation.id, instance.id).catch(err =>
          console.error('[webhook] Erro na auto-qualificação:', err)
        );

        // ── Gera resposta via Claude Haiku ──────────────────────────────────────
        const agent = (conversation as any).agent;
        if (!agent) {
          console.log('[webhook] Sem agente na conversa — AI ignorada');
          return;
        }

        const aiReply = await aiService.processMessage({
          conversationId: conversation.id,
          instanceId: instance.id,
          leadId: lead.id,
          phoneNumber,
          pushName,
          content,
          agentSystemPrompt: agent.systemPrompt || agent.instructions || '',
          agentName: agent.name,
          agentModel: agent.aiModel,
          agentHistoryLimit: agent.historyLimit || 10,
          leadStatus: lead.status,
          leadName: lead.name,
          leadScore: lead.score || 0,
          isHumanHandling: (conversation as any).isHumanHandling || false,
        });

        if (!aiReply) {
          return;
        }

        // ── Atualiza status do lead se Claude indicou mudança ──────────────────
        if (aiReply.newLeadStatus && aiReply.newLeadStatus !== lead.status) {
          const validStatuses = ['NEW', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED'];
          if (validStatuses.includes(aiReply.newLeadStatus)) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { status: aiReply.newLeadStatus as any },
            });
            console.log(`[webhook] Lead ${lead.id} → ${aiReply.newLeadStatus}`);

            // Analytics
            if (aiReply.newLeadStatus === 'QUALIFIED') {
              analyticsService.recordLeadQualified(instance.id).catch(() => {});
            }
          }
        }

        // ── Envia mensagens picotadas com delay entre os balões ────────────────
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < aiReply.messages.length; i++) {
          const msg = aiReply.messages[i];
          if (!msg) continue;

          // Delay crescente entre balões (simula digitação)
          if (i > 0) await delay(1200 + msg.length * 15);

          await messageService.sendWhatsAppMessage(instance.id, phoneNumber, msg);

          await messageService.create({
            content: msg,
            direction: 'OUTBOUND',
            conversationId: conversation.id,
            instanceId: instance.id,
            timestamp: new Date(),
          });
        }

        console.log(`[webhook] ${aiReply.messages.length} balão(s) enviados para ${phoneNumber}`);

      } catch (error) {
        console.error('[webhook] Erro no processamento assíncrono:', error);
      }
    });
  },
};

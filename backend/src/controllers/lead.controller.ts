import { FastifyRequest, FastifyReply } from 'fastify';
import { leadService } from '../services/lead.service';
import { LeadStatus } from '@prisma/client';
import { z } from 'zod';

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['NEW', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED']).optional(),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const createLeadSchema = z.object({
  phone: z.string().min(8),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  instanceId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

export const leadController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createLeadSchema.parse(request.body);
    const existing = await leadService.findByPhone(data.phone);
    
    if (existing) {
      return reply.status(400).send({ error: 'Lead with this phone already exists' });
    }

    const lead = await leadService.create(data);
    return reply.status(201).send(lead);
  },
  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const { status } = request.query as { status?: LeadStatus };
    const leads = await leadService.findAll(status);
    return reply.send(leads);
  },

  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const lead = await leadService.findById(id);

    if (!lead) {
      return reply.status(404).send({ error: 'Lead not found' });
    }

    return reply.send(lead);
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = updateLeadSchema.parse(request.body);

    try {
      const lead = await leadService.update(id, data);
      return reply.send(lead);
    } catch {
      return reply.status(404).send({ error: 'Lead not found' });
    }
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: LeadStatus };

    try {
      const lead = await leadService.updateStatus(id, status);
      return reply.send(lead);
    } catch {
      return reply.status(404).send({ error: 'Lead not found' });
    }
  },

  /**
   * Atualização pelo n8n depois de cada resposta da IA
   * Aceita sinais extraídos do formato <<IA_LEAD:...>>
   */
  async aiUpdate(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { score_delta, notes_to_add, status, signals } = request.body as {
      score_delta?: number;
      notes_to_add?: string;
      status?: LeadStatus;
      signals?: string[]; // ex: ["SCORE:+15", "STATUS:QUALIFIED", "NOTE:texto"]
    };

    try {
      const lead = await leadService.findById(id);
      if (!lead) return reply.status(404).send({ error: 'Lead not found' });

      const updates: Record<string, unknown> = {};
      const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Processa sinais estruturados vindos do n8n
      if (signals && signals.length > 0) {
        for (const signal of signals) {
          if (signal.startsWith('SCORE:')) {
            const delta = parseInt(signal.replace('SCORE:', ''), 10);
            if (!isNaN(delta)) {
              updates.score = Math.min(100, Math.max(0, (lead.score || 0) + delta));
            }
          } else if (signal.startsWith('STATUS:')) {
            const newStatus = signal.replace('STATUS:', '') as LeadStatus;
            if (['NEW', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'].includes(newStatus)) {
              // Só muda para frente no funil, nunca regride
              const statusOrder = { NEW: 0, QUALIFIED: 1, DISQUALIFIED: 1, CONVERTED: 2 };
              if ((statusOrder[newStatus] || 0) >= (statusOrder[lead.status] || 0)) {
                updates.status = newStatus;
              }
            }
          } else if (signal.startsWith('NOTE:')) {
            const note = signal.replace('NOTE:', '').trim();
            if (note) {
              const newNote = `[${dateStr}] ${note}`;
              updates.notes = lead.notes ? `${lead.notes}\n${newNote}` : newNote;
            }
          }
        }
      }

      // Suporte a campos diretos também
      if (score_delta !== undefined) {
        updates.score = Math.min(100, Math.max(0, (lead.score || 0) + score_delta));
      }
      if (notes_to_add) {
        const newNote = `[${dateStr}] ${notes_to_add}`;
        updates.notes = lead.notes ? `${lead.notes}\n${newNote}` : newNote;
      }
      if (status) {
        updates.status = status;
      }

      if (Object.keys(updates).length === 0) {
        return reply.send(lead);
      }

      const updated = await leadService.update(id, updates as Parameters<typeof leadService.update>[1]);
      return reply.send(updated);
    } catch (error) {
      console.error('[lead/ai-update] Erro:', error);
      return reply.status(500).send({ error: 'Erro ao atualizar lead via IA' });
    }
  },
};

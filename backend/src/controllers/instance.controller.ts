import { FastifyRequest, FastifyReply } from 'fastify';
import { instanceService } from '../services/instance.service';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const createInstanceSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(1),
});

const updateInstanceSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['CONNECTED', 'DISCONNECTED', 'PENDING']).optional(),
  webhookUrl: z.string().url().optional(),
  adminPhone: z.string().optional().nullable(),
  supportPhone: z.string().optional().nullable(),
});

export const instanceController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, phoneNumber } = createInstanceSchema.parse(request.body);
      const instance = await instanceService.create({ name, phoneNumber });
      return reply.status(201).send(instance);
    } catch (error: any) {
      // Log and Write to Disk
      request.log.error(error);
      const logPath = path.join(process.cwd(), 'backend_error.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] CONTROLLER ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors });
      }

      // Handle Prisma Unique Constraint
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'campo';
        return reply.status(409).send({
          error: `Este ${field === 'phoneNumber' ? 'número de telefone' : field} já está em uso.`
        });
      }

      return reply.status(500).send({
        error: 'Erro interno ao criar instância',
        message: error.message
      });
    }
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const instances = await instanceService.findAll();
    return reply.send(instances);
  },

  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const instance = await instanceService.findById(id);

    if (!instance) {
      return reply.status(404).send({ error: 'Instance not found' });
    }

    return reply.send(instance);
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = updateInstanceSchema.parse(request.body);

    try {
      const instance = await instanceService.update(id, data);
      return reply.send(instance);
    } catch {
      return reply.status(404).send({ error: 'Instance not found' });
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      await instanceService.delete(id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Instance not found' });
    }
  },

  async generateQRCode(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      const qrData = await instanceService.connectInstance(id);
      return reply.send({
        message: 'QR Code gerado com sucesso',
        base64: qrData.base64,
        countDown: qrData.countDown,
      });
    } catch (error: unknown) {
      return reply.status(500).send({
        error: 'Falha ao gerar QR Code',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

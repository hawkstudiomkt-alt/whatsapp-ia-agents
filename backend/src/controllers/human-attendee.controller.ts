import { FastifyRequest, FastifyReply } from 'fastify';
import { humanAttendeeService } from '../services/human-attendee.service';
import { z } from 'zod';

const createAttendeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

const updateAttendeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  status: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).optional(),
});

const assignSchema = z.object({
  attendeeId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

export const humanAttendeeController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createAttendeeSchema.parse(request.body);
    const attendee = await humanAttendeeService.create(data);
    return reply.status(201).send(attendee);
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const attendees = await humanAttendeeService.findAll();
    return reply.send(attendees);
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'AVAILABLE' | 'BUSY' | 'OFFLINE' };

    try {
      const attendee = await humanAttendeeService.updateStatus(id, status);
      return reply.send(attendee);
    } catch {
      return reply.status(404).send({ error: 'Attendee not found' });
    }
  },

  async assign(request: FastifyRequest, reply: FastifyReply) {
    const { attendeeId, conversationId, leadId } = assignSchema.parse(request.body);

    if (!conversationId && !leadId) {
      return reply.status(400).send({ error: 'conversationId or leadId is required' });
    }

    try {
      await humanAttendeeService.assignToConversation(attendeeId, conversationId!, leadId);
      return reply.status(200).send({ success: true });
    } catch (error: unknown) {
      return reply.status(500).send({
        error: 'Failed to assign',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async getAssignments(request: FastifyRequest, reply: FastifyReply) {
    const { attendeeId } = request.params as { attendeeId: string };
    const assignments = await humanAttendeeService.getAssignmentsByAttendee(attendeeId);
    return reply.send(assignments);
  },

  async completeAssignment(request: FastifyRequest, reply: FastifyReply) {
    const { assignmentId } = request.params as { assignmentId: string };

    try {
      await humanAttendeeService.completeAssignment(assignmentId);
      return reply.status(200).send({ success: true });
    } catch {
      return reply.status(404).send({ error: 'Assignment not found' });
    }
  },
};

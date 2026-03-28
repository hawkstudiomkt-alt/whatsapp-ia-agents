import { prisma } from '../config/database';
import { HumanAttendee, HumanAttendeeStatus } from '@prisma/client';
import { messageService } from './message.service';

interface CreateAttendeeDTO {
  name: string;
  email: string;
  phone: string;
}

export const humanAttendeeService = {
  async create(data: CreateAttendeeDTO): Promise<HumanAttendee> {
    return prisma.humanAttendee.create({
      data,
    });
  },

  async findAll(): Promise<HumanAttendee[]> {
    return prisma.humanAttendee.findMany({
      include: {
        _count: {
          select: {
            assignments: {
              where: {
                status: 'ASSIGNED',
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  },

  async updateStatus(id: string, status: HumanAttendeeStatus): Promise<HumanAttendee> {
    return prisma.humanAttendee.update({
      where: { id },
      data: { status },
    });
  },

  async assignToConversation(
    attendeeId: string,
    conversationId: string,
    leadId?: string
  ): Promise<void> {
    await prisma.humanAttendeeAssignment.create({
      data: {
        attendeeId,
        conversationId,
        leadId,
        status: 'ASSIGNED',
      },
    });

    // Marca a conversa como sendo atendida por humano
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isHumanHandling: true,
        humanInterventionAt: new Date(),
      },
    });

    // Envia notificação para o atendente
    await this.notifyAttendee(attendeeId, conversationId);
  },

  async notifyAttendee(attendeeId: string, conversationId: string): Promise<void> {
    const attendee = await prisma.humanAttendee.findUnique({
      where: { id: attendeeId },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: true,
        agent: {
          include: {
            instance: true,
          },
        },
      },
    });

    if (!attendee || !conversation) return;

    // Aqui você pode enviar uma notificação por email, push, etc.
    // Por enquanto, vamos apenas logar
    console.log(`Notificando atendente ${attendee.name} sobre nova conversa: ${conversation.phone}`);

    // Opcional: Enviar mensagem no WhatsApp do atendente
    // await messageService.sendWhatsAppMessage(
    //   conversation.agent.instanceId,
    //   attendee.phone,
    //   `Nova conversa designada!\n\nCliente: ${conversation.lead?.name || conversation.phone}\n\nAcesse o dashboard para atender.`
    // );
  },

  async getAssignmentsByAttendee(attendeeId: string) {
    return prisma.humanAttendeeAssignment.findMany({
      where: { attendeeId },
      include: {
        conversation: {
          include: {
            lead: true,
            agent: true,
          },
        },
        lead: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async completeAssignment(assignmentId: string): Promise<void> {
    const assignment = await prisma.humanAttendeeAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Libera a conversa para o agente de IA novamente
    await prisma.conversation.update({
      where: { id: assignment.conversationId },
      data: {
        isHumanHandling: false,
        status: 'ACTIVE',
      },
    });
  },
};

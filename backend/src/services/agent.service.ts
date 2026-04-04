import { prisma } from '../config/database';
import { Agent, AgentStatus } from '@prisma/client';

interface CreateAgentDTO {
  name: string;
  instructions: string;
  systemPrompt: string;
  instanceId: string;
  tone?: string;
  language?: string;
  aiModel?: string;
  temperature?: number;
  historyLimit?: number;
  guardrails?: string;
}

interface UpdateAgentDTO {
  name?: string;
  instructions?: string;
  systemPrompt?: string;
  status?: AgentStatus;
  tone?: string;
  language?: string;
  aiModel?: string;
  temperature?: number;
  historyLimit?: number;
  guardrails?: string;
  humanInterventionEnabled?: boolean;
}

export const agentService = {
  async create(data: CreateAgentDTO): Promise<Agent> {
    return prisma.agent.create({
      data,
    });
  },

  async findAll(): Promise<Agent[]> {
    return prisma.agent.findMany({
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findById(id: string): Promise<Agent | null> {
    return prisma.agent.findUnique({
      where: { id },
      include: {
        instance: true,
        conversations: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
          include: {
            lead: true,
            _count: {
              select: {
                messages: true,
              },
            },
          },
        },
      },
    });
  },

  async update(id: string, data: UpdateAgentDTO): Promise<Agent> {
    return prisma.agent.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.agent.delete({
      where: { id },
    });
  },

  async findByInstance(instanceId: string): Promise<Agent[]> {
    return prisma.agent.findMany({
      where: { instanceId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async updateStatus(id: string, status: AgentStatus): Promise<Agent> {
    return prisma.agent.update({
      where: { id },
      data: { status },
    });
  },
};

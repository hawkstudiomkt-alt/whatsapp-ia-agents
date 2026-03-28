import { prisma } from '../config/database';
import { Instance, InstanceStatus } from '@prisma/client';
import { evolutionRequest } from '../config/evolution';

interface CreateInstanceDTO {
  name: string;
  phoneNumber: string;
}

interface UpdateInstanceDTO {
  name?: string;
  status?: InstanceStatus;
  webhookUrl?: string;
}

export const instanceService = {
  async create(data: CreateInstanceDTO): Promise<Instance> {
    const apiKey = `inst_${Math.random().toString(36).substring(2, 15)}`;

    return prisma.instance.create({
      data: {
        ...data,
        apiKey,
        status: InstanceStatus.PENDING,
      },
    });
  },

  async findAll(): Promise<Instance[]> {
    return prisma.instance.findMany({
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            conversations: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findById(id: string): Promise<Instance | null> {
    return prisma.instance.findUnique({
      where: { id },
      include: {
        agents: true,
        _count: {
          select: {
            conversations: true,
            messages: true,
          },
        },
      },
    });
  },

  async findByApiKey(apiKey: string): Promise<Instance | null> {
    return prisma.instance.findUnique({
      where: { apiKey },
    });
  },

  async update(id: string, data: UpdateInstanceDTO): Promise<Instance> {
    return prisma.instance.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.instance.delete({
      where: { id },
    });
  },

  async connectInstance(instanceId: string): Promise<void> {
    // Gera QR Code via Evolution API
    const response = await evolutionRequest<{
      base64: string;
      countDown: number;
    }>(instanceId, 'instance/connect', {
      method: 'POST',
    });

    // O QR Code em base64 pode ser enviado para o frontend
    console.log('QR Code gerado:', response);
  },

  async updateStatus(instanceId: string, status: InstanceStatus): Promise<Instance> {
    return prisma.instance.update({
      where: { id: instanceId },
      data: { status },
    });
  },
};

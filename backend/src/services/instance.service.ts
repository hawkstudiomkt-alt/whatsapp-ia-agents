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

  async findByName(name: string): Promise<Instance | null> {
    return prisma.instance.findFirst({
      where: { name },
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

  async connectInstance(instanceId: string): Promise<{ base64: string; countDown: number }> {
    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) throw new Error('Instância não encontrada');

    // Cria a instância na Evolution API
    try {
      await evolutionRequest(instance.name, 'instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName: instance.name,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });
    } catch (e: any) {
      // Se já existe, ignora. Qualquer outro erro, lança.
      if (!e.message?.includes('already')) {
        console.log('Aviso ao criar instância na Evolution:', e.message);
      }
    }


    const response = await evolutionRequest<{ pairingCode: string; code: string; base64: string }>(
      instance.name,
      `instance/connect/${instance.name}`,
      { method: 'GET' }
    );

    console.log('RESPOSTA EVOLUTION:', JSON.stringify(response, null, 2));

    if (!response.base64) {
      throw new Error(`QR Code não retornado pela Evolution. Resposta: ${JSON.stringify(response)}`);
    }

    return { base64: response.base64, countDown: 30 };

  },


  async updateStatus(instanceId: string, status: InstanceStatus): Promise<Instance> {
    return prisma.instance.update({
      where: { id: instanceId },
      data: { status },
    });
  },
};


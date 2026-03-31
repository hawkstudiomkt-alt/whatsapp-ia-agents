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

    const instance = await prisma.instance.create({
      data: {
        ...data,
        apiKey,
        status: InstanceStatus.PENDING,
      },
    });

    // Configura instância e webhook automaticamente na Evolution API
    try {
      await evolutionRequest(instance.name, 'instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName: instance.name,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      await evolutionRequest(instance.name, `webhook/set/${instance.name}`, {
        method: 'POST',
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: `${process.env.BACKEND_URL}/api/webhook/${apiKey}`,
            webhookByEvents: false,
            webhookBase64: false,
            events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT'],
          },
        }),
      });

      console.log(`✅ Webhook configurado para instância ${instance.name}`);
    } catch (e: any) {
      console.log(`⚠️ Aviso ao configurar Evolution: ${e.message}`);
    }

    return instance;
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
      if (!e.message?.includes('already')) {
        console.log('Aviso ao criar instância na Evolution:', e.message);
      }
    }

    const response = await evolutionRequest<{ pairingCode: string; code: string; base64: string }>(
      instance.name,
      `instance/connect/${instance.name}`,
      { method: 'GET' }
    );

    if (!response.base64) {
      throw new Error(`QR Code não retornado pela Evolution.`);
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
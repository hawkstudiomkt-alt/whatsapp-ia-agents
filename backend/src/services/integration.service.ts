import { prisma } from '../config/database';
import { Integration, IntegrationType } from '@prisma/client';

interface UpsertIntegrationDTO {
  instanceId: string;
  type: IntegrationType;
  config: any;
  isActive?: boolean;
}

export const integrationService = {
  async upsert(data: UpsertIntegrationDTO): Promise<Integration> {
    const { instanceId, type, config, isActive } = data;

    return prisma.integration.upsert({
      where: {
        instanceId_type: {
          instanceId,
          type,
        },
      },
      update: {
        config,
        isActive: isActive ?? true,
      },
      create: {
        instanceId,
        type,
        config,
        isActive: isActive ?? true,
      },
    });
  },

  async findByInstance(instanceId: string): Promise<Integration[]> {
    return prisma.integration.findMany({
      where: { instanceId },
    });
  },

  async findByInstanceAndType(instanceId: string, type: IntegrationType): Promise<Integration | null> {
    return prisma.integration.findUnique({
      where: {
        instanceId_type: {
          instanceId,
          type,
        },
      },
    });
  },

  async delete(instanceId: string, type: IntegrationType): Promise<void> {
    await prisma.integration.delete({
      where: {
        instanceId_type: {
          instanceId,
          type,
        },
      },
    });
  },
};

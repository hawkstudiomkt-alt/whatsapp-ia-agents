import { prisma } from '../config/database';
import { Integration, IntegrationType } from '@prisma/client';

export const integrationService = {
    async findByInstance(instanceId: string): Promise<Integration[]> {
        return prisma.integration.findMany({
            where: { instanceId },
        });
    },

    async upsert(data: {
        instanceId: string;
        type: IntegrationType;
        config: any;
        isActive?: boolean;
    }): Promise<Integration> {
        return prisma.integration.upsert({
            where: {
                instanceId_type: {
                    instanceId: data.instanceId,
                    type: data.type,
                },
            },
            update: {
                config: data.config,
                isActive: data.isActive ?? true,
            },
            create: {
                instanceId: data.instanceId,
                type: data.type,
                config: data.config,
                isActive: data.isActive ?? true,
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
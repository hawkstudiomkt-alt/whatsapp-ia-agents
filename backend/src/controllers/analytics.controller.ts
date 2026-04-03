import { FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from '../services/analytics.service';

export const analyticsController = {
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    const summary = await analyticsService.getSummary(instanceId);
    return reply.send(summary);
  },

  async getDailyAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId, days } = request.query as { instanceId?: string; days?: string };
    const analytics = await analyticsService.getDailyAnalytics(
      instanceId,
      days ? parseInt(days, 10) : 7
    );
    return reply.send(analytics);
  },

  async getAgentPerformance(request: FastifyRequest, reply: FastifyReply) {
    const { agentId } = request.params as { agentId: string };
    try {
      const performance = await analyticsService.getAgentPerformance(agentId);
      return reply.send(performance);
    } catch {
      return reply.status(404).send({ error: 'Agent not found' });
    }
  },

  async getDashboardData(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    try {
      const data = await analyticsService.getDashboardData(instanceId);
      return reply.send(data);
    } catch (error) {
      console.error('[analytics] Erro no dashboard:', error);
      return reply.status(500).send({ error: 'Erro ao carregar dados do dashboard' });
    }
  },

  async getFunnelData(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    try {
      const funnel = await analyticsService.getFunnelData(instanceId);
      return reply.send(funnel);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao carregar funil' });
    }
  },

  async getLeadBreakdown(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    try {
      const breakdown = await analyticsService.getLeadBreakdown(instanceId);
      return reply.send(breakdown);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao carregar breakdown de leads' });
    }
  },
};

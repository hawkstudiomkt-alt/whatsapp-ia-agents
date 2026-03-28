import { FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from '../services/analytics.service';
import { agentService } from '../services/agent.service';

export const analyticsController = {
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };
    const summary = await analyticsService.getSummary(instanceId);
    return reply.send(summary);
  },

  async getDailyAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId, days } = request.query as {
      instanceId?: string;
      days?: string;
    };
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

    const [summary, dailyAnalytics, agents] = await Promise.all([
      analyticsService.getSummary(instanceId),
      analyticsService.getDailyAnalytics(instanceId, 7),
      agentService.findAll(),
    ]);

    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        const perf = await analyticsService.getAgentPerformance(agent.id);
        return {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          ...perf,
        };
      })
    );

    return reply.send({
      summary,
      dailyAnalytics,
      agents: agentPerformance,
    });
  },

  async getDashboardData(request: FastifyRequest, reply: FastifyReply) {
    const { instanceId } = request.query as { instanceId?: string };

    try {
      const dashboardData = await analyticsService.getDashboardData(instanceId);
      return reply.send(dashboardData);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao carregar dados do dashboard' });
    }
  },
};

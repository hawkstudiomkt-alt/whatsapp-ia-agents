import { prisma } from '../config/database';
import { AnalyticsSummary, DailyAnalytics } from '../types';
import { ConversationStatus, LeadStatus } from '@prisma/client';
import { agentService } from './agent.service';

export const analyticsService = {
  async getSummary(instanceId?: string): Promise<AnalyticsSummary> {
    const where = instanceId ? { instanceId } : {};

    // Totais históricos
    const totalMessagesSent = await prisma.analytics.aggregate({
      where,
      _sum: { messagesSent: true },
    });

    const totalMessagesReceived = await prisma.analytics.aggregate({
      where,
      _sum: { messagesReceived: true },
    });

    const totalLeadsQualified = await prisma.analytics.aggregate({
      where,
      _sum: { leadsQualified: true },
    });

    const totalLeadsConverted = await prisma.analytics.aggregate({
      where,
      _sum: { leadsConverted: true },
    });

    // Conversas ativas e totais
    const activeConversations = await prisma.conversation.count({
      where: {
        ...where,
        status: ConversationStatus.ACTIVE,
      },
    });

    const totalConversations = await prisma.conversation.count({
      where,
    });

    const messagesSent = totalMessagesSent._sum.messagesSent || 0;
    const messagesReceived = totalMessagesReceived._sum.messagesReceived || 0;
    const leadsQualified = totalLeadsQualified._sum.leadsQualified || 0;
    const leadsConverted = totalLeadsConverted._sum.leadsConverted || 0;

    return {
      totalMessages: messagesSent + messagesReceived,
      messagesSent,
      messagesReceived,
      activeConversations,
      totalConversations,
      leadsQualified,
      leadsConverted,
      conversionRate: leadsQualified > 0 ? (leadsConverted / leadsQualified) * 100 : 0,
    };
  },

  async getDailyAnalytics(instanceId?: string, days = 7): Promise<DailyAnalytics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where = instanceId
      ? { instanceId, date: { gte: startDate } }
      : { date: { gte: startDate } };

    const analytics = await prisma.analytics.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return analytics.map(a => ({
      date: a.date.toISOString().split('T')[0],
      messagesSent: a.messagesSent,
      messagesReceived: a.messagesReceived,
      conversationsStarted: a.conversationsStarted,
      conversationsClosed: a.conversationsClosed,
      leadsQualified: a.leadsQualified,
      leadsConverted: a.leadsConverted,
    }));
  },

  async getAgentPerformance(agentId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { agentId },
      include: {
        messages: {
          select: {
            direction: true,
            id: true,
          },
        },
        lead: {
          select: {
            status: true,
            score: true,
          },
        },
      },
    });

    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(c => c.status === ConversationStatus.ACTIVE).length;
    const closedConversations = conversations.filter(c => c.status === ConversationStatus.CLOSED).length;

    const totalMessages = conversations.reduce(
      (acc, c) => acc + c.messages.length,
      0
    );

    const convertedLeads = conversations.filter(
      c => c.lead?.status === LeadStatus.CONVERTED
    ).length;

    const avgScore = conversations.reduce(
      (acc, c) => acc + (c.lead?.score || 0),
      0
    ) / totalConversations;

    return {
      totalConversations,
      activeConversations,
      closedConversations,
      totalMessages,
      convertedLeads,
      conversionRate: totalConversations > 0 ? (convertedLeads / totalConversations) * 100 : 0,
      averageLeadScore: Math.round(avgScore),
    };
  },

  async getFunnelData(instanceId?: string) {
    const where: any = instanceId ? { instanceId } : {};

    const totalLeads = await prisma.lead.count({ where });
    const qualifiedLeads = await prisma.lead.count({
      where: { ...where, status: LeadStatus.QUALIFIED }
    });
    const convertedLeads = await prisma.lead.count({
      where: { ...where, status: LeadStatus.CONVERTED }
    });

    return [
      { step: 'Total de Leads', count: totalLeads, percentage: 100 },
      { step: 'Leads Qualificados', count: qualifiedLeads, percentage: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0 },
      { step: 'Vendas/Conversões', count: convertedLeads, percentage: qualifiedLeads > 0 ? Math.round((convertedLeads / qualifiedLeads) * 100) : 0 },
    ];
  },

  async getDashboardData(instanceId?: string) {
    const [summary, dailyAnalytics, agents] = await Promise.all([
      this.getSummary(instanceId),
      this.getDailyAnalytics(instanceId, 7),
      agentService.findAll(),
    ]);

    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        const perf = await this.getAgentPerformance(agent.id);
        return {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          ...perf,
        };
      })
    );

    return {
      summary,
      dailyAnalytics,
      agents: agentPerformance,
    };
  },

  async recordConversationEvent(
    instanceId: string,
    event: 'started' | 'closed'
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const field = event === 'started' ? 'conversationsStarted' : 'conversationsClosed';

    await prisma.analytics.upsert({
      where: {
        date_instanceId: {
          date: today,
          instanceId,
        },
      },
      update: {
        [field]: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        date: today,
        instanceId,
        [field]: 1,
      },
    });
  },
};

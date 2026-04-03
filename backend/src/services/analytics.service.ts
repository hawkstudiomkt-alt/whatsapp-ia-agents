import { prisma } from '../config/database';
import { AnalyticsSummary, DailyAnalytics } from '../types';
import { ConversationStatus, LeadStatus, MessageDirection } from '@prisma/client';
import { agentService } from './agent.service';

export const analyticsService = {
  /**
   * Resumo em tempo real — busca direto nas tabelas de origem, não na tabela Analytics
   */
  async getSummary(instanceId?: string): Promise<AnalyticsSummary> {
    const where = instanceId ? { instanceId } : {};

    // Mensagens reais da tabela Message
    const [totalMessages, messagesSent, messagesReceived] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.count({ where: { ...where, direction: MessageDirection.OUTBOUND } }),
      prisma.message.count({ where: { ...where, direction: MessageDirection.INBOUND } }),
    ]);

    // Conversas reais
    const [activeConversations, totalConversations] = await Promise.all([
      prisma.conversation.count({ where: { ...where, status: ConversationStatus.ACTIVE } }),
      prisma.conversation.count({ where }),
    ]);

    // Leads reais por status
    const [totalLeads, leadsQualified, leadsConverted, leadsNew, leadsDisqualified] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: { in: [LeadStatus.QUALIFIED, LeadStatus.CONVERTED] } } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.DISQUALIFIED } }),
    ]);

    // Leads novos hoje
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const leadsToday = await prisma.lead.count({
      where: { ...where, createdAt: { gte: todayStart } },
    });

    // Tempo economizado: cada mensagem da IA = ~5 min de trabalho humano
    const timeSavedHours = Math.round((messagesSent * 5) / 60);

    // % de automação: msgs da IA / total
    const automationRate = totalMessages > 0 ? Math.round((messagesSent / totalMessages) * 100) : 0;

    return {
      totalMessages,
      messagesSent,
      messagesReceived,
      activeConversations,
      totalConversations,
      totalLeads,
      leadsQualified,
      leadsConverted,
      leadsNew,
      leadsDisqualified,
      leadsToday,
      conversionRate: leadsQualified > 0 ? (leadsConverted / leadsQualified) * 100 : 0,
      timeSavedHours,
      automationRate,
    };
  },

  /**
   * Dados diários — combina tabela Analytics (histórico) com fallback para queries diretas
   */
  async getDailyAnalytics(instanceId?: string, days = 7): Promise<DailyAnalytics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Busca dados reais de mensagens agrupados por dia
    const messagesByDay = await prisma.$queryRaw<Array<{ day: Date; sent: bigint; received: bigint }>>`
      SELECT
        DATE_TRUNC('day', timestamp) as day,
        COUNT(CASE WHEN direction = 'OUTBOUND' THEN 1 END) as sent,
        COUNT(CASE WHEN direction = 'INBOUND' THEN 1 END) as received
      FROM "messages"
      WHERE timestamp >= ${startDate}
      ${instanceId ? prisma.$queryRaw`AND "instanceId" = ${instanceId}` : prisma.$queryRaw``}
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY day ASC
    `;

    // Busca leads criados por dia
    const leadsByDay = await prisma.$queryRaw<Array<{ day: Date; total: bigint }>>`
      SELECT
        DATE_TRUNC('day', "createdAt") as day,
        COUNT(*) as total
      FROM "leads"
      WHERE "createdAt" >= ${startDate}
      ${instanceId ? prisma.$queryRaw`AND "instanceId" = ${instanceId}` : prisma.$queryRaw``}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `;

    // Busca leads qualificados/convertidos por dia
    const qualifiedByDay = await prisma.$queryRaw<Array<{ day: Date; qualified: bigint; converted: bigint }>>`
      SELECT
        DATE_TRUNC('day', "updatedAt") as day,
        COUNT(CASE WHEN status = 'QUALIFIED' THEN 1 END) as qualified,
        COUNT(CASE WHEN status = 'CONVERTED' THEN 1 END) as converted
      FROM "leads"
      WHERE "updatedAt" >= ${startDate}
      AND status IN ('QUALIFIED', 'CONVERTED')
      ${instanceId ? prisma.$queryRaw`AND "instanceId" = ${instanceId}` : prisma.$queryRaw``}
      GROUP BY DATE_TRUNC('day', "updatedAt")
      ORDER BY day ASC
    `;

    // Monta array de dias
    const result: DailyAnalytics[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];

      const msgData = messagesByDay.find(
        m => new Date(m.day).toISOString().split('T')[0] === dateStr
      );
      const leadData = leadsByDay.find(
        l => new Date(l.day).toISOString().split('T')[0] === dateStr
      );
      const qualData = qualifiedByDay.find(
        q => new Date(q.day).toISOString().split('T')[0] === dateStr
      );

      result.push({
        date: dateStr,
        messagesSent: Number(msgData?.sent || 0),
        messagesReceived: Number(msgData?.received || 0),
        conversationsStarted: Number(leadData?.total || 0),
        conversationsClosed: 0,
        leadsQualified: Number(qualData?.qualified || 0),
        leadsConverted: Number(qualData?.converted || 0),
      });
    }

    return result;
  },

  /**
   * Performance de um agente específico
   */
  async getAgentPerformance(agentId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { agentId },
      include: {
        messages: { select: { direction: true, id: true } },
        lead: { select: { status: true, score: true } },
      },
    });

    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(c => c.status === ConversationStatus.ACTIVE).length;
    const closedConversations = conversations.filter(c => c.status === ConversationStatus.CLOSED).length;
    const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
    const convertedLeads = conversations.filter(c => c.lead?.status === LeadStatus.CONVERTED).length;
    const avgScore = totalConversations > 0
      ? conversations.reduce((acc, c) => acc + (c.lead?.score || 0), 0) / totalConversations
      : 0;

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

  /**
   * Dados do funil de vendas — direto da tabela de leads
   */
  async getFunnelData(instanceId?: string) {
    const where: any = instanceId ? { instanceId } : {};

    const [totalLeads, qualifiedLeads, convertedLeads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: { in: [LeadStatus.QUALIFIED, LeadStatus.CONVERTED] } } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
    ]);

    return [
      { step: 'Total de Leads', count: totalLeads, percentage: 100 },
      {
        step: 'Leads Qualificados',
        count: qualifiedLeads,
        percentage: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0,
      },
      {
        step: 'Vendas/Conversões',
        count: convertedLeads,
        percentage: qualifiedLeads > 0 ? Math.round((convertedLeads / qualifiedLeads) * 100) : 0,
      },
    ];
  },

  /**
   * Breakdown de leads por status
   */
  async getLeadBreakdown(instanceId?: string) {
    const where: any = instanceId ? { instanceId } : {};

    const [newLeads, qualified, disqualified, converted] = await Promise.all([
      prisma.lead.count({ where: { ...where, status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.QUALIFIED } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.DISQUALIFIED } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
    ]);

    return { new: newLeads, qualified, disqualified, converted, total: newLeads + qualified + disqualified + converted };
  },

  /**
   * Dashboard completo — summary + funnel + daily + agents
   */
  async getDashboardData(instanceId?: string) {
    const [summary, dailyAnalytics, funnelData, leadBreakdown, agents] = await Promise.all([
      this.getSummary(instanceId),
      this.getDailyAnalytics(instanceId, 7),
      this.getFunnelData(instanceId),
      this.getLeadBreakdown(instanceId),
      agentService.findAll(),
    ]);

    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        const perf = await this.getAgentPerformance(agent.id);
        return { id: agent.id, name: agent.name, status: agent.status, ...perf };
      })
    );

    return { summary, dailyAnalytics, funnelData, leadBreakdown, agents: agentPerformance };
  },

  /**
   * Registra qualificação de lead no analytics diário
   */
  async recordLeadQualified(instanceId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.analytics.upsert({
      where: { date_instanceId: { date: today, instanceId } },
      update: { leadsQualified: { increment: 1 }, updatedAt: new Date() },
      create: { date: today, instanceId, leadsQualified: 1 },
    });
  },

  /**
   * Registra conversão de lead no analytics diário
   */
  async recordLeadConverted(instanceId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.analytics.upsert({
      where: { date_instanceId: { date: today, instanceId } },
      update: { leadsConverted: { increment: 1 }, updatedAt: new Date() },
      create: { date: today, instanceId, leadsConverted: 1 },
    });
  },

  async recordConversationEvent(instanceId: string, event: 'started' | 'closed'): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const field = event === 'started' ? 'conversationsStarted' : 'conversationsClosed';

    await prisma.analytics.upsert({
      where: { date_instanceId: { date: today, instanceId } },
      update: { [field]: { increment: 1 }, updatedAt: new Date() },
      create: { date: today, instanceId, [field]: 1 },
    });
  },
};

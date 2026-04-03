import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { analyticsApi, instancesApi } from '../lib/api';
import {
  TrendingUp,
  Users,
  UserCheck,
  Target,
  ArrowRight,
  Clock,
  MessageCircle,
  BarChart3,
  Zap,
  UserPlus,
  XCircle
} from 'lucide-react';
import { Card, LoadingSpinner, Badge, PageTransition } from '../components/ui';

export default function Dashboard() {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');

  const { data: instances } = useQuery({
    queryKey: ['instances'],
    queryFn: instancesApi.findAll,
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['analytics-summary', selectedInstanceId],
    queryFn: () => analyticsApi.getSummary(selectedInstanceId || undefined),
    refetchInterval: 30_000,
  });

  const { data: breakdown, isLoading: isBreakdownLoading } = useQuery({
    queryKey: ['analytics-breakdown', selectedInstanceId],
    queryFn: () => analyticsApi.getLeadBreakdown(selectedInstanceId || undefined),
    refetchInterval: 30_000,
  });

  const { data: funnel, isLoading: isFunnelLoading } = useQuery({
    queryKey: ['analytics-funnel', selectedInstanceId],
    queryFn: () => analyticsApi.getFunnel(selectedInstanceId || undefined),
    refetchInterval: 30_000,
  });

  const { data: daily, isLoading: isDailyLoading } = useQuery({
    queryKey: ['analytics-daily', selectedInstanceId],
    queryFn: () => analyticsApi.getDaily(selectedInstanceId || undefined, 7),
    refetchInterval: 60_000,
  });

  const isLoading = isSummaryLoading || isBreakdownLoading || isFunnelLoading || isDailyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  const funnelRows = funnel && funnel.length > 0
    ? funnel
    : [
        { step: 'Total de Leads', count: summary?.totalLeads || 0, percentage: 100 },
        { step: 'Leads Qualificados', count: summary?.leadsQualified || 0, percentage: summary?.totalLeads ? Math.round((summary.leadsQualified / summary.totalLeads) * 100) : 0 },
        { step: 'Vendas / Conversões', count: summary?.leadsConverted || 0, percentage: summary?.leadsQualified ? Math.round((summary.leadsConverted / summary.leadsQualified) * 100) : 0 },
      ];

  const funnelColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500'];
  const funnelIcons = [Users, Target, UserCheck];

  return (
    <PageTransition>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">ROI Dashboard</h1>
            <p className="text-gray-400 mt-2">Acompanhe o desempenho da sua agência em tempo real.</p>
          </div>

          <div className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-2xl border border-gray-700/50">
            <BarChart3 className="w-5 h-5 text-gray-500 ml-2" />
            <select
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 min-w-[200px]"
            >
              <option value="">Todas as Instâncias</option>
              {instances?.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <KPICard
            title="Total de Mensagens"
            value={summary?.totalMessages || 0}
            icon={MessageCircle}
            color="blue"
            description="Interações totais da IA"
          />
          <KPICard
            title="Conversas Ativas"
            value={summary?.activeConversations || 0}
            icon={TrendingUp}
            color="purple"
            description="Atendimentos agora"
          />
          <KPICard
            title="Leads Hoje"
            value={summary?.leadsToday || 0}
            icon={UserPlus}
            color="yellow"
            description="Novos contatos hoje"
          />
          <KPICard
            title="Taxa de Conversão"
            value={`${(summary?.conversionRate || 0).toFixed(1)}%`}
            icon={UserCheck}
            color="green"
            description="Eficiência comercial"
          />
        </div>

        {/* Funnel + Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Funnel */}
          <Card className="lg:col-span-2 p-8 border-gray-700/50 bg-gradient-to-b from-gray-800/50 to-transparent">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-400" /> Funil de Vendas Automático
            </h3>

            <div className="space-y-6">
              {funnelRows.map((item, index) => {
                const FunnelIcon = funnelIcons[index] || Target;
                const maxCount = funnelRows[0]?.count || 1;
                const width = Math.max(4, (item.count / maxCount) * 100);

                return (
                  <div key={item.step} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FunnelIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">{item.step}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{item.percentage}%</span>
                        <span className="text-lg font-bold text-white">{item.count}</span>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className={`h-full ${funnelColors[index] || 'bg-gray-500'} rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
                      />
                    </div>
                    {index < funnelRows.length - 1 && (
                      <div className="flex justify-center -my-1 relative z-10">
                        <div className="bg-gray-800 p-1 rounded-full border border-gray-700">
                          <ArrowRight className="w-3 h-3 text-gray-500 rotate-90" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Tempo Economizado
                </p>
                <p className="text-2xl font-bold text-green-400">{summary?.timeSavedHours || 0}h</p>
                <p className="text-[10px] text-gray-600 mt-1">~5 min por resposta da IA</p>
              </div>
              <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Automação
                </p>
                <p className="text-2xl font-bold text-purple-400">{summary?.automationRate || 0}%</p>
                <p className="text-[10px] text-gray-600 mt-1">Msgs enviadas pela IA</p>
              </div>
            </div>
          </Card>

          {/* Lead Breakdown sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Status dos Leads
              </h3>
              <div className="space-y-3">
                <LeadStatusRow label="Novos" value={breakdown?.new || 0} color="text-blue-400" bgColor="bg-blue-500/20" />
                <LeadStatusRow label="Qualificados" value={breakdown?.qualified || 0} color="text-purple-400" bgColor="bg-purple-500/20" />
                <LeadStatusRow label="Convertidos" value={breakdown?.converted || 0} color="text-green-400" bgColor="bg-green-500/20" />
                <LeadStatusRow label="Desqualificados" value={breakdown?.disqualified || 0} color="text-red-400" bgColor="bg-red-500/20" icon={XCircle} />
                <div className="pt-2 border-t border-gray-700/50 flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-bold">Total</span>
                  <span className="text-lg font-black text-white">{breakdown?.total || summary?.totalLeads || 0}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border-purple-500/30">
              <h3 className="text-lg font-bold text-white mb-2">Desempenho da Automação</h3>
              <p className="text-sm text-gray-400 mb-6">
                Sua IA está lidando com <span className="text-purple-300 font-bold">{summary?.automationRate || 0}%</span> das interações hoje.
              </p>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${summary?.automationRate || 0}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-purple-500 rounded-full"
                  />
                </div>
                <span className="text-xs font-bold text-purple-400">{summary?.automationRate || 0}%</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Daily Trend */}
        {daily && daily.length > 0 && (
          <Card className="p-8 border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-400" /> Atividade dos Últimos 7 Dias
            </h3>
            <div className="grid grid-cols-7 gap-2 h-36 items-end">
              {daily.map((day) => {
                const maxMsgs = Math.max(...daily.map(d => d.messagesSent + d.messagesReceived), 1);
                const total = day.messagesSent + day.messagesReceived;
                const heightPct = Math.max(4, (total / maxMsgs) * 100);
                const label = new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' });

                return (
                  <div key={day.date} className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-500 font-bold">{total > 0 ? total : ''}</span>
                    <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: '100px' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.6 }}
                        className="w-full bg-gradient-to-t from-purple-600 to-blue-500 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity"
                        title={`${day.messagesSent} enviadas, ${day.messagesReceived} recebidas`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-t from-purple-600 to-blue-500 inline-block" />
                Mensagens totais por dia
              </span>
              <span>
                Total da semana: <span className="text-white font-bold">{daily.reduce((s, d) => s + d.messagesSent + d.messagesReceived, 0)}</span>
              </span>
              <span>
                Leads qualificados: <span className="text-purple-400 font-bold">{daily.reduce((s, d) => s + d.leadsQualified, 0)}</span>
              </span>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

function KPICard({ title, value, icon: Icon, color, description }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'yellow' | 'green';
  description: string;
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    yellow: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 text-green-400',
  };

  return (
    <Card className={`p-6 bg-gradient-to-br ${colors[color]} group hover:scale-[1.02] transition-all cursor-default`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl bg-gray-900/50 border border-current opacity-60 group-hover:opacity-100 transition-opacity">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">{title}</h3>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-black text-white">{value}</span>
      </div>
      <p className="mt-2 text-xs text-gray-500 italic">{description}</p>
    </Card>
  );
}

function LeadStatusRow({ label, value, color, bgColor, icon: Icon }: {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700/30">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${bgColor} ${color}`}>{value}</span>
    </div>
  );
}

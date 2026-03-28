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
  Calendar,
  MessageCircle,
  BarChart3
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
    queryFn: () => analyticsApi.getSummary(selectedInstanceId),
  });

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: analyticsApi.getDashboard,
  });

  const funnelData = [
    { label: 'Total de Leads', value: summary?.totalConversations || 0, color: 'bg-blue-500', icon: Users },
    { label: 'Leads Qualificados', value: summary?.leadsQualified || 0, color: 'bg-purple-500', icon: Target },
    { label: 'Vendas / Conversão', value: summary?.leadsConverted || 0, color: 'bg-green-500', icon: UserCheck },
  ];

  if (isSummaryLoading || isDashboardLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8 pb-20">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            title="Leads Qualificados" 
            value={summary?.leadsQualified || 0} 
            icon={Target} 
            color="yellow"
            description="Prontos para fechar"
          />
          <KPICard 
            title="Taxa de Conversão" 
            value={`${summary?.conversionRate.toFixed(1)}%`} 
            icon={UserCheck} 
            color="green"
            description="Eficiência comercial"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Funnel Chart */}
          <Card className="lg:col-span-2 p-8 border-gray-700/50 bg-gradient-to-b from-gray-800/50 to-transparent">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-400" /> Funil de Vendas Automático
            </h3>
            
            <div className="space-y-6">
              {funnelData.map((item, index) => {
                const maxValue = funnelData[0].value || 1;
                const width = (item.value / maxValue) * 100;
                
                return (
                  <div key={item.label} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">{item.label}</span>
                      </div>
                      <span className="text-lg font-bold text-white">{item.value}</span>
                    </div>
                    <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700/30">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className={`h-full ${item.color} rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
                      />
                    </div>
                    {index < funnelData.length - 1 && (
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
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Custo por Lead (Est.)</p>
                <p className="text-2xl font-bold text-white">R$ 0,15</p>
                <p className="text-[10px] text-gray-600 mt-1">Baseado em tokens de IA</p>
              </div>
              <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tempo Economizado</p>
                <p className="text-2xl font-bold text-green-400">142h</p>
                <p className="text-[10px] text-gray-600 mt-1">Este mês</p>
              </div>
            </div>
          </Card>

          {/* Quick Actions / Integration Status */}
          <div className="space-y-8">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" /> Agendamentos
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700/30">
                  <span className="text-sm text-gray-400">Total este mês</span>
                  <span className="font-bold text-white">24</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700/30">
                  <span className="text-sm text-gray-400">Confirmados</span>
                  <Badge variant="success">18</Badge>
                </div>
              </div>
              <button className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all">
                Ver Agenda Completa
              </button>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border-purple-500/30">
              <h3 className="text-lg font-bold text-white mb-2">Desempenho da Agência</h3>
              <p className="text-sm text-gray-400 mb-6">Sua automação está lidando com 89% da carga de trabalho hoje.</p>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[89%]" />
                </div>
                <span className="text-xs font-bold text-purple-400">89%</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function KPICard({ title, value, icon: Icon, color, description }: any) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    yellow: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 text-green-400',
  };

  return (
    <Card className={`p-6 bg-gradient-to-br ${colors[color as keyof typeof colors]} group hover:scale-[1.02] transition-all cursor-default`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl bg-gray-900/50 border border-current opacity-60 group-hover:opacity-100 transition-opacity`}>
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

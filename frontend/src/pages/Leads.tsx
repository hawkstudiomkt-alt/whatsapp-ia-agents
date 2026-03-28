import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, instancesApi, agentsApi, followupsApi, Lead } from '../lib/api';
import { Users, TrendingUp, Mail, Phone, Star, Calendar, Clock, Filter, MessageSquare, Plus, X } from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, PageTransition } from '../components/ui';

export default function Leads() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('');
  const [instanceFilter, setInstanceFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLeadForFollowUp, setSelectedLeadForFollowUp] = useState<Lead | null>(null);
  
  const [newLeadData, setNewLeadData] = useState({
    phone: '',
    name: '',
    email: '',
    instanceId: '',
    agentId: '',
  });

  const [followUpForm, setFollowUpForm] = useState({
    type: 'REMINDER',
    days: 1,
    notes: '',
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', filter],
    queryFn: () => leadsApi.findAll(filter as any || undefined),
  });

  const { data: instances } = useQuery({
    queryKey: ['instances'],
    queryFn: instancesApi.findAll,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.findAll,
  });

  const createLeadMutation = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowCreateForm(false);
      setNewLeadData({ phone: '', name: '', email: '', instanceId: '', agentId: '' });
      alert('Lead criado com sucesso!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erro ao criar lead');
    }
  });

  const followUpMutation = useMutation({
    mutationFn: followupsApi.create,
    onSuccess: () => {
      setSelectedLeadForFollowUp(null);
      alert('Follow-up agendado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const filteredLeads = leads?.filter(lead => {
    const leadInstanceId = lead.conversation?.instanceId || (lead as any).instanceId;
    if (instanceFilter && leadInstanceId !== instanceFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      NEW: { color: 'bg-blue-500', label: 'Novo' },
      QUALIFIED: { color: 'bg-green-500', label: 'Qualificado' },
      DISQUALIFIED: { color: 'bg-red-500', label: 'Desqualificado' },
      CONVERTED: { color: 'bg-purple-500', label: 'Convertido' },
    };
    const configStatus = config[status as keyof typeof config] || config.NEW;
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${configStatus.color}`}>
        {configStatus.label}
      </span>
    );
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleStatusChange = (lead: Lead, newStatus: Lead['status']) => {
    updateMutation.mutate({ id: lead.id, data: { status: newStatus } });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Leads</h1>
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => setShowCreateForm(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Lead
            </Button>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 pr-10 py-2 text-white focus:outline-none focus:border-green-500 text-sm appearance-none cursor-pointer"
            >
              <option value="">Status: Todos</option>
              <option value="NEW">Novos</option>
              <option value="QUALIFIED">Qualificados</option>
              <option value="CONVERTED">Convertidos</option>
              <option value="DISQUALIFIED">Desqualificados</option>
            </select>
            <select
              value={instanceFilter}
              onChange={(e) => setInstanceFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 pr-10 py-2 text-white focus:outline-none focus:border-green-500 text-sm appearance-none cursor-pointer"
            >
              <option value="">Todas Instâncias</option>
              {instances?.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['NEW', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED'] as const).map((status) => {
            const count = leads?.filter((l) => l.status === status).length || 0;
            const labels = { NEW: 'Novos', QUALIFIED: 'Qualificados', CONVERTED: 'Convertidos', DISQUALIFIED: 'Desqualificados' };
            return (
              <Card key={status} className="p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">{labels[status]}</p>
                <p className="text-2xl font-bold text-white mt-1">{count}</p>
              </Card>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Agente / Instância</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : filteredLeads?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      Nenhum lead encontrado
                    </td>
                  </tr>
                ) : (
                  filteredLeads?.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-700/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-green-500 font-bold border border-green-500/20">
                            {(lead.name || 'L')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{lead.name || 'Não informado'}</p>
                            <p className="text-gray-400 text-sm flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${lead.score && lead.score >= 50 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
                          <span className={`font-bold ${getScoreColor(lead.score)}`}>
                            {lead.score || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white text-sm font-medium">
                          {lead.conversation?.agent?.name || (lead as any).agent?.name || '-'}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {instances?.find(i => i.id === (lead.conversation?.instanceId || (lead as any).instanceId))?.name || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead, e.target.value as Lead['status'])}
                            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-green-500"
                          >
                            <option value="NEW">Mudar Status</option>
                            <option value="NEW">Novo</option>
                            <option value="QUALIFIED">Qualificado</option>
                            <option value="DISQUALIFIED">Desqualificado</option>
                            <option value="CONVERTED">Convertido</option>
                          </select>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedLeadForFollowUp(lead)}
                            className="p-1.5 h-auto rounded-lg"
                            title="Agendar Follow-up"
                          >
                            <Calendar className="w-4 h-4 text-blue-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Novo Lead */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-3xl p-8 w-full max-w-lg border border-gray-700 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Plus className="text-green-500" /> Adicionar Novo Lead
                </h2>
                <button onClick={() => setShowCreateForm(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">WhatsApp (Número Completo)</label>
                  <input
                    type="text"
                    placeholder="Ex: 5511999999999"
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Nome do Lead</label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={newLeadData.name}
                      onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Email (Opcional)</label>
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newLeadData.email}
                      onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Instância Responsável</label>
                    <select
                      value={newLeadData.instanceId}
                      onChange={(e) => setNewLeadData({ ...newLeadData, instanceId: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                    >
                      <option value="">Selecione...</option>
                      {instances?.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Agente Atribuído</label>
                    <select
                      value={newLeadData.agentId}
                      onChange={(e) => setNewLeadData({ ...newLeadData, agentId: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                    >
                      <option value="">Selecione...</option>
                      {agents?.filter(a => !newLeadData.instanceId || a.instanceId === newLeadData.instanceId).map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="secondary" onClick={() => setShowCreateForm(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createLeadMutation.mutate(newLeadData)} 
                  className="flex-1"
                  disabled={createLeadMutation.isPending || !newLeadData.phone}
                >
                  {createLeadMutation.isPending ? 'Criando...' : 'Criar Lead'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Follow-up */}
        {selectedLeadForFollowUp && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-3xl p-8 w-full max-w-md border border-gray-700 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="text-blue-400" /> Agendar Follow-up
                </h2>
                <button onClick={() => setSelectedLeadForFollowUp(null)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Tipo de Contato</label>
                  <select
                    value={followUpForm.type}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="REMINDER">Lembrete de Agendamento</option>
                    <option value="NO_RESPONSE">Follow-up por Falta de Retorno</option>
                    <option value="CUSTOM">Personalizado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Daqui a quantos dias?</label>
                  <input
                    type="number" min="1" max="30"
                    value={followUpForm.days}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, days: parseInt(e.target.value) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Instruções para a IA</label>
                  <textarea
                    value={followUpForm.notes}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                    placeholder="Ex: O cliente demonstrou interesse mas achou caro. Tente oferecer um desconto de 10% no retorno."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setSelectedLeadForFollowUp(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + followUpForm.days);
                    followUpMutation.mutate({
                      leadId: (selectedLeadForFollowUp as any).id,
                      type: followUpForm.type,
                      scheduledFor: date.toISOString(),
                      notes: followUpForm.notes,
                    });
                  }}
                  disabled={followUpMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-blue-500/20"
                >
                  {followUpMutation.isPending ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

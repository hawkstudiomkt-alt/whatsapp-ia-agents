import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, agentsApi } from '../lib/api';
import { Zap, Plus, Play, XCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner } from '../components/ui';

interface Discharge {
  id: string;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  phoneList: string[];
  message: string;
  delaySeconds: number;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  agent?: {
    name: string;
    instance?: { name: string };
  };
  useAI?: boolean;
  results?: { phone: string; status: string; deliveredAt: string }[];
}

export default function Discharges() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    agentId: '',
    name: '',
    phoneList: '',
    message: '',
    delaySeconds: 30,
    useAI: false,
  });

  const { data: discharges, isLoading } = useQuery({
    queryKey: ['discharges'],
    queryFn: () => api.get<Discharge[]>('/discharges').then(r => r.data),
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.findAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/discharges', {
        ...data,
        phoneList: data.phoneList.split('\n').filter(p => p.trim()),
      }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discharges'] });
      setShowForm(false);
      setFormData({ agentId: '', name: '', phoneList: '', message: '', delaySeconds: 30, useAI: false });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => api.post(`/discharges/${id}/start`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discharges'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/discharges/${id}/cancel`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discharges'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { color: 'neutral' as const, label: 'Pendente' },
      PROCESSING: { color: 'info' as const, label: 'Processando' },
      COMPLETED: { color: 'success' as const, label: 'Concluído' },
      FAILED: { color: 'danger' as const, label: 'Falhou' },
    };
    const configStatus = config[status as keyof typeof config];
    return <Badge variant={configStatus?.color}>{configStatus?.label}</Badge>;
  };

  const getProgress = (discharge: Discharge) => {
    const total = discharge.phoneList.length;
    const processed = discharge.totalSent + discharge.totalFailed;
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Disparos em Massa</h1>
          <p className="text-gray-400 mt-1">Envie mensagens em lote com delay anti-bloqueio</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-5 h-5" />
          Novo Disparo
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Novo Disparo</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Disparo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Ex: Promoção Black Friday"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Agente</label>
                <select
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                  required
                >
                  <option value="">Selecione...</option>
                  {agents?.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Telefones (um por linha)
                </label>
                <textarea
                  value={formData.phoneList}
                  onChange={(e) => setFormData({ ...formData, phoneList: e.target.value })}
                  rows={6}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 resize-none font-mono text-sm"
                  placeholder="5511999999999&#10;5511988888888&#10;5511977777777"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.phoneList.split('\n').filter(p => p.trim()).length} telefones
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Mensagem</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 resize-none"
                  placeholder="Olá! Temos uma oferta especial para você..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Delay entre mensagens (segundos)
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={formData.delaySeconds}
                  onChange={(e) => setFormData({ ...formData, delaySeconds: parseInt(e.target.value) })}
                  className="w-full accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10s</span>
                  <span className="text-yellow-500 font-medium">{formData.delaySeconds}s</span>
                  <span>300s</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Delay maior = menor risco de bloqueio do WhatsApp
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={formData.useAI}
                  onChange={(e) => setFormData({ ...formData, useAI: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0"
                />
                <label htmlFor="useAI" className="text-sm text-gray-300">
                  Usar Inteligência Artificial para personalizar cada mensagem (pode usar notas do lead)
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? <LoadingSpinner /> : 'Criar Disparo'}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          discharges?.map((discharge, index) => (
            <motion.div
              key={discharge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/20 rounded-2xl">
                      <Zap className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{discharge.name}</h3>
                      <p className="text-gray-400 text-sm">
                        Agente: {discharge.agent?.name} • {discharge.phoneList.length} destinatários
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(discharge.status)}
                </div>

                {/* Progress Bar */}
                {discharge.status === 'PROCESSING' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-400">Progresso</span>
                      <span className="text-white font-medium">{getProgress(discharge)}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${getProgress(discharge)}%` }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Enviadas
                    </div>
                    <p className="text-2xl font-bold text-white">{discharge.totalSent}</p>
                  </div>
                  <div className="p-3 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      Falharam
                    </div>
                    <p className="text-2xl font-bold text-white">{discharge.totalFailed}</p>
                  </div>
                  <div className="p-3 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Delay
                    </div>
                    <p className="text-2xl font-bold text-white">{discharge.delaySeconds}s</p>
                  </div>
                  <div className="p-3 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Status
                    </div>
                    <p className="text-lg font-bold text-white">{discharge.status}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 mb-4">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Mensagem Base</p>
                  <p className="text-sm text-gray-300">{discharge.message}</p>
                  {discharge.useAI && (
                    <div className="mt-2"><Badge variant="info">Personalização por IA Ativada</Badge></div>
                  )}
                </div>

                {discharge.results && discharge.results.length > 0 && (
                   <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Últimos Resultados</p>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                        {discharge.results.map((res, i) => (
                          <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-800/50 rounded border border-gray-700/50">
                            <span className="text-gray-300">{res.phone}</span>
                            <span className={res.status === 'SENT' ? 'text-green-400' : 'text-red-400'}>{res.status}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                )}

                <div className="flex items-center gap-3">
                  {discharge.status === 'PENDING' && (
                    <Button
                      onClick={() => startMutation.mutate(discharge.id)}
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Iniciar
                    </Button>
                  )}
                  {discharge.status === 'PROCESSING' && (
                    <Button
                      variant="danger"
                      onClick={() => cancelMutation.mutate(discharge.id)}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

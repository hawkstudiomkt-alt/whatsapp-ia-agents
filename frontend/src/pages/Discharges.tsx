import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dischargesApi, agentsApi, followupsApi, Discharge } from '../lib/api';
import {
  Zap, Plus, Play, XCircle, Clock, CheckCircle, AlertCircle,
  ChevronRight, ChevronLeft, Upload, Phone, MessageSquare,
  GitBranch, BarChart3, Trash2, X, Bot, Calendar, UserCheck,
  Sparkles, RefreshCw, Users, AlertTriangle,
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, PageTransition } from '../components/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Importar', 'Mensagem', 'Pós-Envio', 'Revisar'];

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:    { label: 'Aguardando',  color: 'text-gray-400 bg-gray-500/20 border-gray-500/30',     dot: 'bg-gray-400' },
  PROCESSING: { label: 'Em Disparo', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
  COMPLETED:  { label: 'Concluído',  color: 'text-green-400 bg-green-500/20 border-green-500/30',   dot: 'bg-green-400' },
  FAILED:     { label: 'Falhou',     color: 'text-red-400 bg-red-500/20 border-red-500/30',          dot: 'bg-red-400' },
};

/** Valida e normaliza lista de telefones */
function parsePhones(raw: string): { valid: string[]; invalid: string[] } {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const line of lines) {
    // Remove tudo que não for dígito
    const digits = line.replace(/\D/g, '');
    // Aceita: 10-15 dígitos (DDI opcional + DDD + número)
    if (digits.length >= 10 && digits.length <= 15) {
      valid.push(digits);
    } else {
      invalid.push(line);
    }
  }
  return { valid, invalid };
}

function estimateTime(phones: number, delay: number): string {
  const totalSeconds = phones * delay;
  if (totalSeconds < 60) return `~${totalSeconds}s`;
  if (totalSeconds < 3600) return `~${Math.ceil(totalSeconds / 60)} min`;
  return `~${(totalSeconds / 3600).toFixed(1)}h`;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Discharges() {
  const queryClient = useQueryClient();

  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);

  // Wizard state
  const [wizardData, setWizardData] = useState({
    // Step 1
    agentId: '',
    name: '',
    rawPhones: '',
    // Step 2
    message: '',
    useAI: false,
    aiIdeas: ['', '', ''], // até 3 variações
    delaySeconds: 30,
    // Step 3
    postSendAction: 'none' as 'none' | 'followup' | 'agent',
    followUpType: 'NO_RESPONSE',
    followUpDelay: 24,
    followUpNote: '',
    postSendAgentId: '',
  });

  const { valid: validPhones, invalid: invalidPhones } = parsePhones(wizardData.rawPhones);

  // Queries
  const { data: discharges, isLoading } = useQuery({
    queryKey: ['discharges'],
    queryFn: dischargesApi.findAll,
    refetchInterval: 5_000,
  });

  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: agentsApi.findAll });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      const ideas = wizardData.useAI
        ? wizardData.aiIdeas.map(i => i.trim()).filter(Boolean)
        : [];

      return dischargesApi.create({
        agentId: wizardData.agentId,
        name: wizardData.name,
        phoneList: validPhones,
        message: wizardData.message,
        delaySeconds: wizardData.delaySeconds,
        useAI: wizardData.useAI,
        aiIdeas: ideas.length > 0 ? JSON.stringify(ideas) : undefined,
        postSendConfig: wizardData.postSendAction !== 'none' ? {
          action: wizardData.postSendAction,
          followUpType: wizardData.followUpType,
          delayHours: wizardData.followUpDelay,
          followUpNote: wizardData.followUpNote || undefined,
          agentId: wizardData.postSendAction === 'agent' ? wizardData.postSendAgentId : undefined,
        } : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discharges'] });
      resetWizard();
    },
    onError: (e: any) => alert(e.response?.data?.error || 'Erro ao criar campanha'),
  });

  const startMutation = useMutation({
    mutationFn: dischargesApi.start,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discharges'] }),
    onError: () => alert('Erro ao iniciar disparo'),
  });

  const cancelMutation = useMutation({
    mutationFn: dischargesApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discharges'] }),
  });

  function resetWizard() {
    setShowWizard(false);
    setStep(0);
    setWizardData({
      agentId: '', name: '', rawPhones: '',
      message: '', useAI: false, aiIdeas: ['', '', ''], delaySeconds: 30,
      postSendAction: 'none', followUpType: 'NO_RESPONSE', followUpDelay: 24,
      followUpNote: '', postSendAgentId: '',
    });
  }

  function canAdvance() {
    if (step === 0) return wizardData.agentId && wizardData.name && validPhones.length > 0;
    if (step === 1) return wizardData.message.trim().length > 0;
    return true;
  }

  const getProgress = (d: Discharge) => {
    const total = d.phoneList.length;
    const done = d.totalSent + d.totalFailed;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  return (
    <PageTransition>
      <div className="space-y-6">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Disparos em Massa</h1>
            <p className="text-gray-400 mt-1 text-sm">Envie campanhas com variações de IA e delay anti-bloqueio</p>
          </div>
          <Button onClick={() => { setShowWizard(true); setStep(0); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Campanha
          </Button>
        </div>

        {/* ── Stats rápidas ─────────────────────────────────────── */}
        {discharges && discharges.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['PENDING','PROCESSING','COMPLETED','FAILED'] as const).map(s => (
              <div key={s} className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{STATUS_CONFIG[s].label}</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {discharges.filter(d => d.status === s).length}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Lista de Campanhas ─────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : !discharges || discharges.length === 0 ? (
          <Card className="p-16 text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">Nenhuma campanha criada ainda</p>
            <p className="text-gray-600 text-sm mt-1">Clique em "Nova Campanha" para começar</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {discharges.map((d, i) => {
              const progress = getProgress(d);
              const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.PENDING;

              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-5 hover:border-gray-600/60 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-3 bg-yellow-500/10 rounded-2xl shrink-0">
                          <Zap className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold truncate">{d.name}</h3>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {d.agent?.name} • {d.phoneList.length} números •
                            delay {d.delaySeconds}s • {estimateTime(d.phoneList.length, d.delaySeconds)}
                          </p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {(d.status === 'PROCESSING' || d.status === 'COMPLETED') && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>{d.totalSent} enviados · {d.totalFailed} falharam</span>
                          <span className={d.status === 'COMPLETED' ? 'text-green-400' : 'text-yellow-400'}>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-700/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={`h-full rounded-full ${d.status === 'COMPLETED' ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-yellow-500 to-orange-400'}`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Message preview */}
                    <div className="mt-3 p-3 bg-gray-900/50 rounded-xl border border-gray-700/30">
                      <p className="text-xs text-gray-600 mb-1 uppercase tracking-wider">Mensagem base</p>
                      <p className="text-sm text-gray-300 line-clamp-2">{d.message}</p>
                      {d.useAI && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3" /> IA personaliza cada mensagem
                        </span>
                      )}
                      {d.postSendConfig && (d.postSendConfig as any).action !== 'none' && (
                        <span className="inline-flex items-center gap-1 mt-2 ml-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                          <GitBranch className="w-3 h-3" /> Roteamento ativado
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/40">
                      {d.status === 'PENDING' && (
                        <Button onClick={() => startMutation.mutate(d.id)} disabled={startMutation.isPending} className="gap-1.5 text-sm py-1.5">
                          <Play className="w-3.5 h-3.5" /> Iniciar Disparo
                        </Button>
                      )}
                      {d.status === 'PROCESSING' && (
                        <Button variant="danger" onClick={() => cancelMutation.mutate(d.id)} disabled={cancelMutation.isPending} className="gap-1.5 text-sm py-1.5">
                          <XCircle className="w-3.5 h-3.5" /> Cancelar
                        </Button>
                      )}
                      <span className="text-xs text-gray-600 ml-auto self-center">
                        Criado {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Wizard Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-800 rounded-3xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Wizard header */}
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" /> Nova Campanha de Disparo
                  </h2>
                  <button onClick={resetWizard} className="text-gray-500 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Step indicators */}
                <div className="flex items-center gap-0">
                  {STEP_LABELS.map((label, i) => (
                    <div key={i} className="flex items-center flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          i < step ? 'bg-green-500 text-white' :
                          i === step ? 'bg-yellow-500 text-black' :
                          'bg-gray-700 text-gray-500'
                        }`}>
                          {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium ${i === step ? 'text-white' : 'text-gray-600'}`}>{label}</span>
                      </div>
                      {i < STEP_LABELS.length - 1 && (
                        <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-green-500/50' : 'bg-gray-700'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wizard content */}
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <WizardStep key="step0">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Nome da Campanha *</label>
                            <input
                              type="text"
                              placeholder="Ex: Black Friday 2026"
                              value={wizardData.name}
                              onChange={e => setWizardData({ ...wizardData, name: e.target.value })}
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Instância / Agente *</label>
                            <select
                              value={wizardData.agentId}
                              onChange={e => setWizardData({ ...wizardData, agentId: e.target.value })}
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500 outline-none"
                            >
                              <option value="">Selecione o agente...</option>
                              {agents?.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Lista de Telefones (um por linha)
                          </label>
                          <textarea
                            rows={8}
                            placeholder={"5511999999999\n5511988888888\n5521977777777"}
                            value={wizardData.rawPhones}
                            onChange={e => setWizardData({ ...wizardData, rawPhones: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-yellow-500 outline-none resize-none"
                          />

                          {/* Resultado da validação */}
                          {wizardData.rawPhones.trim() && (
                            <div className="flex gap-3 text-sm">
                              <span className="flex items-center gap-1.5 text-green-400">
                                <CheckCircle className="w-4 h-4" /> {validPhones.length} válidos
                              </span>
                              {invalidPhones.length > 0 && (
                                <span className="flex items-center gap-1.5 text-red-400">
                                  <AlertTriangle className="w-4 h-4" /> {invalidPhones.length} inválidos (serão ignorados)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </WizardStep>
                  )}

                  {step === 1 && (
                    <WizardStep key="step1">
                      <div className="space-y-5">
                        {/* Mensagem base */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Mensagem Base *</label>
                          <textarea
                            rows={4}
                            placeholder={"Oi {nome}! 👋 Temos uma novidade incrível pra você...\n\nUse {nome} para o nome, {primeiro_nome} para o primeiro nome."}
                            value={wizardData.message}
                            onChange={e => setWizardData({ ...wizardData, message: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500 outline-none resize-none"
                          />
                          <p className="text-xs text-gray-600">Variáveis: <code className="text-yellow-400">{'{nome}'}</code>, <code className="text-yellow-400">{'{primeiro_nome}'}</code>, <code className="text-yellow-400">{'{telefone}'}</code></p>
                        </div>

                        {/* Toggle IA */}
                        <div
                          onClick={() => setWizardData({ ...wizardData, useAI: !wizardData.useAI })}
                          className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                            wizardData.useAI
                              ? 'bg-purple-500/10 border-purple-500/30'
                              : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-600'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            wizardData.useAI ? 'bg-purple-500 border-purple-500' : 'border-gray-600'
                          }`}>
                            {wizardData.useAI && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-400" /> Ativar personalização por IA
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">A IA rotaciona entre variações e escolhe a mais diferente do histórico de cada lead — evita repetição e reduz risco de bloqueio.</p>
                          </div>
                        </div>

                        {/* Variações de mensagem */}
                        {wizardData.useAI && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                            <label className="text-sm font-medium text-gray-400">Variações de Mensagem (a IA escolhe para cada lead)</label>
                            {wizardData.aiIdeas.map((idea, idx) => (
                              <div key={idx} className="relative">
                                <textarea
                                  rows={2}
                                  placeholder={`Variação ${idx + 1}: Ex: "Oi {primeiro_nome}, que tal aproveitar nossa oferta de hoje?"`}
                                  value={idea}
                                  onChange={e => {
                                    const updated = [...wizardData.aiIdeas];
                                    updated[idx] = e.target.value;
                                    setWizardData({ ...wizardData, aiIdeas: updated });
                                  }}
                                  className="w-full bg-gray-900 border border-purple-500/20 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 outline-none resize-none"
                                />
                                <span className="absolute top-2 right-3 text-xs text-purple-400/60 font-medium">V{idx + 1}</span>
                              </div>
                            ))}
                            <p className="text-xs text-gray-600">
                              Preencha pelo menos 2 variações. Deixe em branco as que não usar.
                              A mensagem base também é incluída no pool de variações.
                            </p>
                          </motion.div>
                        )}

                        {/* Delay */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-400">Delay entre envios</label>
                            <span className="text-yellow-400 font-bold text-sm">{wizardData.delaySeconds}s ± 30%</span>
                          </div>
                          <input
                            type="range" min={5} max={120} step={5}
                            value={wizardData.delaySeconds}
                            onChange={e => setWizardData({ ...wizardData, delaySeconds: parseInt(e.target.value) })}
                            className="w-full accent-yellow-500"
                          />
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>5s (risco maior)</span>
                            <span className="text-gray-400">{validPhones.length > 0 && `Tempo total: ${estimateTime(validPhones.length, wizardData.delaySeconds)}`}</span>
                            <span>120s (mais seguro)</span>
                          </div>
                          <p className="text-xs text-gray-600">⚡ O delay real varia ±30% automaticamente para simular comportamento humano.</p>
                        </div>
                      </div>
                    </WizardStep>
                  )}

                  {step === 2 && (
                    <WizardStep key="step2">
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-white font-semibold mb-1">O que acontece após o envio?</h3>
                          <p className="text-gray-500 text-sm">Configure o que fazer com cada lead depois que receber a mensagem.</p>
                        </div>

                        {/* Opções */}
                        {([
                          {
                            value: 'none',
                            icon: <MessageSquare className="w-5 h-5 text-gray-400" />,
                            title: 'Nada (só enviar)',
                            desc: 'O agente IA aguarda a resposta naturalmente.',
                          },
                          {
                            value: 'followup',
                            icon: <Calendar className="w-5 h-5 text-blue-400" />,
                            title: 'Adicionar ao Follow-up',
                            desc: 'Cria um follow-up automático para cada lead que receber o disparo.',
                          },
                          {
                            value: 'agent',
                            icon: <Bot className="w-5 h-5 text-green-400" />,
                            title: 'Designar para um Agente',
                            desc: 'Atribui um agente específico para continuar o atendimento de cada lead.',
                          },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setWizardData({ ...wizardData, postSendAction: opt.value })}
                            className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all ${
                              wizardData.postSendAction === opt.value
                                ? 'bg-blue-500/10 border-blue-500/30'
                                : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-600'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">{opt.icon}</div>
                            <div>
                              <p className="text-white text-sm font-medium">{opt.title}</p>
                              <p className="text-gray-500 text-xs mt-0.5">{opt.desc}</p>
                            </div>
                            <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-all ${
                              wizardData.postSendAction === opt.value
                                ? 'border-blue-400 bg-blue-400'
                                : 'border-gray-600'
                            }`} />
                          </button>
                        ))}

                        {/* Config: follow-up */}
                        {wizardData.postSendAction === 'followup' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs text-gray-400">Tipo de Follow-up</label>
                                <select
                                  value={wizardData.followUpType}
                                  onChange={e => setWizardData({ ...wizardData, followUpType: e.target.value })}
                                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                                >
                                  <option value="REMINDER">Lembrete</option>
                                  <option value="NO_RESPONSE">Sem Resposta</option>
                                  <option value="CUSTOM">Personalizado</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-400">Daqui a (horas)</label>
                                <input
                                  type="number" min={1} max={720}
                                  value={wizardData.followUpDelay}
                                  onChange={e => setWizardData({ ...wizardData, followUpDelay: parseInt(e.target.value) || 24 })}
                                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Instrução para a IA no Follow-up</label>
                              <textarea
                                rows={2}
                                placeholder="Ex: O lead recebeu nossa promoção de lançamento. No retorno, pergunte se viu e ofereça desconto exclusivo."
                                value={wizardData.followUpNote}
                                onChange={e => setWizardData({ ...wizardData, followUpNote: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none resize-none"
                              />
                            </div>
                          </motion.div>
                        )}

                        {/* Config: agent */}
                        {wizardData.postSendAction === 'agent' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-4 border-l-2 border-green-500/30">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Agente Responsável pelo Atendimento</label>
                              <select
                                value={wizardData.postSendAgentId}
                                onChange={e => setWizardData({ ...wizardData, postSendAgentId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-green-500 outline-none"
                              >
                                <option value="">Selecione o agente...</option>
                                {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </WizardStep>
                  )}

                  {step === 3 && (
                    <WizardStep key="step3">
                      <div className="space-y-4">
                        <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                          <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                            <BarChart3 className="w-4 h-4 text-yellow-400" /> Resumo da Campanha
                          </h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-gray-500">Campanha</p><p className="text-white font-medium">{wizardData.name}</p></div>
                            <div><p className="text-gray-500">Agente</p><p className="text-white font-medium">{agents?.find(a => a.id === wizardData.agentId)?.name || '—'}</p></div>
                            <div><p className="text-gray-500">Destinatários</p><p className="text-green-400 font-bold">{validPhones.length} números válidos</p></div>
                            <div><p className="text-gray-500">Tempo estimado</p><p className="text-yellow-400 font-medium">{estimateTime(validPhones.length, wizardData.delaySeconds)}</p></div>
                            <div><p className="text-gray-500">Delay</p><p className="text-white">{wizardData.delaySeconds}s ± 30%</p></div>
                            <div>
                              <p className="text-gray-500">IA</p>
                              <p className="text-white">{wizardData.useAI ? `${wizardData.aiIdeas.filter(i => i.trim()).length + 1} variações` : 'Desativada'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Message preview */}
                        <div className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-xl">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview da Mensagem</p>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{wizardData.message.replace('{nome}', 'João Silva').replace('{primeiro_nome}', 'João').replace('{telefone}', '11999999999')}</p>
                        </div>

                        {/* Post-send summary */}
                        {wizardData.postSendAction !== 'none' && (
                          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm">
                            <p className="text-blue-400 font-medium flex items-center gap-1.5">
                              <GitBranch className="w-4 h-4" /> Após o envio:
                              {wizardData.postSendAction === 'followup' ? ` follow-up ${wizardData.followUpType} em ${wizardData.followUpDelay}h` : ` designar para ${agents?.find(a => a.id === wizardData.postSendAgentId)?.name || 'agente selecionado'}`}
                            </p>
                          </div>
                        )}

                        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                          <p className="text-xs text-orange-400/80">
                            ⚠️ Ao confirmar, a campanha ficará com status <strong>Pendente</strong>. Você precisará clicar em "Iniciar Disparo" para começar o envio. Isso dá tempo de revisar antes de disparar.
                          </p>
                        </div>
                      </div>
                    </WizardStep>
                  )}
                </AnimatePresence>
              </div>

              {/* Wizard footer */}
              <div className="p-6 pt-0 flex gap-3 border-t border-gray-700/50 mt-2">
                {step > 0 ? (
                  <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="gap-2">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={resetWizard}>Cancelar</Button>
                )}
                <Button
                  onClick={() => {
                    if (step < 3) {
                      setStep(s => s + 1);
                    } else {
                      createMutation.mutate();
                    }
                  }}
                  disabled={!canAdvance() || createMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {step < 3 ? (
                    <>Próximo <ChevronRight className="w-4 h-4" /></>
                  ) : createMutation.isPending ? (
                    'Criando...'
                  ) : (
                    <>✅ Criar Campanha</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

// ─── Componente auxiliar de step ─────────────────────────────────────────────

function WizardStep({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

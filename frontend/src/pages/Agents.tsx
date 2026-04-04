import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, instancesApi, Agent } from '../lib/api';
import {
  Plus, Trash2, Edit, Bot, Sparkles, MessageSquare, Mic, Shield,
  Stethoscope, ShoppingCart, Home, UtensilsCrossed, Headphones,
  GraduationCap, Wand2, BookOpen, ChevronLeft, Save, Star, Thermometer,
  History, X, Pause, Play, Ticket, Activity,
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner } from '../components/ui';

// ─── AI Models (Claude via Anthropic API) ────────────────────────────────────
const AI_MODELS = [
  { group: 'Econômico — Recomendado', models: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku', provider: 'Anthropic', note: 'Rápido · Baixo custo' },
  ]},
  { group: 'Balanceado', models: [
    { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet', provider: 'Anthropic', note: 'Melhor qualidade' },
  ]},
  { group: 'Máxima Capacidade', models: [
    { value: 'claude-opus-4-6',           label: 'Claude Opus',   provider: 'Anthropic', note: 'Mais poderoso · Alto custo' },
  ]},
];

// ─── Templates ────────────────────────────────────────────────────────────────
const PRESET_TEMPLATES = [
  {
    id: 'clinica', icon: Stethoscope, name: 'Clínica / Saúde',
    description: 'Atendimento de pacientes, agendamentos e dúvidas médicas',
    defaults: {
      name: 'Sofia — Atendente da Clínica', tone: 'empathetic', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.6, historyLimit: 15,
      systemPrompt: `# Identidade\nVocê é **Sofia**, assistente virtual de uma clínica de saúde. Empática, profissional e acolhedora.\n\n# Missão\n- Agendamento, cancelamento e confirmação de consultas\n- Informações sobre especialidades e médicos disponíveis\n- Orientações sobre preparo para exames\n\n# Regras Obrigatórias\n- NUNCA faça diagnósticos médicos ou prescreva medicamentos\n- Em emergências, instrua a ligar 192 (SAMU)`,
      instructions: `1. Cumprimente o paciente com gentileza\n2. Identifique o que ele precisa\n3. Para agendamentos: pergunte especialidade e disponibilidade\n4. Confirme todas as informações antes de finalizar`,
      guardrails: `Não faça diagnósticos. Não prescreva medicamentos. Em emergências, sempre redirecione para o SAMU (192).`,
    },
  },
  {
    id: 'ecommerce', icon: ShoppingCart, name: 'E-commerce / Vendas',
    description: 'Assistente de vendas, catálogo, pedidos e suporte pós-venda',
    defaults: {
      name: 'Alex — Assistente de Vendas', tone: 'enthusiastic', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.8, historyLimit: 10,
      systemPrompt: `# Identidade\nVocê é **Alex**, assistente de vendas especializado. Entusiasta e focado em ajudar o cliente a encontrar a melhor solução.\n\n# Missão\n- Apresentar produtos, características e benefícios\n- Auxiliar o cliente na escolha do produto ideal\n- Acompanhar pedidos e prazos de entrega`,
      instructions: `1. Cumprimente e entenda o que o cliente procura\n2. Apresente as opções mais relevantes com benefícios claros\n3. Responda dúvidas sobre produto, prazo e pagamento\n4. Finalize com estimativa de entrega`,
      guardrails: `Não prometa descontos além da política da empresa. Não confirme pedidos sem verificar estoque.`,
    },
  },
  {
    id: 'imobiliaria', icon: Home, name: 'Imobiliária',
    description: 'Consultor imobiliário: imóveis, visitas e financiamento',
    defaults: {
      name: 'Carlos — Consultor Imobiliário', tone: 'professional', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.7, historyLimit: 12,
      systemPrompt: `# Identidade\nVocê é **Carlos**, consultor imobiliário virtual. Profissional e confiável.\n\n# Missão\n- Apresentar imóveis para venda e locação\n- Qualificar necessidades e perfil financeiro do cliente\n- Agendar visitas e orientar sobre financiamento`,
      instructions: `1. Cumprimente e descubra o objetivo do cliente\n2. Qualifique: tipo, localização, orçamento, prazo\n3. Apresente as opções mais adequadas\n4. Ofereça agendamento de visita`,
      guardrails: `Não forneça avaliações jurídicas. Não confirme disponibilidade sem verificar.`,
    },
  },
  {
    id: 'restaurante', icon: UtensilsCrossed, name: 'Restaurante / Delivery',
    description: 'Pedidos, cardápio, delivery e reservas de mesa',
    defaults: {
      name: 'Mari — Atendente do Restaurante', tone: 'friendly', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.8, historyLimit: 8,
      systemPrompt: `# Identidade\nVocê é **Mari**, atendente virtual do restaurante. Simpática, ágil e apaixonada pela boa comida.\n\n# Missão\n- Apresentar o cardápio, pratos especiais e combinações\n- Registrar pedidos para delivery, retirada ou reserva de mesa\n- Informar sobre tempo de entrega e área de cobertura`,
      instructions: `1. Cumprimente com entusiasmo\n2. Identifique o tipo: delivery, retirada ou reserva\n3. Apresente o cardápio e destaques do dia\n4. Registre o pedido com todos os detalhes\n5. Confirme valor, tempo e método de pagamento`,
      guardrails: `Não confirme pedidos fora da área de entrega. Não prometa descontos não autorizados.`,
    },
  },
  {
    id: 'suporte', icon: Headphones, name: 'Suporte Técnico',
    description: 'Help desk, troubleshooting e abertura de tickets',
    defaults: {
      name: 'Max — Especialista de Suporte', tone: 'calm', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.5, historyLimit: 15,
      systemPrompt: `# Identidade\nVocê é **Max**, especialista de suporte técnico. Paciente, preciso e focado em resolver problemas.\n\n# Missão\n- Diagnosticar e resolver problemas técnicos com clareza\n- Guiar o usuário passo a passo\n- Abrir tickets quando necessário`,
      instructions: `1. Cumprimente e peça para descrever o problema\n2. Colete: dispositivo, sistema, quando começou\n3. Tente a solução mais simples primeiro\n4. Guie passo a passo, aguardando confirmação a cada etapa`,
      guardrails: `Não acesse remotamente nenhum dispositivo. Não solicite senhas.`,
    },
  },
  {
    id: 'educacao', icon: GraduationCap, name: 'Educação / Cursos',
    description: 'Orientação acadêmica, matrículas e dúvidas sobre cursos',
    defaults: {
      name: 'Ana — Assistente Acadêmica', tone: 'friendly', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.7, historyLimit: 10,
      systemPrompt: `# Identidade\nVocê é **Ana**, assistente acadêmica virtual. Motivadora, organizada e dedicada ao sucesso dos alunos.\n\n# Missão\n- Informar sobre cursos, grades curriculares e cronogramas\n- Auxiliar no processo de matrícula\n- Orientar sobre bolsas e formas de pagamento`,
      instructions: `1. Identifique se é novo interessado ou aluno atual\n2. Para novos: apresente cursos e diferenciais\n3. Para alunos: personalize a resposta ao histórico\n4. Sempre informe os próximos passos claramente`,
      guardrails: `Não confirme aprovação/reprovação sem dados oficiais. Não prometa bolsas sem confirmação.`,
    },
  },
  {
    id: 'evento', icon: Ticket, name: 'Eventos / Ingressos',
    description: 'SDR para venda de ingressos e captação para eventos',
    defaults: {
      name: 'Ana Clara — SDR de Eventos', tone: 'enthusiastic', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.82, historyLimit: 10,
      systemPrompt: `# Identidade\nVocê é **Ana Clara**, atendente calorosa e entusiasmada da organização do evento. Sua abordagem é acolhimento genuíno + entusiasmo pelo evento. Nunca use pressão.\n\n# Estilo\nFrases curtas, linguagem simples, tom leve e natural — como alguém digitando rápido no WhatsApp.`,
      instructions: `1. Cumprimente com energia e identifique o interesse\n2. Apresente o evento de forma empolgante\n3. Identifique se vai sozinho ou quer trazer alguém\n4. Ofereça o link de compra de forma natural\n5. Encerre com entusiasmo e convite caloroso`,
      guardrails: `Não pressione o lead. Não invente informações sobre o evento. Não prometa reembolso sem verificar política.`,
    },
  },
  {
    id: 'custom', icon: Wand2, name: 'Personalizado',
    description: 'Comece do zero e crie seu agente único',
    defaults: {
      name: '', tone: 'friendly', language: 'pt-BR',
      aiModel: 'claude-haiku-4-5-20251001', temperature: 0.7, historyLimit: 10,
      systemPrompt: '', instructions: '', guardrails: '',
    },
  },
];

const EMPTY_FORM = {
  name: '', instructions: '', systemPrompt: '', instanceId: '',
  tone: 'friendly', language: 'pt-BR', humanInterventionEnabled: true,
  aiModel: 'claude-haiku-4-5-20251001', guardrails: '',
  transcriptionEnabled: false, transcriptionModel: 'google/gemini-flash-1.5',
  temperature: 0.7, historyLimit: 10,
};

const TONE_OPTIONS = [
  { value: 'friendly',     label: 'Amigável',    emoji: '😊' },
  { value: 'professional', label: 'Profissional', emoji: '👔' },
  { value: 'casual',       label: 'Descontraído', emoji: '😎' },
  { value: 'empathetic',   label: 'Empático',     emoji: '💙' },
  { value: 'enthusiastic', label: 'Entusiasta',   emoji: '🌟' },
  { value: 'calm',         label: 'Calmo',        emoji: '🧘' },
];

const LANG_OPTIONS = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
];

const inputCls = `
  w-full bg-[#060606] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[#f0f0f0]
  outline-none transition-colors font-[Space_Grotesk,sans-serif]
  focus:border-[rgba(182,255,0,0.4)]
`;

export default function Agents() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]         = useState(false);
  const [step, setStep]                 = useState<'template' | 'form'>('template');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData]         = useState({ ...EMPTY_FORM });
  const [savingTemplate, setSavingTemplate]   = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState('');

  const [customTemplates, setCustomTemplates] = useState<typeof PRESET_TEMPLATES>(() => {
    try { return JSON.parse(localStorage.getItem('agentCustomTemplates') || '[]'); }
    catch { return []; }
  });

  const { data: agents, isLoading } = useQuery({ queryKey: ['agents'], queryFn: agentsApi.findAll });
  const { data: instances }         = useQuery({ queryKey: ['instances'], queryFn: instancesApi.findAll });

  const createMutation = useMutation({
    mutationFn: agentsApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents'] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) => agentsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents'] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: agentsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => agentsApi.toggleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const closeForm = () => {
    setShowForm(false); setEditingAgent(null); setStep('template');
    setFormData({ ...EMPTY_FORM }); setSavingTemplate(false); setSavedTemplateName('');
  };

  const handleSelectTemplate = (t: typeof PRESET_TEMPLATES[0]) => {
    setFormData(prev => ({ ...prev, ...t.defaults }));
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgent) updateMutation.mutate({ id: editingAgent.id, data: formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name, instructions: agent.instructions, systemPrompt: agent.systemPrompt,
      instanceId: agent.instanceId, tone: agent.tone || 'friendly', language: agent.language || 'pt-BR',
      humanInterventionEnabled: (agent as any).humanInterventionEnabled ?? true,
      aiModel: agent.aiModel || 'claude-haiku-4-5-20251001', guardrails: (agent as any).guardrails || '',
      transcriptionEnabled: agent.transcriptionEnabled ?? false,
      transcriptionModel: agent.transcriptionModel || 'google/gemini-flash-1.5',
      temperature: (agent as any).temperature ?? 0.7, historyLimit: (agent as any).historyLimit ?? 10,
    });
    setStep('form'); setShowForm(true);
  };

  const handleSaveCustomTemplate = () => {
    if (!savedTemplateName.trim()) return;
    const newTemplate = {
      id: `custom_${Date.now()}`, icon: BookOpen, name: savedTemplateName,
      description: 'Template personalizado',
      defaults: {
        name: formData.name, tone: formData.tone, language: formData.language,
        aiModel: formData.aiModel, temperature: formData.temperature,
        historyLimit: formData.historyLimit, systemPrompt: formData.systemPrompt,
        instructions: formData.instructions, guardrails: formData.guardrails,
      },
    };
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    localStorage.setItem('agentCustomTemplates', JSON.stringify(updated));
    setSavingTemplate(false); setSavedTemplateName('');
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('agentCustomTemplates', JSON.stringify(updated));
  };

  const allTemplates = [...customTemplates, ...PRESET_TEMPLATES];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}>
            Agentes
          </h1>
          <p className="text-sm mt-1 font-mono-rattix" style={{ color: '#555' }}>
            Configure o cérebro da sua operação
          </p>
        </div>
        <Button onClick={() => { setFormData({ ...EMPTY_FORM }); setEditingAgent(null); setStep('template'); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Novo Agente
        </Button>
      </div>

      {/* Status chips */}
      {agents && agents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Activity className="w-3.5 h-3.5" style={{ color: '#555' }} />
            <span className="text-xs font-mono-rattix" style={{ color: '#555' }}>{agents.length} agente{agents.length !== 1 ? 's' : ''}</span>
          </div>
          {[
            { s: 'ACTIVE',  color: '#B6FF00', label: 'Ativo' },
            { s: 'PAUSED',  color: '#f59e0b', label: 'Pausado' },
            { s: 'STOPPED', color: '#ef4444', label: 'Parado' },
          ].map(({ s, color, label }) => {
            const count = agents.filter(a => a.status === s).length;
            if (!count) return null;
            return (
              <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
                <span className="text-xs font-mono-rattix font-bold" style={{ color }}>{count} {label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Agent List ── */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
        ) : !agents?.length ? (
          <Card className="p-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(125,83,255,0.08)', border: '1px solid rgba(125,83,255,0.15)' }}>
              <Bot className="w-7 h-7" style={{ color: '#7D53FF' }} />
            </div>
            <p className="text-sm font-mono-rattix" style={{ color: '#444' }}>Nenhum agente criado</p>
          </Card>
        ) : (
          agents.map((agent, index) => (
            <motion.div key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <Card className="p-6" style={{ borderLeft: agent.status === 'ACTIVE' ? '2px solid #B6FF00' : '2px solid rgba(255,255,255,0.06)' } as any}>
                <div className="flex items-start gap-4 justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Bot icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(125,83,255,0.1)', border: '1px solid rgba(125,83,255,0.2)' }}>
                      <Bot className="w-6 h-6" style={{ color: '#7D53FF' }} />
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base" style={{ color: '#f0f0f0' }}>{agent.name}</span>
                        <Badge variant={agent.status === 'ACTIVE' ? 'success' : agent.status === 'PAUSED' ? 'warning' : 'danger'}>
                          {agent.status === 'ACTIVE' ? 'Ativo' : agent.status === 'PAUSED' ? 'Pausado' : 'Parado'}
                        </Badge>
                      </div>
                      <p className="text-xs mt-1 font-mono-rattix" style={{ color: '#555' }}>
                        {agent.instance?.name || 'Sem instância'} · {AI_MODELS.flatMap(g => g.models).find(m => m.value === agent.aiModel)?.label || agent.aiModel || 'Claude Haiku'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="purple">{TONE_OPTIONS.find(t => t.value === agent.tone)?.emoji || '😊'} {agent.tone}</Badge>
                        <Badge variant="neutral">{agent.language}</Badge>
                        {(agent as any).temperature !== undefined && <Badge variant="neutral">🌡 {(agent as any).temperature?.toFixed(1)}</Badge>}
                        {(agent as any).historyLimit !== undefined && <Badge variant="neutral">📚 {(agent as any).historyLimit} msg</Badge>}
                        {agent.transcriptionEnabled && <Badge variant="lime"><Mic className="w-2.5 h-2.5 inline mr-1" />Áudio</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleStatusMutation.mutate({ id: agent.id, status: agent.status })}
                      disabled={toggleStatusMutation.isPending}
                      style={agent.status === 'ACTIVE'
                        ? { borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b' }
                        : { borderColor: 'rgba(182,255,0,0.3)', color: '#B6FF00' }
                      }
                    >
                      {agent.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(agent)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => { if (confirm('Excluir agente?')) deleteMutation.mutate(agent.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Prompt preview */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { label: 'Fluxo de Trabalho', text: agent.instructions, color: 'rgba(182,255,0,0.04)', border: 'rgba(182,255,0,0.08)' },
                    { label: 'System Prompt',     text: agent.systemPrompt,  color: 'rgba(125,83,255,0.04)', border: 'rgba(125,83,255,0.08)' },
                  ].map(sec => (
                    <div key={sec.label} className="px-4 py-3 rounded-xl" style={{ background: sec.color, border: `1px solid ${sec.border}` }}>
                      <p className="text-[10px] font-mono-rattix mb-1.5" style={{ color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>{sec.label}</p>
                      <p className="text-xs font-mono-rattix line-clamp-3" style={{ color: '#888', lineHeight: '1.6' }}>{sec.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl"
              style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
            >

              {/* ── Step 1: Template ── */}
              {step === 'template' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(125,83,255,0.1)', border: '1px solid rgba(125,83,255,0.2)' }}>
                        <Sparkles className="w-5 h-5" style={{ color: '#7D53FF' }} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold" style={{ color: '#f0f0f0' }}>Escolha um Modelo</h2>
                        <p className="text-xs font-mono-rattix" style={{ color: '#555' }}>Comece com um template ou crie do zero</p>
                      </div>
                    </div>
                    <button onClick={closeForm} style={{ color: '#555' }}><X className="w-5 h-5" /></button>
                  </div>

                  {customTemplates.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[10px] font-mono-rattix mb-3" style={{ color: '#7D53FF', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        ⭐ Meus Templates
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                        {customTemplates.map(t => {
                          const Icon = t.icon;
                          return (
                            <div key={t.id} className="relative group">
                              <button
                                onClick={() => handleSelectTemplate(t)}
                                className="w-full p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
                                style={{ background: 'rgba(125,83,255,0.06)', border: '1px solid rgba(125,83,255,0.15)' }}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(125,83,255,0.15)' }}>
                                  <Icon className="w-4 h-4" style={{ color: '#7D53FF' }} />
                                </div>
                                <p className="font-semibold text-sm" style={{ color: '#f0f0f0' }}>{t.name}</p>
                                <p className="text-xs mt-1 line-clamp-2" style={{ color: '#555' }}>{t.description}</p>
                              </button>
                              <button
                                onClick={() => handleDeleteCustomTemplate(t.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} className="mb-5" />
                    </div>
                  )}

                  <p className="text-[10px] font-mono-rattix mb-4" style={{ color: '#444', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    Templates por Segmento
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {PRESET_TEMPLATES.map(t => {
                      const Icon = t.icon;
                      const isCustom = t.id === 'custom';
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleSelectTemplate(t)}
                          className="p-4 rounded-2xl text-left transition-all hover:scale-[1.02] group"
                          style={{
                            background: isCustom ? 'rgba(255,255,255,0.02)' : 'rgba(182,255,0,0.03)',
                            border: isCustom ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(182,255,0,0.1)',
                          }}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                            style={{ background: isCustom ? 'rgba(255,255,255,0.05)' : 'rgba(182,255,0,0.08)' }}>
                            <Icon className="w-5 h-5" style={{ color: isCustom ? '#555' : '#B6FF00' }} />
                          </div>
                          <p className="font-bold text-sm leading-tight" style={{ color: '#f0f0f0' }}>{t.name}</p>
                          <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#555' }}>{t.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 2: Form ── */}
              {step === 'form' && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    {!editingAgent && (
                      <button onClick={() => setStep('template')} className="p-2 rounded-xl transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: '#888' }}>
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(125,83,255,0.1)', border: '1px solid rgba(125,83,255,0.2)' }}>
                      <Sparkles className="w-5 h-5" style={{ color: '#7D53FF' }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: '#f0f0f0' }}>
                        {editingAgent ? 'Editar Agente' : 'Configurar Agente'}
                      </h2>
                    </div>
                    <button onClick={closeForm} className="ml-auto" style={{ color: '#555' }}><X className="w-5 h-5" /></button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name + Instance */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Nome do Agente</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Sofia — Atendente da Clínica" required className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Instância</label>
                        <select value={formData.instanceId} onChange={e => setFormData({ ...formData, instanceId: e.target.value })} required className={inputCls} style={{ cursor: 'pointer' }}>
                          <option value="">Selecione uma instância...</option>
                          {instances?.map(inst => <option key={inst.id} value={inst.id} style={{ background: '#141414' }}>{inst.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Tone + Language */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Tom de Voz</label>
                        <div className="grid grid-cols-6 gap-2">
                          {TONE_OPTIONS.map(tone => (
                            <button key={tone.value} type="button" onClick={() => setFormData({ ...formData, tone: tone.value })}
                              className="p-2.5 rounded-xl text-xs flex flex-col items-center gap-1 transition-all"
                              style={formData.tone === tone.value
                                ? { background: 'rgba(125,83,255,0.15)', border: '1px solid rgba(125,83,255,0.4)', color: '#7D53FF' }
                                : { background: '#060606', border: '1px solid rgba(255,255,255,0.06)', color: '#555' }
                              }
                            >
                              <span className="text-lg">{tone.emoji}</span>
                              <span className="text-[10px]">{tone.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Idioma</label>
                        <select value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })} className={inputCls}>
                          {LANG_OPTIONS.map(l => <option key={l.value} value={l.value} style={{ background: '#141414' }}>{l.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* AI Config box */}
                    <div className="space-y-4 p-5 rounded-2xl" style={{ background: 'rgba(125,83,255,0.04)', border: '1px solid rgba(125,83,255,0.1)' }}>
                      <p className="text-[10px] font-mono-rattix flex items-center gap-2" style={{ color: '#7D53FF', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        <Bot className="w-3.5 h-3.5" /> Configurações de IA
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Modelo de IA</label>
                          <select value={formData.aiModel} onChange={e => setFormData({ ...formData, aiModel: e.target.value })} className={`${inputCls} font-mono-rattix`}>
                            {AI_MODELS.map(group => (
                              <optgroup key={group.group} label={group.group}>
                                {group.models.map(m => <option key={m.value} value={m.value} style={{ background: '#141414' }}>{m.label} — {(m as any).note || m.provider}</option>)}
                              </optgroup>
                            ))}
                          </select>
                          <p className="text-[10px] mt-1 font-mono-rattix" style={{ color: '#444' }}>
                            {AI_MODELS.flatMap(g => g.models).find(m => m.value === formData.aiModel)?.note || formData.aiModel}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Transcrição de Áudio</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, transcriptionEnabled: !formData.transcriptionEnabled })}
                              className="p-2.5 rounded-xl transition-all shrink-0"
                              style={formData.transcriptionEnabled
                                ? { background: 'rgba(182,255,0,0.1)', border: '1px solid rgba(182,255,0,0.3)', color: '#B6FF00' }
                                : { background: '#060606', border: '1px solid rgba(255,255,255,0.06)', color: '#555' }
                              }
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                            <select disabled={!formData.transcriptionEnabled} value={formData.transcriptionModel} onChange={e => setFormData({ ...formData, transcriptionModel: e.target.value })} className={`${inputCls} flex-1 disabled:opacity-40`}>
                              <option value="google/gemini-flash-1.5" style={{ background: '#141414' }}>Gemini 1.5 Flash</option>
                              <option value="openai/gpt-4o-mini" style={{ background: '#141414' }}>GPT-4o Mini</option>
                              <option value="meta-llama/llama-3.1-8b-instruct" style={{ background: '#141414' }}>Llama 3.1 8B</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Temp + History */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center justify-between text-xs mb-2 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" style={{ color: '#f59e0b' }} /> Temperatura</span>
                            <span className="font-bold" style={{ color: '#f59e0b' }}>{formData.temperature.toFixed(1)}</span>
                          </label>
                          <input type="range" min={0} max={2} step={0.1} value={formData.temperature} onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })} className="w-full accent-[#B6FF00]" />
                          <div className="flex justify-between text-[10px] mt-1 font-mono-rattix" style={{ color: '#444' }}>
                            <span>Preciso</span><span>Balanceado</span><span>Criativo</span>
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center justify-between text-xs mb-2 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span className="flex items-center gap-1"><History className="w-3 h-3" style={{ color: '#7D53FF' }} /> Memória</span>
                            <span className="font-bold" style={{ color: '#7D53FF' }}>{formData.historyLimit} msg</span>
                          </label>
                          <input type="range" min={1} max={50} step={1} value={formData.historyLimit} onChange={e => setFormData({ ...formData, historyLimit: parseInt(e.target.value) })} className="w-full accent-[#7D53FF]" />
                          <div className="flex justify-between text-[10px] mt-1 font-mono-rattix" style={{ color: '#444' }}>
                            <span>1</span><span>Recomendado (10)</span><span>50</span>
                          </div>
                        </div>
                      </div>

                      {/* Guardrails */}
                      <div>
                        <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          <Shield className="w-3 h-3 inline mr-1" style={{ color: '#ef4444' }} />
                          Guardrails (Restrições)
                        </label>
                        <textarea
                          value={formData.guardrails}
                          onChange={e => setFormData({ ...formData, guardrails: e.target.value })}
                          rows={3}
                          placeholder="Ex: Nunca fale sobre concorrentes. Não dê descontos acima de 10%."
                          className={`${inputCls} resize-none`}
                          style={{ borderColor: 'rgba(239,68,68,0.15)' }}
                        />
                      </div>
                    </div>

                    {/* Prompts */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1 text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          <MessageSquare className="w-3 h-3" /> System Prompt
                          <span className="ml-auto text-[10px] normal-case" style={{ color: '#444' }}>suporta markdown</span>
                        </label>
                        <textarea
                          value={formData.systemPrompt}
                          onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                          rows={10}
                          placeholder="# Identidade&#10;Você é Sofia, assistente..."
                          required
                          className={`${inputCls} resize-none font-mono-rattix text-xs`}
                          style={{ lineHeight: '1.6' }}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          <Sparkles className="w-3 h-3" /> Fluxo de Trabalho
                        </label>
                        <textarea
                          value={formData.instructions}
                          onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                          rows={10}
                          placeholder="1. Cumprimente o usuário&#10;2. Identifique a necessidade..."
                          required
                          className={`${inputCls} resize-none font-mono-rattix text-xs`}
                          style={{ lineHeight: '1.6' }}
                        />
                      </div>
                    </div>

                    {/* Save as template */}
                    {savingTemplate ? (
                      <div className="flex gap-3 p-4 rounded-2xl" style={{ background: 'rgba(125,83,255,0.06)', border: '1px solid rgba(125,83,255,0.15)' }}>
                        <input
                          type="text"
                          value={savedTemplateName}
                          onChange={e => setSavedTemplateName(e.target.value)}
                          placeholder="Nome do template..."
                          className={inputCls}
                          autoFocus
                        />
                        <Button type="button" size="sm" onClick={handleSaveCustomTemplate}><Save className="w-3.5 h-3.5" /> Salvar</Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setSavingTemplate(false)}>Cancelar</Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setSavingTemplate(true)} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: '#7D53FF' }}>
                        <Star className="w-3.5 h-3.5" /> Salvar como template
                      </button>
                    )}

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">Cancelar</Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1">
                        {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Agente'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

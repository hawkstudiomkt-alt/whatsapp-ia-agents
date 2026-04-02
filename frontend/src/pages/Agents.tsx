import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, instancesApi, Agent } from '../lib/api';
import {
  Plus, Trash2, Edit, Bot, Sparkles, MessageSquare, Mic, Shield,
  Stethoscope, ShoppingCart, Home, UtensilsCrossed, Headphones,
  GraduationCap, Wand2, BookOpen, ChevronLeft, Save, Star, Thermometer,
  History, X
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, PageTransition } from '../components/ui';

// ─── Modelos de IA agrupados ─────────────────────────────────────────────────
const AI_MODELS = [
  { group: 'Rápidos e Econômicos', models: [
    { value: 'openai/gpt-4o-mini',                label: 'GPT-4o Mini',          provider: 'OpenAI' },
    { value: 'google/gemini-flash-1.5',           label: 'Gemini 1.5 Flash',     provider: 'Google' },
    { value: 'meta-llama/llama-3.1-8b-instruct',  label: 'Llama 3.1 8B',         provider: 'Meta' },
    { value: 'mistralai/mistral-7b-instruct',     label: 'Mistral 7B',           provider: 'Mistral' },
  ]},
  { group: 'Alta Qualidade', models: [
    { value: 'openai/gpt-4o',                     label: 'GPT-4o',               provider: 'OpenAI' },
    { value: 'anthropic/claude-3-haiku',          label: 'Claude 3 Haiku',       provider: 'Anthropic' },
    { value: 'anthropic/claude-3-5-sonnet',       label: 'Claude 3.5 Sonnet',    provider: 'Anthropic' },
    { value: 'google/gemini-pro-1.5',             label: 'Gemini 1.5 Pro',       provider: 'Google' },
  ]},
  { group: 'Modelos Grandes', models: [
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B',        provider: 'Meta' },
    { value: 'meta-llama/llama-3.1-405b-instruct',label: 'Llama 3.1 405B',       provider: 'Meta' },
    { value: 'mistralai/mixtral-8x7b-instruct',   label: 'Mixtral 8x7B',         provider: 'Mistral' },
  ]},
];

// ─── Templates de Agente por Segmento ────────────────────────────────────────
const PRESET_TEMPLATES = [
  {
    id: 'clinica',
    icon: Stethoscope,
    name: 'Clínica / Saúde',
    description: 'Atendimento de pacientes, agendamentos e dúvidas médicas',
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/40',
    iconColor: 'text-blue-400',
    defaults: {
      name: 'Sofia — Atendente da Clínica',
      tone: 'empathetic',
      language: 'pt-BR',
      aiModel: 'openai/gpt-4o-mini',
      temperature: 0.6,
      historyLimit: 15,
      systemPrompt: `# Identidade
Você é **Sofia**, assistente virtual de uma clínica de saúde. Você é empática, profissional e acolhedora. Seu objetivo é garantir que cada paciente se sinta cuidado e bem atendido.

# Missão
Você ajuda pacientes com:
- Agendamento, cancelamento e confirmação de consultas
- Informações sobre especialidades e médicos disponíveis
- Orientações sobre preparo para exames
- Dúvidas gerais sobre serviços da clínica
- Lembrete e confirmação de consultas agendadas

# Regras Obrigatórias
- **NUNCA** faça diagnósticos médicos ou prescreva medicamentos
- Sempre oriente a consultar um médico para questões clínicas
- Em emergências, instrua a ligar **192 (SAMU)** ou ir ao pronto-socorro
- Seja empática com pacientes ansiosos, idosos ou em sofrimento

# Tom e Estilo
- Use linguagem simples, clara e acolhedora
- Chame o paciente pelo nome quando disponível
- Nunca use jargão médico sem explicar o significado`,
      instructions: `1. Cumprimente o paciente com gentileza
2. Identifique o que ele precisa (agendamento, dúvida, exame, etc.)
3. Para agendamentos: pergunte especialidade, médico preferido e disponibilidade
4. Confirme todas as informações antes de finalizar
5. Encerre com um recado de cuidado e bem-estar`,
      guardrails: `Não faça diagnósticos. Não prescreva medicamentos. Não discuta casos de outros pacientes. Em emergências, sempre redirecione para o SAMU (192) ou pronto-socorro.`,
    },
  },
  {
    id: 'ecommerce',
    icon: ShoppingCart,
    name: 'E-commerce / Vendas',
    description: 'Assistente de vendas, catálogo, pedidos e suporte pós-venda',
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/40',
    iconColor: 'text-green-400',
    defaults: {
      name: 'Alex — Assistente de Vendas',
      tone: 'enthusiastic',
      language: 'pt-BR',
      aiModel: 'openai/gpt-4o-mini',
      temperature: 0.8,
      historyLimit: 10,
      systemPrompt: `# Identidade
Você é **Alex**, assistente de vendas especializado. Você é entusiasta, conhecedor dos produtos e totalmente focado em ajudar o cliente a encontrar a melhor solução para suas necessidades.

# Missão
- Apresentar produtos, características e benefícios
- Auxiliar o cliente na escolha do produto ideal
- Informar sobre preços, promoções e disponibilidade em estoque
- Acompanhar pedidos e prazos de entrega
- Resolver problemas pós-compra com agilidade e empatia

# Abordagem Consultiva de Vendas
1. **Entenda primeiro**: pergunte sobre a necessidade antes de recomendar
2. **Benefícios > Características**: o que o produto faz pelo cliente, não apenas o que ele é
3. **Alternativas**: ofereça opções quando o produto desejado não estiver disponível
4. **Transparência**: seja honesto sobre prazos, políticas e limitações

# Tom e Estilo
- Energético mas não invasivo
- Use emojis com moderação para deixar a conversa leve
- Destaque promoções e oportunidades de forma natural`,
      instructions: `1. Cumprimente e entenda o que o cliente procura
2. Apresente as opções mais relevantes com benefícios claros
3. Responda dúvidas sobre produto, prazo e pagamento
4. Para pedidos: confirme itens, quantidade, endereço e forma de pagamento
5. Finalize com estimativa de entrega e instrução de rastreamento`,
      guardrails: `Não prometa descontos além da política da empresa. Não confirme pedidos sem verificar estoque. Não compartilhe dados de outros clientes.`,
    },
  },
  {
    id: 'imobiliaria',
    icon: Home,
    name: 'Imobiliária',
    description: 'Consultor imobiliário: imóveis, visitas e financiamento',
    color: 'from-orange-500/20 to-amber-500/20',
    borderColor: 'border-orange-500/40',
    iconColor: 'text-orange-400',
    defaults: {
      name: 'Carlos — Consultor Imobiliário',
      tone: 'professional',
      language: 'pt-BR',
      aiModel: 'openai/gpt-4o-mini',
      temperature: 0.7,
      historyLimit: 12,
      systemPrompt: `# Identidade
Você é **Carlos**, consultor imobiliário virtual. Profissional, confiável e especialista no mercado local. Você entende que comprar ou alugar um imóvel é uma das decisões mais importantes na vida de uma pessoa.

# Missão
- Apresentar imóveis disponíveis para venda e locação
- Qualificar as necessidades e perfil financeiro do cliente
- Agendar visitas aos imóveis de interesse
- Orientar sobre financiamento, documentação e processo de compra
- Acompanhar o cliente durante toda a jornada de negociação

# Qualificação de Lead
Sempre colete estas informações de forma natural na conversa:
1. Tipo de imóvel (casa, apartamento, sala comercial, terreno)
2. Objetivo (compra ou locação)
3. Localização preferida (bairro, cidade)
4. Faixa de valores disponível
5. Prazo desejado para mudança
6. Número de quartos e outras características essenciais

# Tom e Estilo
- Profissional mas acessível — não use jargão jurídico excessivo
- Transmita segurança e confiança
- Sempre destaque os pontos fortes do imóvel`,
      instructions: `1. Cumprimente e descubra o objetivo do cliente (compra ou aluguel)
2. Qualifique as necessidades: tipo, localização, orçamento, prazo
3. Apresente as opções mais adequadas ao perfil
4. Ofereça agendamento de visita para os imóveis de interesse
5. Oriente sobre próximos passos (documentação, financiamento, proposta)`,
      guardrails: `Não forneça avaliações jurídicas. Não confirme disponibilidade de imóvel sem verificar. Não discuta a situação financeira de outros clientes.`,
    },
  },
  {
    id: 'restaurante',
    icon: UtensilsCrossed,
    name: 'Restaurante / Delivery',
    description: 'Pedidos, cardápio, delivery e reservas de mesa',
    color: 'from-red-500/20 to-rose-500/20',
    borderColor: 'border-red-500/40',
    iconColor: 'text-red-400',
    defaults: {
      name: 'Mari — Atendente do Restaurante',
      tone: 'friendly',
      language: 'pt-BR',
      aiModel: 'openai/gpt-4o-mini',
      temperature: 0.8,
      historyLimit: 8,
      systemPrompt: `# Identidade
Você é **Mari**, atendente virtual do restaurante. Simpática, ágil e apaixonada pela boa comida. Você representa a hospitalidade do restaurante em cada mensagem.

# Missão
- Apresentar o cardápio, pratos especiais e combinações
- Registrar pedidos para delivery, retirada ou reserva de mesa
- Informar sobre tempo de entrega e área de cobertura do delivery
- Informar sobre promoções, combos e pratos do dia
- Resolver questões sobre pedidos em andamento

# Fluxo de Atendimento
**Para Delivery/Retirada:**
1. Cumprimente e pergunte se é delivery, retirada ou reserva
2. Informe os destaques do dia e pergunte sobre preferências
3. Registre o pedido completo com observações (sem cebola, etc.)
4. Para delivery: confirme o endereço e calcule o frete
5. Informe o valor total e tempo estimado de entrega

**Para Reservas:**
1. Confirme data, horário e número de pessoas
2. Pergunte sobre alguma ocasião especial ou restrição alimentar
3. Confirme o nome para a reserva e um telefone de contato

# Tom e Estilo
- Caloroso e acolhedor, como um bom garçom
- Use emojis relacionados à comida com naturalidade 🍕🥗
- Sempre que possível, sugira complementos ao pedido`,
      instructions: `1. Cumprimente com entusiasmo
2. Identifique o tipo de atendimento: delivery, retirada ou reserva
3. Apresente o cardápio e destaques do dia
4. Registre o pedido com todos os detalhes
5. Confirme valor, tempo e método de pagamento
6. Agradeça e informe sobre acompanhamento do pedido`,
      guardrails: `Não confirme pedidos para endereços fora da área de entrega. Não prometa descontos não autorizados. Sempre informe alérgenos quando perguntado.`,
    },
  },
  {
    id: 'suporte',
    icon: Headphones,
    name: 'Suporte Técnico',
    description: 'Help desk, troubleshooting e abertura de tickets',
    color: 'from-purple-500/20 to-violet-500/20',
    borderColor: 'border-purple-500/40',
    iconColor: 'text-purple-400',
    defaults: {
      name: 'Max — Especialista de Suporte',
      tone: 'calm',
      language: 'pt-BR',
      aiModel: 'openai/gpt-4o-mini',
      temperature: 0.5,
      historyLimit: 15,
      systemPrompt: `# Identidade
Você é **Max**, especialista de suporte técnico. Paciente, preciso e focado em resolver problemas. Você sabe que um cliente com problema técnico já está estressado — sua missão é trazer calma e solução.

# Missão
- Diagnosticar e resolver problemas técnicos com clareza
- Guiar o usuário passo a passo, sem assumir conhecimento técnico
- Abrir tickets de suporte quando necessário
- Escalar para equipe técnica em casos complexos
- Registrar e documentar as soluções encontradas

# Processo de Atendimento
1. **Identifique o problema** com perguntas diretas
2. **Colete contexto**: dispositivo, sistema operacional, versão do software, quando o problema começou
3. **Solução simples primeiro**: reinicialização, limpeza de cache, atualização
4. **Passo a passo**: nunca pressuponha — instrua cada etapa com clareza
5. **Escale** se não resolver em 3 tentativas com procedimentos padrão

# Tom e Estilo
- Calm e paciente, mesmo se o usuário estiver frustrado
- Linguagem simples — evite siglas sem explicação
- Confirme cada passo antes de avançar para o próximo`,
      instructions: `1. Cumprimente e peça para o cliente descrever o problema
2. Colete informações essenciais: dispositivo, sistema, quando começou
3. Tente a solução mais simples primeiro
4. Guie passo a passo, aguardando confirmação a cada etapa
5. Se não resolver: abra um ticket e informe prazo de retorno`,
      guardrails: `Não acesse remotamente nenhum dispositivo. Não solicite senhas. Não prometa resolução imediata para problemas que exigem escalonamento.`,
    },
  },
  {
    id: 'educacao',
    icon: GraduationCap,
    name: 'Educação / Cursos',
    description: 'Orientação acadêmica, matrículas e dúvidas sobre cursos',
    color: 'from-yellow-500/20 to-amber-500/20',
    borderColor: 'border-yellow-500/40',
    iconColor: 'text-yellow-400',
    defaults: {
      name: 'Ana — Assistente Acadêmica',
      tone: 'friendly',
      language: 'pt-BR',
      aiModel: 'openai/gpt-4o-mini',
      temperature: 0.7,
      historyLimit: 10,
      systemPrompt: `# Identidade
Você é **Ana**, assistente acadêmica virtual. Motivadora, organizada e dedicada ao sucesso dos alunos. Você acredita que educação transforma vidas e isso se reflete em cada atendimento.

# Missão
- Informar sobre cursos, grades curriculares e cronogramas
- Auxiliar no processo de matrícula e rematrícula
- Responder dúvidas sobre conteúdo programático e professores
- Orientar sobre emissão de certificados, históricos e declarações
- Informar sobre bolsas, descontos e formas de pagamento
- Motivar e apoiar alunos com dificuldades ou dúvidas sobre a jornada

# Tom e Estilo
- Seja encorajadora e positiva
- Reconheça o esforço dos alunos
- Use linguagem acessível e empolgante sobre aprendizado
- Celebre as conquistas, mesmo as pequenas

# Processo de Atendimento
1. Identifique se é um novo interessado ou aluno atual
2. Para novos: apresente os cursos disponíveis e diferenciais
3. Para alunos: acesse o histórico da conversa para personalizar a resposta
4. Sempre informe os próximos passos claramente`,
      instructions: `1. Identifique se é novo interessado, aluno matriculado ou ex-aluno
2. Para interessados: apresente cursos relevantes, valores e diferenciais
3. Para matrícula: explique o processo passo a passo e documentação necessária
4. Responda dúvidas sobre conteúdo, professores e certificação
5. Encerre com motivação e próximos passos claros`,
      guardrails: `Não confirme aprovação ou reprovação sem verificar dados oficiais. Não prometa bolsas sem confirmação da área financeira. Não compartilhe notas de outros alunos.`,
    },
  },
  {
    id: 'custom',
    icon: Wand2,
    name: 'Personalizado',
    description: 'Comece do zero e crie seu agente único',
    color: 'from-gray-500/20 to-slate-500/20',
    borderColor: 'border-gray-500/40',
    iconColor: 'text-gray-400',
    defaults: {
      name: '',
      tone: 'friendly',
      language: 'pt-BR',
      aiModel: 'openai/gpt-4o-mini',
      temperature: 0.7,
      historyLimit: 10,
      systemPrompt: '',
      instructions: '',
      guardrails: '',
    },
  },
];

const EMPTY_FORM = {
  name: '',
  instructions: '',
  systemPrompt: '',
  instanceId: '',
  tone: 'friendly',
  language: 'pt-BR',
  humanInterventionEnabled: true,
  aiModel: 'openai/gpt-4o-mini',
  guardrails: '',
  transcriptionEnabled: false,
  transcriptionModel: 'google/gemini-flash-1.5',
  temperature: 0.7,
  historyLimit: 10,
};

export default function Agents() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<'template' | 'form'>('template');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState('');

  // Custom templates from localStorage
  const [customTemplates, setCustomTemplates] = useState<typeof PRESET_TEMPLATES>(() => {
    try {
      return JSON.parse(localStorage.getItem('agentCustomTemplates') || '[]');
    } catch { return []; }
  });

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.findAll,
  });

  const { data: instances } = useQuery({
    queryKey: ['instances'],
    queryFn: instancesApi.findAll,
  });

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents'] }); },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingAgent(null);
    setStep('template');
    setFormData({ ...EMPTY_FORM });
    setSavingTemplate(false);
    setSavedTemplateName('');
  };

  const handleSelectTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    setFormData((prev) => ({
      ...prev,
      ...template.defaults,
    }));
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      instructions: agent.instructions,
      systemPrompt: agent.systemPrompt,
      instanceId: agent.instanceId,
      tone: agent.tone || 'friendly',
      language: agent.language || 'pt-BR',
      humanInterventionEnabled: (agent as any).humanInterventionEnabled ?? true,
      aiModel: agent.aiModel || 'openai/gpt-4o-mini',
      guardrails: (agent as any).guardrails || '',
      transcriptionEnabled: agent.transcriptionEnabled ?? false,
      transcriptionModel: agent.transcriptionModel || 'google/gemini-flash-1.5',
      temperature: (agent as any).temperature ?? 0.7,
      historyLimit: (agent as any).historyLimit ?? 10,
    });
    setStep('form');
    setShowForm(true);
  };

  const handleSaveCustomTemplate = () => {
    if (!savedTemplateName.trim()) return;
    const newTemplate = {
      id: `custom_${Date.now()}`,
      icon: BookOpen,
      name: savedTemplateName,
      description: 'Template personalizado',
      color: 'from-indigo-500/20 to-purple-500/20',
      borderColor: 'border-indigo-500/40',
      iconColor: 'text-indigo-400',
      defaults: {
        name: formData.name,
        tone: formData.tone,
        language: formData.language,
        aiModel: formData.aiModel,
        temperature: formData.temperature,
        historyLimit: formData.historyLimit,
        systemPrompt: formData.systemPrompt,
        instructions: formData.instructions,
        guardrails: formData.guardrails,
      },
    };
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    localStorage.setItem('agentCustomTemplates', JSON.stringify(updated));
    setSavingTemplate(false);
    setSavedTemplateName('');
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('agentCustomTemplates', JSON.stringify(updated));
  };

  const toneOptions = [
    { value: 'friendly',      label: 'Amigável',     emoji: '😊' },
    { value: 'professional',  label: 'Profissional',  emoji: '👔' },
    { value: 'casual',        label: 'Descontraído',  emoji: '😎' },
    { value: 'empathetic',    label: 'Empático',      emoji: '💙' },
    { value: 'enthusiastic',  label: 'Entusiasta',    emoji: '🌟' },
    { value: 'calm',          label: 'Calmo',         emoji: '🧘' },
  ];

  const languageOptions = [
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'pt-PT', label: 'Português (Portugal)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Español' },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: 'success' | 'warning' | 'danger'; label: string }> = {
      ACTIVE:  { color: 'success', label: 'Ativo' },
      PAUSED:  { color: 'warning', label: 'Pausado' },
      STOPPED: { color: 'danger',  label: 'Parado' },
    };
    const c = config[status];
    return <Badge variant={c?.color}>{c?.label}</Badge>;
  };

  const allTemplates = [...customTemplates, ...PRESET_TEMPLATES];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Agentes</h1>
            <p className="text-gray-400 mt-1">Configure o cérebro da sua operação</p>
          </div>
          <Button
            onClick={() => { setFormData({ ...EMPTY_FORM }); setEditingAgent(null); setStep('template'); setShowForm(true); }}
            className="gap-2"
          >
            <Plus className="w-5 h-5" /> Novo Agente
          </Button>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 rounded-3xl w-full max-w-5xl border border-gray-700 shadow-2xl max-h-[92vh] overflow-y-auto"
              >
                {/* ── Step 1: Template Selection ──────────────────────────── */}
                {step === 'template' && (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/20 rounded-2xl">
                          <Sparkles className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white">Escolha um Modelo</h2>
                          <p className="text-gray-400 text-sm">Comece com um template pronto ou crie do zero</p>
                        </div>
                      </div>
                      <button onClick={closeForm} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {customTemplates.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Star className="w-3 h-3" /> Meus Templates
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {customTemplates.map((t) => {
                            const Icon = t.icon;
                            return (
                              <div key={t.id} className="relative group">
                                <button
                                  onClick={() => handleSelectTemplate(t)}
                                  className={`w-full p-4 rounded-2xl border bg-gradient-to-br ${t.color} ${t.borderColor} hover:scale-[1.02] transition-all text-left`}
                                >
                                  <div className={`p-2 rounded-xl bg-gray-800/50 w-fit mb-3 ${t.iconColor}`}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <p className="font-semibold text-white text-sm">{t.name}</p>
                                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">{t.description}</p>
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomTemplate(t.id)}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-gray-700 mt-6 mb-4" />
                      </div>
                    )}

                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Templates por Segmento</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {PRESET_TEMPLATES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            onClick={() => handleSelectTemplate(t)}
                            className={`p-5 rounded-2xl border bg-gradient-to-br ${t.color} ${t.borderColor} hover:scale-[1.03] hover:shadow-lg transition-all text-left group`}
                          >
                            <div className={`p-2.5 rounded-xl bg-gray-800/50 w-fit mb-4 ${t.iconColor} group-hover:scale-110 transition-transform`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-white text-sm leading-tight">{t.name}</p>
                            <p className="text-gray-400 text-xs mt-2 line-clamp-2">{t.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Agent Form ───────────────────────────────────── */}
                {step === 'form' && (
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                      {!editingAgent && (
                        <button
                          onClick={() => setStep('template')}
                          className="p-2 rounded-xl bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      <div className="p-3 bg-purple-500/20 rounded-2xl">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">
                        {editingAgent ? 'Editar Agente' : 'Configurar Agente'}
                      </h2>
                      <button onClick={closeForm} className="ml-auto text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Nome do Agente</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                            placeholder="Ex: Sofia — Atendente da Clínica"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Instância Vinculada</label>
                          <select
                            value={formData.instanceId}
                            onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                            required
                          >
                            <option value="">Selecione uma instância...</option>
                            {instances?.map((inst) => (
                              <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Tone & Language */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 col-span-2">
                          <label className="text-sm font-medium text-gray-400">Tom de Voz</label>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {toneOptions.map((tone) => (
                              <button
                                key={tone.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, tone: tone.value })}
                                className={`p-3 rounded-xl text-xs flex flex-col items-center gap-1 transition-all border ${
                                  formData.tone === tone.value
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'
                                }`}
                              >
                                <span className="text-xl">{tone.emoji}</span>
                                {tone.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Idioma</label>
                          <select
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all text-sm"
                          >
                            {languageOptions.map((lang) => (
                              <option key={lang.value} value={lang.value}>{lang.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* AI Config */}
                      <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-3xl space-y-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Bot className="w-4 h-4" /> Configurações de IA
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Model Selector */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Modelo de IA</label>
                            <select
                              value={formData.aiModel}
                              onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all font-mono text-sm"
                            >
                              {AI_MODELS.map((group) => (
                                <optgroup key={group.group} label={group.group}>
                                  {group.models.map((m) => (
                                    <option key={m.value} value={m.value}>
                                      {m.label} — {m.provider}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <p className="text-xs text-gray-600 font-mono">{formData.aiModel}</p>
                          </div>

                          {/* Transcription */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 flex items-center justify-between">
                              Transcrição de Áudio
                              <Badge variant={formData.transcriptionEnabled ? 'success' : 'neutral'}>
                                {formData.transcriptionEnabled ? 'Ativada' : 'Desativada'}
                              </Badge>
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, transcriptionEnabled: !formData.transcriptionEnabled })}
                                className={`p-3 rounded-xl border transition-all ${
                                  formData.transcriptionEnabled
                                    ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                    : 'bg-gray-900 border-gray-700 text-gray-500'
                                }`}
                              >
                                <Mic className="w-5 h-5" />
                              </button>
                              <select
                                disabled={!formData.transcriptionEnabled}
                                value={formData.transcriptionModel}
                                onChange={(e) => setFormData({ ...formData, transcriptionModel: e.target.value })}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all text-sm disabled:opacity-50"
                              >
                                <option value="google/gemini-flash-1.5">Gemini 1.5 Flash (Recomendado)</option>
                                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                                <option value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Temperature & History */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-orange-400" />
                              Temperatura
                              <span className="ml-auto text-orange-400 font-bold font-mono text-sm">
                                {formData.temperature.toFixed(1)}
                              </span>
                            </label>
                            <input
                              type="range"
                              min={0} max={2} step={0.1}
                              value={formData.temperature}
                              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                              className="w-full accent-orange-500"
                            />
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Preciso (0)</span>
                              <span>Balanceado (1)</span>
                              <span>Criativo (2)</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                              <History className="w-4 h-4 text-blue-400" />
                              Memória de Conversa
                              <span className="ml-auto text-blue-400 font-bold font-mono text-sm">
                                {formData.historyLimit} msg
                              </span>
                            </label>
                            <input
                              type="range"
                              min={1} max={50} step={1}
                              value={formData.historyLimit}
                              onChange={(e) => setFormData({ ...formData, historyLimit: parseInt(e.target.value) })}
                              className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Mínimo (1)</span>
                              <span>Recomendado (10)</span>
                              <span>Máximo (50)</span>
                            </div>
                          </div>
                        </div>

                        {/* Guardrails */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-400" /> Guardrails (Restrições)
                          </label>
                          <textarea
                            value={formData.guardrails}
                            onChange={(e) => setFormData({ ...formData, guardrails: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-all text-sm resize-none h-20"
                            placeholder="Ex: Nunca fale sobre concorrentes. Não dê descontos acima de 10%."
                          />
                        </div>
                      </div>

                      {/* Prompts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> System Prompt (Identidade)
                            <span className="text-xs text-gray-600 ml-auto">suporta markdown</span>
                          </label>
                          <textarea
                            value={formData.systemPrompt}
                            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all text-sm font-mono h-52 resize-none shadow-inner"
                            placeholder="# Identidade&#10;Você é Sofia, assistente..."
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Fluxo de Trabalho (Instruções)
                          </label>
                          <textarea
                            value={formData.instructions}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all text-sm font-mono h-52 resize-none shadow-inner"
                            placeholder="1. Cumprimente o usuário&#10;2. Identifique a necessidade&#10;3. ..."
                            required
                          />
                        </div>
                      </div>

                      {/* Save as Template */}
                      {savingTemplate ? (
                        <div className="flex gap-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
                          <input
                            type="text"
                            value={savedTemplateName}
                            onChange={(e) => setSavedTemplateName(e.target.value)}
                            placeholder="Nome do template..."
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                            autoFocus
                          />
                          <Button type="button" onClick={handleSaveCustomTemplate} size="sm" className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                            <Save className="w-4 h-4" /> Salvar
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setSavingTemplate(false)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSavingTemplate(true)}
                          className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <Star className="w-4 h-4" /> Salvar configuração atual como template
                        </button>
                      )}

                      {/* Actions */}
                      <div className="flex gap-4 pt-4 border-t border-gray-700">
                        <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                        >
                          {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Agente'}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Agent List */}
        <div className="grid gap-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LoadingSpinner />
              <p className="text-gray-500 animate-pulse">Carregando seus agentes...</p>
            </div>
          ) : agents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="p-6 bg-gray-800 rounded-3xl border border-gray-700">
                <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Nenhum agente criado ainda</p>
                <p className="text-gray-600 text-sm mt-1">Clique em "Novo Agente" para começar</p>
              </div>
            </div>
          ) : (
            agents?.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card className="p-8 border-gray-700/50 hover:border-purple-500/30 transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Bot className="w-32 h-32" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="p-4 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl border border-purple-500/20">
                        <Bot className="w-8 h-8 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-2xl font-bold text-white tracking-tight">{agent.name}</h3>
                          {getStatusBadge(agent.status)}
                        </div>
                        <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
                          {agent.instance?.name || 'Instância não vinculada'}
                          <span className="w-1 h-1 bg-gray-600 rounded-full" />
                          <span className="font-mono text-xs">{agent.aiModel}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="info">
                            {toneOptions.find((t) => t.value === agent.tone)?.emoji || '😊'} {agent.tone}
                          </Badge>
                          <Badge variant="neutral">{agent.language}</Badge>
                          {(agent as any).temperature !== undefined && (
                            <Badge variant="neutral">🌡 {(agent as any).temperature?.toFixed(1)}</Badge>
                          )}
                          {(agent as any).historyLimit !== undefined && (
                            <Badge variant="neutral">📚 {(agent as any).historyLimit} msg</Badge>
                          )}
                          {agent.transcriptionEnabled && (
                            <Badge variant="success"><Mic className="w-3 h-3 mr-1 inline" /> Áudio</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(agent)} className="gap-2">
                        <Edit className="w-4 h-4" /> Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este agente?')) {
                            deleteMutation.mutate(agent.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" /> Excluir
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fluxo de Trabalho</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono line-clamp-4">
                        {agent.instructions}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-900/30 rounded-2xl border border-gray-700/20">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Identidade do Agente</p>
                      <p className="text-sm text-gray-400 font-mono line-clamp-4">
                        {agent.systemPrompt}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, instancesApi, Agent } from '../lib/api';
import { Plus, Trash2, Edit, Bot, Sparkles, MessageSquare, Mic, Shield } from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, PageTransition } from '../components/ui';

export default function Agents() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) =>
      agentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setEditingAgent(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: agentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const resetForm = () => {
    setFormData({
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
    });
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
      guardrails: agent.guardrails || '',
      transcriptionEnabled: agent.transcriptionEnabled ?? false,
      transcriptionModel: agent.transcriptionModel || 'google/gemini-flash-1.5',
    });
    setShowForm(true);
  };

  const toneOptions = [
    { value: 'friendly', label: 'Amigável', emoji: '😊' },
    { value: 'professional', label: 'Profissional', emoji: '👔' },
    { value: 'casual', label: 'Descontraído', emoji: '😎' },
    { value: 'empathetic', label: 'Empático', emoji: '💙' },
    { value: 'enthusiastic', label: 'Entusiasta', emoji: '🌟' },
    { value: 'calm', label: 'Calmo', emoji: '🧘' },
  ];

  const languageOptions = [
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'pt-PT', label: 'Português (Portugal)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Español' },
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      ACTIVE: { color: 'success' as const, label: 'Ativo' },
      PAUSED: { color: 'warning' as const, label: 'Pausado' },
      STOPPED: { color: 'danger' as const, label: 'Parado' },
    };
    const configStatus = config[status as keyof typeof config];
    return <Badge variant={configStatus?.color}>{configStatus?.label}</Badge>;
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Agentes</h1>
            <p className="text-gray-400 mt-1">Configure o cérebro da sua operação</p>
          </div>
          <Button onClick={() => { resetForm(); setEditingAgent(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-5 h-5" /> Novo Agente
          </Button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-3xl p-8 w-full max-w-4xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-500/20 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {editingAgent ? 'Editar Agente' : 'Novo Agente'}
                </h2>
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
                      placeholder="Ex: Consultor de Vendas"
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

                {/* Personality & Model */}
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
                    <label className="text-sm font-medium text-gray-400">Idioma Principal</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Modelo OpenRouter</label>
                      <input
                        type="text"
                        value={formData.aiModel}
                        onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all font-mono text-sm"
                        placeholder="Ex: openai/gpt-4o-mini"
                      />
                    </div>
                    
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-400" /> Guardrails (Cerca de Segurança)
                    </label>
                    <textarea
                      value={formData.guardrails}
                      onChange={(e) => setFormData({ ...formData, guardrails: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-all text-sm resize-none h-20"
                      placeholder="Ex: Nunca fale sobre política. Nunca dê descontos acima de 10%. Não mencione concorrentes."
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Prompt do Sistema
                    </label>
                    <textarea
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all text-sm font-mono h-40 resize-none shadow-inner"
                      placeholder="Identidade do Agente..."
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
                      className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all text-sm font-mono h-40 resize-none shadow-inner"
                      placeholder="O que o agente deve fazer..."
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-700">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowForm(false); setEditingAgent(null); resetForm(); }}
                    className="flex-1"
                  >
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
            </motion.div>
          </div>
        )}

        <div className="grid gap-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LoadingSpinner />
              <p className="text-gray-500 animate-pulse">Carregando seus agentes...</p>
            </div>
          ) : (
            agents?.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
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
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-bold text-white tracking-tight">{agent.name}</h3>
                          {getStatusBadge(agent.status)}
                        </div>
                        <p className="text-gray-400 mt-1 flex items-center gap-2">
                          {agent.instance?.name || 'Instância não vinculada'}
                          <span className="w-1 h-1 bg-gray-600 rounded-full" />
                          <span className="text-xs font-mono">{agent.aiModel}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                          <Badge variant="info">
                            {toneOptions.find(t => t.value === agent.tone)?.emoji || '😊'} {agent.tone}
                          </Badge>
                          <Badge variant="neutral">{agent.language}</Badge>
                          {agent.transcriptionEnabled && (
                            <Badge variant="success">
                              <Mic className="w-3 h-3 mr-1 inline" /> Transcrição Ativa
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2">
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

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Workflow Especializado</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono line-clamp-4">
                        {agent.instructions}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-900/30 rounded-2xl border border-gray-700/20">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Perfil Psicológico</p>
                      <p className="text-sm text-gray-400 italic line-clamp-4">
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

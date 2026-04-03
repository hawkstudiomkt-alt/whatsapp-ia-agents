import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, instancesApi, agentsApi, followupsApi, Lead } from '../lib/api';
import {
  Users, Phone, Star, Calendar, Plus, X, Search, Filter,
  Bot, UserCheck, Lock, Unlock, Trash2, Edit3, Tag, Building2,
  ChevronDown, CheckCircle, AlertCircle, Clock, Zap, MessageSquare,
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, PageTransition } from '../components/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  NEW:          { label: 'Novo',           color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     dot: 'bg-blue-400'   },
  QUALIFIED:    { label: 'Qualificado',    color: 'bg-green-500/20 text-green-400 border-green-500/30',  dot: 'bg-green-400'  },
  DISQUALIFIED: { label: 'Desqualificado', color: 'bg-red-500/20 text-red-400 border-red-500/30',        dot: 'bg-red-400'    },
  CONVERTED:    { label: 'Convertido',     color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
} as const;

const FOLLOWUP_TEMPLATES = [
  { id: 'no_response_24h', type: 'NO_RESPONSE', label: '📭 Sem resposta (24h)', note: 'O cliente não respondeu. Retome o contato com gentileza, pergunte se ainda tem interesse.' },
  { id: 'no_response_3d',  type: 'NO_RESPONSE', label: '📭 Sem resposta (3 dias)', note: 'Faz 3 dias sem retorno. Tente uma abordagem diferente, destaque um benefício novo.' },
  { id: 'proposal_pending', type: 'REMINDER', label: '📋 Proposta pendente', note: 'O cliente recebeu a proposta mas não retornou. Pergunte se teve dúvidas ou precisa de mais informações.' },
  { id: 'reactivation',    type: 'CUSTOM',    label: '🔥 Reativação de lead frio', note: 'Lead inativo há muito tempo. Apresente uma novidade, promoção ou conteúdo de valor para reengajar.' },
  { id: 'post_event',      type: 'REMINDER',  label: '🎉 Pós-evento / compra', note: 'Verifique a satisfação, agradeça e abra caminho para novas oportunidades ou indicações.' },
  { id: 'custom',          type: 'CUSTOM',    label: '✏️ Personalizado (escrever do zero)', note: '' },
];

const TAG_COLORS = [
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
];

function tagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function isHuman(lead: Lead): boolean {
  return !!(lead.conversation?.isHumanHandling || lead.assignedToHuman);
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Leads() {
  const queryClient = useQueryClient();

  // Filtros e buscas
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [instanceFilter, setInstanceFilter] = useState('');

  // Modais
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForFollowUp, setSelectedLeadForFollowUp] = useState<Lead | null>(null);
  const [toggleHumanLead, setToggleHumanLead] = useState<Lead | null>(null);
  const [toggleReason, setToggleReason] = useState('');
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);

  // Formulário de criação
  const [newLeadData, setNewLeadData] = useState({
    phone: '', name: '', email: '', instanceId: '', agentId: '', tagInput: '', tags: [] as string[],
  });

  // Formulário de edição
  const [editData, setEditData] = useState({
    name: '', email: '', tags: [] as string[], agentId: '', instanceId: '', tagInput: '',
  });

  // Formulário de follow-up
  const [followUpTemplate, setFollowUpTemplate] = useState(FOLLOWUP_TEMPLATES[0]);
  const [followUpDays, setFollowUpDays] = useState(1);
  const [followUpNote, setFollowUpNote] = useState('');

  // Queries
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: () => leadsApi.findAll(statusFilter || undefined),
    refetchInterval: 15_000,
  });
  const { data: instances } = useQuery({ queryKey: ['instances'], queryFn: instancesApi.findAll });
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: agentsApi.findAll });

  // Mutations
  const createMutation = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowCreateForm(false);
      setNewLeadData({ phone: '', name: '', email: '', instanceId: '', agentId: '', tagInput: '', tags: [] });
    },
    onError: (e: any) => alert(e.response?.data?.error || 'Erro ao criar lead'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setEditingLead(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: leadsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setDeletingLead(null);
    },
    onError: () => alert('Erro ao deletar lead'),
  });

  const toggleHumanMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => leadsApi.toggleHuman(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setToggleHumanLead(null);
      setToggleReason('');
    },
    onError: () => alert('Erro ao alterar modo de atendimento'),
  });

  const followUpMutation = useMutation({
    mutationFn: followupsApi.create,
    onSuccess: () => {
      setSelectedLeadForFollowUp(null);
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
    onError: () => alert('Erro ao agendar follow-up'),
  });

  // Filtragem client-side
  const filteredLeads = (leads || []).filter(lead => {
    if (instanceFilter) {
      const lid = lead.conversation?.instanceId || lead.instanceId;
      if (lid !== instanceFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const match =
        (lead.name || '').toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.tags || []).some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Abre edição com dados pré-preenchidos
  function openEdit(lead: Lead) {
    setEditData({
      name: lead.name || '',
      email: lead.email || '',
      tags: lead.tags || [],
      agentId: lead.agentId || (lead.agent?.id || ''),
      instanceId: lead.instanceId || (lead.conversation?.instanceId || ''),
      tagInput: '',
    });
    setEditingLead(lead);
  }

  function addTag(form: any, setForm: any, value: string) {
    const tag = value.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag], tagInput: '' });
    } else {
      setForm({ ...form, tagInput: '' });
    }
  }

  function removeTag(form: any, setForm: any, tag: string) {
    setForm({ ...form, tags: form.tags.filter((t: string) => t !== tag) });
  }

  // Seleciona template de follow-up
  function selectTemplate(tpl: typeof FOLLOWUP_TEMPLATES[0]) {
    setFollowUpTemplate(tpl);
    setFollowUpNote(tpl.note);
  }

  const countByStatus = (s: string) => (leads || []).filter(l => l.status === s).length;

  return (
    <PageTransition>
      <div className="space-y-6">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Leads</h1>
            <p className="text-gray-400 text-sm mt-1">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} encontrado{filteredLeads.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Novo Lead
          </Button>
        </div>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([status, cfg]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={`p-4 rounded-2xl border transition-all text-left ${
                statusFilter === status
                  ? 'bg-white/10 border-white/20 scale-[1.02]'
                  : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">{cfg.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{countByStatus(status)}</p>
            </button>
          ))}
        </div>

        {/* ── Filtros ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 text-sm"
            />
          </div>
          <select
            value={instanceFilter}
            onChange={e => setInstanceFilter(e.target.value)}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50"
          >
            <option value="">Todas Instâncias</option>
            {instances?.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>

        {/* ── Cards de Leads ────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : filteredLeads.length === 0 ? (
          <Card className="p-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">Nenhum lead encontrado</p>
            <p className="text-gray-600 text-sm mt-1">Crie um novo lead ou ajuste os filtros</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredLeads.map((lead, i) => {
                const humanMode = isHuman(lead);
                const instanceName = lead.instance?.name
                  || instances?.find(inst => inst.id === (lead.conversation?.instanceId || lead.instanceId))?.name
                  || '—';
                const agentName = lead.agent?.name || lead.conversation?.agent?.name || '—';
                const score = lead.score ?? 0;
                const scorePct = Math.min(100, score);
                const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;

                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-gray-600/60 transition-all hover:shadow-xl hover:shadow-black/20 group overflow-hidden"
                  >
                    {/* Faixa de status colorida no topo */}
                    <div className={`h-1 w-full ${
                      lead.status === 'QUALIFIED' ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                      lead.status === 'CONVERTED' ? 'bg-gradient-to-r from-purple-500 to-violet-400' :
                      lead.status === 'DISQUALIFIED' ? 'bg-gradient-to-r from-red-500 to-rose-400' :
                      'bg-gradient-to-r from-blue-500 to-cyan-400'
                    }`} />

                    <div className="p-5">
                      {/* Linha 1: avatar + nome + toggle humano/agente */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${
                            humanMode
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                              : 'bg-green-500/20 border-green-500/40 text-green-400'
                          }`}>
                            {getInitials(lead.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{lead.name || 'Sem nome'}</p>
                            <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 shrink-0" />
                              {lead.phone}
                            </p>
                          </div>
                        </div>

                        {/* Badge de modo de atendimento — clicável */}
                        <button
                          onClick={() => { setToggleHumanLead(lead); setToggleReason(''); }}
                          title={humanMode ? 'Clique para devolver ao agente IA' : 'Clique para transferir para humano'}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all shrink-0 ${
                            humanMode
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
                              : 'bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/25'
                          }`}
                        >
                          {humanMode ? (
                            <><UserCheck className="w-3 h-3" /> Humano</>
                          ) : (
                            <><Bot className="w-3 h-3" /> Agente</>
                          )}
                        </button>
                      </div>

                      {/* Linha 2: Tags */}
                      {(lead.tags && lead.tags.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {lead.tags.map(tag => (
                            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${tagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Linha 3: instância + agente */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {instanceName}
                        </span>
                        <span className="text-gray-700">•</span>
                        <span className="flex items-center gap-1">
                          <Bot className="w-3 h-3" /> {agentName}
                        </span>
                      </div>

                      {/* Linha 4: Status + Score */}
                      <div className="flex items-center justify-between mt-3 gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                scorePct >= 70 ? 'bg-green-400' :
                                scorePct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${scorePct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${
                            scorePct >= 70 ? 'text-green-400' :
                            scorePct >= 40 ? 'text-yellow-400' : 'text-gray-500'
                          }`}>{scorePct}</span>
                        </div>
                      </div>

                      {/* Linha 5: Ações */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/40">
                        <button
                          onClick={() => openEdit(lead)}
                          title="Editar lead"
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-700/50"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLeadForFollowUp(lead);
                            setFollowUpTemplate(FOLLOWUP_TEMPLATES[0]);
                            setFollowUpNote(FOLLOWUP_TEMPLATES[0].note);
                            setFollowUpDays(1);
                          }}
                          title="Agendar Follow-up"
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-500/10"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Follow-up
                        </button>
                        <button
                          onClick={() => updateMutation.mutate({ id: lead.id, data: { assignedToHuman: !lead.assignedToHuman } })}
                          title={lead.assignedToHuman ? 'Desbloquear IA' : 'Travar IA (apenas humano responde)'}
                          className={`flex items-center gap-1 text-xs transition-colors px-2 py-1.5 rounded-lg ${
                            lead.assignedToHuman
                              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                              : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                        >
                          {lead.assignedToHuman ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          {lead.assignedToHuman ? 'IA Travada' : 'Travar IA'}
                        </button>
                        <button
                          onClick={() => setDeletingLead(lead)}
                          title="Deletar lead"
                          className="ml-auto flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Modal: Criar Lead ──────────────────────────────────── */}
      <AnimatePresence>
        {showCreateForm && (
          <Modal onClose={() => setShowCreateForm(false)} title="Adicionar Novo Lead" icon={<Plus className="text-green-500" />}>
            <div className="space-y-4">
              <InputField label="WhatsApp *" placeholder="5511999999999" value={newLeadData.phone}
                onChange={v => setNewLeadData({ ...newLeadData, phone: v })} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Nome" placeholder="Nome completo" value={newLeadData.name}
                  onChange={v => setNewLeadData({ ...newLeadData, name: v })} />
                <InputField label="Email" placeholder="email@exemplo.com" value={newLeadData.email}
                  onChange={v => setNewLeadData({ ...newLeadData, email: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Instância" value={newLeadData.instanceId}
                  onChange={v => setNewLeadData({ ...newLeadData, instanceId: v })}
                  options={[{ value: '', label: 'Selecione...' }, ...(instances || []).map(i => ({ value: i.id, label: i.name }))]} />
                <SelectField label="Agente" value={newLeadData.agentId}
                  onChange={v => setNewLeadData({ ...newLeadData, agentId: v })}
                  options={[{ value: '', label: 'Selecione...' }, ...(agents || []).filter(a => !newLeadData.instanceId || a.instanceId === newLeadData.instanceId).map(a => ({ value: a.id, label: a.name }))]} />
              </div>
              <TagInput
                label="Tags"
                tags={newLeadData.tags}
                inputValue={newLeadData.tagInput}
                onInputChange={v => setNewLeadData({ ...newLeadData, tagInput: v })}
                onAdd={() => addTag(newLeadData, setNewLeadData, newLeadData.tagInput)}
                onRemove={tag => removeTag(newLeadData, setNewLeadData, tag)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowCreateForm(false)} className="flex-1">Cancelar</Button>
              <Button onClick={() => createMutation.mutate({ phone: newLeadData.phone, name: newLeadData.name, email: newLeadData.email, instanceId: newLeadData.instanceId || undefined, agentId: newLeadData.agentId || undefined, tags: newLeadData.tags })}
                disabled={createMutation.isPending || !newLeadData.phone} className="flex-1">
                {createMutation.isPending ? 'Criando...' : 'Criar Lead'}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Modal: Editar Lead ─────────────────────────────────── */}
      <AnimatePresence>
        {editingLead && (
          <Modal onClose={() => setEditingLead(null)} title={`Editar: ${editingLead.name || editingLead.phone}`} icon={<Edit3 className="text-blue-400" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Nome" placeholder="Nome completo" value={editData.name}
                  onChange={v => setEditData({ ...editData, name: v })} />
                <InputField label="Email" placeholder="email@exemplo.com" value={editData.email}
                  onChange={v => setEditData({ ...editData, email: v })} />
              </div>
              <SelectField label="Agente Atribuído" value={editData.agentId}
                onChange={v => setEditData({ ...editData, agentId: v })}
                options={[{ value: '', label: 'Sem agente' }, ...(agents || []).map(a => ({ value: a.id, label: a.name }))]} />
              <TagInput
                label="Tags"
                tags={editData.tags}
                inputValue={editData.tagInput}
                onInputChange={v => setEditData({ ...editData, tagInput: v })}
                onAdd={() => addTag(editData, setEditData, editData.tagInput)}
                onRemove={tag => removeTag(editData, setEditData, tag)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setEditingLead(null)} className="flex-1">Cancelar</Button>
              <Button onClick={() => updateMutation.mutate({ id: editingLead.id, data: { name: editData.name || undefined, email: editData.email || undefined, agentId: editData.agentId || undefined, tags: editData.tags } })}
                disabled={updateMutation.isPending} className="flex-1">
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Modal: Toggle Humano/Agente ────────────────────────── */}
      <AnimatePresence>
        {toggleHumanLead && (
          <Modal onClose={() => setToggleHumanLead(null)}
            title={isHuman(toggleHumanLead) ? 'Devolver ao Agente IA' : 'Transferir para Humano'}
            icon={isHuman(toggleHumanLead) ? <Bot className="text-green-400" /> : <UserCheck className="text-blue-400" />}>
            <p className="text-gray-400 text-sm">
              {isHuman(toggleHumanLead)
                ? `O atendimento de *${toggleHumanLead.name || toggleHumanLead.phone}* voltará para o agente IA. O bot retomará as respostas automaticamente.`
                : `O agente IA deixará de responder para *${toggleHumanLead.name || toggleHumanLead.phone}*. Um humano assumirá o atendimento.`
              }
            </p>
            {!isHuman(toggleHumanLead) && (
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-gray-400">Motivo / Situação (enviado para o suporte)</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Cliente solicitou falar com humano, está com dúvidas sobre o contrato..."
                  value={toggleReason}
                  onChange={e => setToggleReason(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-600">Se a instância tiver um número de suporte configurado, uma notificação será enviada automaticamente pelo WhatsApp.</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setToggleHumanLead(null)} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => toggleHumanMutation.mutate({ id: toggleHumanLead.id, reason: toggleReason })}
                disabled={toggleHumanMutation.isPending}
                className={`flex-1 ${isHuman(toggleHumanLead) ? '' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500'}`}
              >
                {toggleHumanMutation.isPending ? 'Alterando...' : isHuman(toggleHumanLead) ? '🤖 Devolver ao Agente' : '👤 Transferir para Humano'}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Modal: Follow-up ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedLeadForFollowUp && (
          <Modal onClose={() => setSelectedLeadForFollowUp(null)} title={`Follow-up: ${selectedLeadForFollowUp.name || selectedLeadForFollowUp.phone}`} icon={<Calendar className="text-blue-400" />} wide>
            <div className="space-y-5">
              {/* Templates */}
              <div>
                <label className="text-sm font-medium text-gray-400 block mb-2">Escolha um Template</label>
                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                  {FOLLOWUP_TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => selectTemplate(tpl)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        followUpTemplate.id === tpl.id
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-gray-900/50 border-gray-700/50 text-gray-300 hover:border-gray-600'
                      }`}>
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instrução para a IA */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Instrução para a IA</label>
                <textarea
                  value={followUpNote}
                  onChange={e => setFollowUpNote(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none resize-none"
                  placeholder="A IA vai usar isso como guia para personalizar a mensagem de retorno..."
                />
                <p className="text-xs text-gray-600">A IA decidirá como abordar o lead com base nessa instrução e no histórico da conversa, sem copiar literalmente.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Daqui a quantos dias?</label>
                <input type="number" min={1} max={60} value={followUpDays}
                  onChange={e => setFollowUpDays(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setSelectedLeadForFollowUp(null)} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() + followUpDays);
                  followUpMutation.mutate({
                    leadId: selectedLeadForFollowUp.id,
                    type: followUpTemplate.type,
                    scheduledFor: date.toISOString(),
                    notes: followUpNote,
                  });
                }}
                disabled={followUpMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500"
              >
                {followUpMutation.isPending ? 'Agendando...' : '📅 Confirmar Agendamento'}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Modal: Confirmar Delete ────────────────────────────── */}
      <AnimatePresence>
        {deletingLead && (
          <Modal onClose={() => setDeletingLead(null)} title="Deletar Lead" icon={<Trash2 className="text-red-400" />}>
            <p className="text-gray-300">Tem certeza que deseja deletar o lead <strong className="text-white">{deletingLead.name || deletingLead.phone}</strong>?</p>
            <p className="text-gray-500 text-sm mt-2">Essa ação é permanente e removerá o lead e todos os follow-ups associados.</p>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setDeletingLead(null)} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => deleteMutation.mutate(deletingLead.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 shadow-red-500/20"
              >
                {deleteMutation.isPending ? 'Deletando...' : '🗑️ Deletar Definitivamente'}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Modal({ children, onClose, title, icon, wide = false }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className={`bg-gray-800 rounded-3xl p-8 w-full ${wide ? 'max-w-xl' : 'max-w-lg'} border border-gray-700 shadow-2xl space-y-5`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {icon}{title}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function InputField({ label, placeholder, value, onChange }: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none">
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function TagInput({ label, tags, inputValue, onInputChange, onAdd, onRemove }: {
  label: string; tags: string[]; inputValue: string;
  onInputChange: (v: string) => void; onAdd: () => void; onRemove: (t: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ex: interesse alto, viu proposta..."
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-green-500 outline-none"
        />
        <Button size="sm" onClick={onAdd} variant="secondary" className="shrink-0">
          <Tag className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${tagColor(tag)}`}>
              {tag}
              <button onClick={() => onRemove(tag)} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, instancesApi, agentsApi, Campaign, CampaignContact } from '../lib/api';
import {
  Zap, Plus, Play, X, Clock, CheckCircle, AlertCircle, Users,
  Upload, MessageSquare, BarChart2, List, ChevronRight, ChevronLeft,
  Bot, Building2, Trash2, RefreshCw, FileText, Eye, Send,
  ToggleLeft, ToggleRight, Phone, Tag, AlertTriangle,
} from 'lucide-react';
import { PageTransition, LoadingSpinner } from '../components/ui';

// ─── Design tokens ────────────────────────────────────────────────────────────
const LIME   = '#B6FF00';
const PURPLE = '#7D53FF';
const DARK   = '#0a0a0a';
const CARD   = '#0e0e0e';
const BORDER = '#1e1e1e';

// ─── Status config ────────────────────────────────────────────────────────────
const CAMPAIGN_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Rascunho',    color: '#888',    bg: 'rgba(136,136,136,0.12)' },
  SCHEDULED: { label: 'Agendada',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  RUNNING:   { label: 'Disparando',  color: LIME,      bg: 'rgba(182,255,0,0.12)' },
  PAUSED:    { label: 'Pausada',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  COMPLETED: { label: 'Concluída',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  FAILED:    { label: 'Falhou',      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const CONTACT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: '#888' },
  SENT:    { label: 'Enviado',  color: '#34d399' },
  FAILED:  { label: 'Falhou',   color: '#f87171' },
  SKIPPED: { label: 'Pulado',   color: '#f59e0b' },
};

// ─── Message templates ────────────────────────────────────────────────────────
const MSG_TEMPLATES = [
  { id: 'promo',    emoji: '🎯', label: 'Oferta / Promoção',    text: 'Olá {nome}! Temos uma oferta exclusiva para você. Não perca essa oportunidade!' },
  { id: 'event',    emoji: '🎉', label: 'Convite de Evento',    text: 'Olá {nome}! Você está convidado para nosso evento. Confirme sua presença!' },
  { id: 'reminder', emoji: '⏰', label: 'Lembrete',             text: 'Olá {nome}, passando para lembrar que você tem um compromisso agendado. Qualquer dúvida, estou à disposição.' },
  { id: 'reactivation', emoji: '🔥', label: 'Reativação',      text: 'Oi {nome}! Faz um tempo que não nos falamos. Tenho uma novidade que pode te interessar!' },
  { id: 'followup', emoji: '👋', label: 'Follow-up',            text: 'Olá {nome}, como posso te ajudar hoje? Estou aqui se precisar de qualquer suporte.' },
  { id: 'custom',   emoji: '✏️', label: 'Mensagem Personalizada', text: '' },
];

// ─── CSV/XLSX parser ──────────────────────────────────────────────────────────
function parseCSVText(text: string): { phone: string; name?: string; variables?: Record<string, string> }[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const hasHeaders = headers.some(h => ['telefone', 'phone', 'numero', 'número', 'cel', 'celular', 'whatsapp'].includes(h));

  const results: { phone: string; name?: string; variables?: Record<string, string> }[] = [];

  const dataLines = hasHeaders ? lines.slice(1) : lines;
  const phoneCol = hasHeaders ? headers.findIndex(h => ['telefone', 'phone', 'numero', 'número', 'cel', 'celular', 'whatsapp'].includes(h)) : 0;
  const nameCol = hasHeaders ? headers.findIndex(h => ['nome', 'name', 'contato'].includes(h)) : -1;

  for (const line of dataLines) {
    const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const raw = cols[phoneCol] || cols[0] || '';
    const phone = raw.replace(/\D/g, '');
    if (phone.length < 8) continue;

    const contact: { phone: string; name?: string; variables?: Record<string, string> } = { phone };
    if (nameCol >= 0 && cols[nameCol]) contact.name = cols[nameCol];

    // Extra columns as variables
    if (hasHeaders && headers.length > 2) {
      const variables: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (i !== phoneCol && i !== nameCol && cols[i]) {
          variables[h] = cols[i];
        }
      });
      if (Object.keys(variables).length > 0) contact.variables = variables;
    }

    results.push(contact);
  }
  return results;
}

function parsePhoneList(raw: string): { phone: string; name?: string }[] {
  return raw.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const parts = l.split(/[\t,;]/).map(p => p.trim());
      const phone = (parts[0] || '').replace(/\D/g, '');
      const name = parts[1] || undefined;
      return { phone, name };
    })
    .filter(c => c.phone.length >= 8);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatCard({ value, label, color = LIME, icon }: { value: string | number; label: string; color?: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, type = 'campaign' }: { status: string; type?: 'campaign' | 'contact' }) {
  const cfg = type === 'campaign' ? CAMPAIGN_STATUS[status] : CONTACT_STATUS[status];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
      background: (cfg as any).bg || `${cfg.color}18`,
      color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {status === 'RUNNING' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: LIME, display: 'inline-block', animation: 'pulse 1s infinite' }} />}
      {(cfg as any).label || cfg.label}
    </span>
  );
}

// ─── Campaign Wizard ──────────────────────────────────────────────────────────
const STEPS = ['Planejamento', 'Público', 'Mensagem', 'Revisar'];

interface WizardState {
  // Step 1
  name: string;
  instanceId: string;
  agentId: string;
  intervalMin: number;
  intervalMax: number;
  scheduledFor: string;
  // Step 2
  importMode: 'upload' | 'paste' | 'none';
  pasteText: string;
  contacts: { phone: string; name?: string; variables?: Record<string, string> }[];
  // Step 3
  templateId: string;
  message: string;
  useAsBase: boolean;
}

function CampaignWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    name: '', instanceId: '', agentId: '', intervalMin: 5, intervalMax: 15, scheduledFor: '',
    importMode: 'none', pasteText: '', contacts: [],
    templateId: 'promo', message: MSG_TEMPLATES[0].text, useAsBase: false,
  });
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: instances } = useQuery({ queryKey: ['instances'], queryFn: instancesApi.findAll });
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: agentsApi.findAll });

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); onSuccess(); },
  });

  const filteredAgents = (agents || []).filter(a => !state.instanceId || a.instanceId === state.instanceId);

  function set(partial: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...partial }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'txt', 'tsv'].includes(ext || '')) {
      setFileError('Use arquivo .csv ou .txt. Para Excel: Arquivo → Salvar como → CSV.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const contacts = parseCSVText(text);
      if (contacts.length === 0) {
        setFileError('Nenhum número válido encontrado. Certifique que a coluna "telefone" está presente.');
      } else {
        set({ contacts, importMode: 'upload' });
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function handlePaste() {
    const contacts = parsePhoneList(state.pasteText);
    set({ contacts, importMode: 'paste' });
  }

  function selectTemplate(tpl: typeof MSG_TEMPLATES[0]) {
    set({ templateId: tpl.id, message: tpl.text });
  }

  function canNext(): boolean {
    if (step === 0) return !!(state.name && state.instanceId);
    if (step === 1) return state.contacts.length > 0;
    if (step === 2) return state.message.trim().length > 0;
    return true;
  }

  function submit() {
    createMutation.mutate({
      name: state.name,
      instanceId: state.instanceId,
      agentId: state.agentId || undefined,
      message: state.message,
      useAsBase: state.useAsBase,
      intervalMin: state.intervalMin,
      intervalMax: state.intervalMax,
      scheduledFor: state.scheduledFor || undefined,
      contacts: state.contacts,
    });
  }

  const inputStyle = {
    width: '100%', background: '#111', border: `1px solid ${BORDER}`, borderRadius: 10,
    padding: '11px 14px', color: 'white', fontSize: 14, outline: 'none',
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Space Mono, monospace', marginBottom: 6, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: `0 0 60px rgba(182,255,0,0.05), 0 24px 64px rgba(0,0,0,0.7)` }}>

        {/* Header */}
        <div style={{ padding: '28px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${LIME}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap style={{ color: LIME, width: 18, height: 18 }} />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>Nova Campanha</div>
              <div style={{ color: '#444', fontSize: 12, fontFamily: 'Space Mono, monospace' }}>PASSO {step + 1} DE {STEPS.length}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onMouseEnter={e => (e.currentTarget.style.color = LIME)} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Step bar */}
        <div style={{ padding: '20px 32px 0', display: 'flex', gap: 8 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 3, borderRadius: 2, background: i <= step ? LIME : '#222', transition: 'all 0.3s' }} />
              <div style={{ fontSize: 11, color: i === step ? LIME : '#444', marginTop: 6, fontWeight: i === step ? 700 : 400, fontFamily: 'Space Mono, monospace' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px' }}>
          <AnimatePresence mode="wait">
            {/* ── STEP 0: Planejamento ───────────────────────────────── */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nome da Campanha *</label>
                  <input style={inputStyle} placeholder="Ex: Black Friday 2026" value={state.name} onChange={e => set({ name: e.target.value })}
                    onFocus={e => (e.currentTarget.style.borderColor = LIME)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Instância *</label>
                    <select style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' } as any} value={state.instanceId} onChange={e => set({ instanceId: e.target.value, agentId: '' })}
                      onFocus={e => (e.currentTarget.style.borderColor = LIME)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)}>
                      <option value="">Selecione...</option>
                      {(instances || []).map(i => <option key={i.id} value={i.id} style={{ background: '#111' }}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Agente <span style={{ color: '#444', fontSize: 10 }}>OPCIONAL</span></label>
                    <select style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' } as any} value={state.agentId} onChange={e => set({ agentId: e.target.value })}
                      onFocus={e => (e.currentTarget.style.borderColor = LIME)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)}>
                      <option value="">Nenhum</option>
                      {filteredAgents.map(a => <option key={a.id} value={a.id} style={{ background: '#111' }}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Intervalo entre mensagens (segundos)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#444', marginBottom: 4 }}>Mínimo</div>
                      <input type="number" min={3} max={299} style={inputStyle} value={state.intervalMin} onChange={e => set({ intervalMin: parseInt(e.target.value) || 5 })}
                        onFocus={e => (e.currentTarget.style.borderColor = LIME)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                    </div>
                    <div style={{ color: '#333', textAlign: 'center', marginTop: 20 }}>–</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#444', marginBottom: 4 }}>Máximo</div>
                      <input type="number" min={4} max={600} style={inputStyle} value={state.intervalMax} onChange={e => set({ intervalMax: parseInt(e.target.value) || 15 })}
                        onFocus={e => (e.currentTarget.style.borderColor = LIME)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#3a3a3a', marginTop: 6 }}>Intervalo aleatório entre mensagens para evitar bloqueio do WhatsApp.</p>
                </div>
                <div>
                  <label style={labelStyle}>Agendar para <span style={{ color: '#444', fontSize: 10 }}>OPCIONAL</span></label>
                  <input type="datetime-local" style={inputStyle} value={state.scheduledFor} onChange={e => set({ scheduledFor: e.target.value })}
                    onFocus={e => (e.currentTarget.style.borderColor = LIME)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: Público ───────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Upload CSV */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `2px dashed ${state.importMode === 'upload' ? LIME : BORDER}`, borderRadius: 14, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: state.importMode === 'upload' ? `${LIME}08` : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = LIME)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = state.importMode === 'upload' ? LIME : BORDER)}
                >
                  <Upload style={{ width: 28, height: 28, color: state.importMode === 'upload' ? LIME : '#444', margin: '0 auto 10px' }} />
                  {state.importMode === 'upload' && state.contacts.length > 0 ? (
                    <div>
                      <div style={{ color: LIME, fontWeight: 700, fontSize: 16 }}>{state.contacts.length} contatos importados</div>
                      <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>Clique para substituir o arquivo</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: 'white', fontWeight: 600 }}>Upload CSV / TXT</div>
                      <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>Arraste ou clique • Colunas: <span style={{ color: '#888', fontFamily: 'Space Mono, monospace' }}>telefone, nome, ...</span></div>
                      <div style={{ color: '#3a3a3a', fontSize: 11, marginTop: 6 }}>Para Excel: Arquivo → Salvar como → CSV UTF-8</div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" style={{ display: 'none' }} onChange={handleFile} />
                </div>
                {fileError && (
                  <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} /> {fileError}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#333' }}>
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                  <span style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', color: '#444' }}>ou cole abaixo</span>
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                </div>

                <div>
                  <label style={labelStyle}>Lista de Números (um por linha • pode incluir nome após vírgula)</label>
                  <textarea
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 120, fontFamily: 'Space Mono, monospace', fontSize: 13 }}
                    placeholder={'5511999999999\n5521888888888, João Silva\n5531777777777, Maria'}
                    value={state.pasteText}
                    onChange={e => set({ pasteText: e.target.value })}
                    onFocus={e => (e.currentTarget.style.borderColor = LIME)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                  />
                  <button
                    onClick={handlePaste}
                    disabled={!state.pasteText.trim()}
                    style={{ marginTop: 8, padding: '8px 18px', borderRadius: 8, background: state.pasteText.trim() ? `${LIME}18` : '#111', border: `1px solid ${state.pasteText.trim() ? LIME : BORDER}`, color: state.pasteText.trim() ? LIME : '#444', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Importar lista
                  </button>
                </div>

                {state.contacts.length > 0 && state.importMode === 'paste' && (
                  <div style={{ background: `${LIME}0a`, border: `1px solid ${LIME}30`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle style={{ color: LIME, width: 18, height: 18 }} />
                    <span style={{ color: LIME, fontWeight: 600 }}>{state.contacts.length} contatos importados com sucesso</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Mensagem ──────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Templates */}
                <div>
                  <label style={labelStyle}>Templates</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {MSG_TEMPLATES.map(tpl => (
                      <button key={tpl.id} onClick={() => selectTemplate(tpl)}
                        style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, border: `1px solid ${state.templateId === tpl.id ? LIME : BORDER}`, background: state.templateId === tpl.id ? `${LIME}10` : '#111', color: state.templateId === tpl.id ? LIME : '#888', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {tpl.emoji} {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message editor */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, margin: 0 }}>Mensagem</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['{nome}', '{empresa}', '{produto}', '{data}', '{valor}'].map(v => (
                        <button key={v} onClick={() => set({ message: state.message + v })}
                          style={{ padding: '3px 8px', borderRadius: 6, background: '#1a1a1a', border: `1px solid ${BORDER}`, color: '#666', fontSize: 11, cursor: 'pointer', fontFamily: 'Space Mono, monospace' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.color = PURPLE; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = '#666'; }}
                        >{v}</button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={state.message}
                    onChange={e => set({ message: e.target.value, templateId: 'custom' })}
                    rows={5}
                    style={{ ...inputStyle, resize: 'vertical', fontSize: 14 }}
                    placeholder="Digite a mensagem que será enviada..."
                    onFocus={e => (e.currentTarget.style.borderColor = LIME)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                  />
                  <p style={{ fontSize: 11, color: '#3a3a3a', marginTop: 6 }}>Use {'{nome}'}, {'{empresa}'} etc. As variáveis serão substituídas pelos dados de cada contato da planilha.</p>
                </div>

                {/* Use as base toggle */}
                <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Modo Agente IA</div>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                      {state.useAsBase
                        ? 'O agente usará a mensagem como instrução e personalizará a abordagem para cada lead'
                        : 'A mensagem será enviada exatamente como está, sem modificação'}
                    </div>
                  </div>
                  <button onClick={() => set({ useAsBase: !state.useAsBase })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    {state.useAsBase
                      ? <ToggleRight style={{ width: 36, height: 36, color: LIME }} />
                      : <ToggleLeft style={{ width: 36, height: 36, color: '#444' }} />
                    }
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Revisar ───────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Summary cards */}
                {[
                  { icon: <FileText style={{ width: 16, height: 16 }} />, label: 'Campanha', value: state.name },
                  { icon: <Building2 style={{ width: 16, height: 16 }} />, label: 'Instância', value: instances?.find(i => i.id === state.instanceId)?.name || '—' },
                  { icon: <Bot style={{ width: 16, height: 16 }} />, label: 'Agente', value: agents?.find(a => a.id === state.agentId)?.name || 'Sem agente' },
                  { icon: <Users style={{ width: 16, height: 16 }} />, label: 'Contatos', value: `${state.contacts.length} números` },
                  { icon: <Clock style={{ width: 16, height: 16 }} />, label: 'Intervalo', value: `${state.intervalMin}–${state.intervalMax}s (estimativa: ~${Math.round((state.contacts.length * ((state.intervalMin + state.intervalMax) / 2)) / 60)} min)` },
                  { icon: <MessageSquare style={{ width: 16, height: 16 }} />, label: 'Modo', value: state.useAsBase ? '🤖 Agente IA personaliza a mensagem' : '📤 Envio direto (mensagem fixa)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: '#111', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <div style={{ color: '#555', flexShrink: 0, marginTop: 1 }}>{row.icon}</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#555', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</div>
                      <div style={{ color: 'white', fontSize: 14, marginTop: 2 }}>{row.value}</div>
                    </div>
                  </div>
                ))}

                {/* Message preview */}
                <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#555', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Preview da Mensagem</div>
                  <div style={{ fontSize: 14, color: '#ccc', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {state.message.replace(/\{nome\}/gi, state.contacts[0]?.name || 'João')}
                  </div>
                </div>

                {createMutation.isError && (
                  <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
                    Erro ao criar campanha. Verifique os dados e tente novamente.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 32px 28px', display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '12px 20px', borderRadius: 12, background: '#1a1a1a', border: `1px solid ${BORDER}`, color: '#888', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronLeft style={{ width: 16, height: 16 }} /> Voltar
            </button>
          )}
          <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: 12, background: '#1a1a1a', border: `1px solid ${BORDER}`, color: '#666', fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={step === STEPS.length - 1 ? submit : () => setStep(s => s + 1)}
            disabled={!canNext() || createMutation.isPending}
            style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: canNext() ? LIME : '#1a1a1a', color: canNext() ? '#000' : '#444', fontSize: 14, fontWeight: 700, cursor: canNext() ? 'pointer' : 'not-allowed', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: canNext() ? `0 0 24px ${LIME}40` : 'none', transition: 'all 0.2s' }}>
            {createMutation.isPending ? <LoadingSpinner /> : step === STEPS.length - 1 ? <><Zap style={{ width: 16, height: 16 }} /> Criar Campanha</> : <>Próximo <ChevronRight style={{ width: 16, height: 16 }} /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Discharges() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'dashboard' | 'campaigns'>('dashboard');
  const [showWizard, setShowWizard] = useState(false);
  const [instanceFilter, setInstanceFilter] = useState('');
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  const { data: instances } = useQuery({ queryKey: ['instances'], queryFn: instancesApi.findAll });
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns', instanceFilter],
    queryFn: () => campaignsApi.findAll(instanceFilter || undefined),
    refetchInterval: 10_000,
  });
  const { data: stats } = useQuery({
    queryKey: ['campaigns-stats', instanceFilter],
    queryFn: () => campaignsApi.getStats(instanceFilter || undefined),
    refetchInterval: 15_000,
  });
  const { data: allContacts, isLoading: loadingContacts } = useQuery({
    queryKey: ['campaigns-contacts', instanceFilter],
    queryFn: () => campaignsApi.getAllContacts(instanceFilter || undefined),
    refetchInterval: 15_000,
    enabled: tab === 'dashboard',
  });

  const triggerMutation = useMutation({
    mutationFn: campaignsApi.trigger,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: (e: any) => alert(e.response?.data?.error || 'Erro ao disparar campanha'),
  });

  const cancelMutation = useMutation({
    mutationFn: campaignsApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: campaignsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', padding: '0 0 48px' }}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'white', margin: 0 }}>Disparos</h1>
            <p style={{ color: '#555', fontSize: 13, marginTop: 4, fontFamily: 'Space Mono, monospace' }}>Campanhas em massa via WhatsApp</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: LIME, color: '#000', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: `0 0 24px ${LIME}40` }}>
            <Plus style={{ width: 18, height: 18 }} /> Nova Campanha
          </button>
        </div>

        {/* ── Instance filter ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setInstanceFilter('')} style={{ padding: '6px 14px', borderRadius: 8, background: !instanceFilter ? `${LIME}18` : '#111', border: `1px solid ${!instanceFilter ? LIME : BORDER}`, color: !instanceFilter ? LIME : '#666', fontSize: 13, cursor: 'pointer' }}>
            Todas
          </button>
          {(instances || []).map(inst => (
            <button key={inst.id} onClick={() => setInstanceFilter(inst.id)}
              style={{ padding: '6px 14px', borderRadius: 8, background: instanceFilter === inst.id ? `${LIME}18` : '#111', border: `1px solid ${instanceFilter === inst.id ? LIME : BORDER}`, color: instanceFilter === inst.id ? LIME : '#666', fontSize: 13, cursor: 'pointer' }}>
              {inst.name}
            </button>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#111', borderRadius: 12, padding: 4, width: 'fit-content', border: `1px solid ${BORDER}` }}>
          {[{ id: 'dashboard', label: 'Dashboard', icon: <BarChart2 style={{ width: 16, height: 16 }} /> }, { id: 'campaigns', label: 'Campanhas', icon: <List style={{ width: 16, height: 16 }} /> }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: tab === t.id ? `${LIME}15` : 'transparent', border: `1px solid ${tab === t.id ? LIME : 'transparent'}`, color: tab === t.id ? LIME : '#555', fontSize: 14, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard Tab ─────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <StatCard value={stats?.totalSent24h ?? '—'} label="Enviados 24h" color={LIME} icon={<Send style={{ width: 20, height: 20 }} />} />
              <StatCard value={stats?.deliveryRate != null ? `${stats.deliveryRate}%` : '—'} label="Taxa de Entrega" color="#34d399" icon={<CheckCircle style={{ width: 20, height: 20 }} />} />
              <StatCard value={stats?.activeCampaigns ?? '—'} label="Campanhas Ativas" color={PURPLE} icon={<Zap style={{ width: 20, height: 20 }} />} />
              <StatCard value={stats?.totalContacts ?? '—'} label="Total de Contatos" color="#60a5fa" icon={<Users style={{ width: 20, height: 20 }} />} />
            </div>

            {/* All contacts table */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone style={{ width: 16, height: 16, color: '#555' }} />
                <span style={{ color: 'white', fontWeight: 600 }}>Todos os Contatos</span>
                <span style={{ color: '#444', fontSize: 12, fontFamily: 'Space Mono, monospace' }}>({allContacts?.length ?? 0})</span>
                <button onClick={() => queryClient.invalidateQueries({ queryKey: ['campaigns-contacts'] })} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = LIME)} onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                  <RefreshCw style={{ width: 14, height: 14 }} />
                </button>
              </div>
              {loadingContacts ? (
                <div style={{ padding: 40, textAlign: 'center' }}><LoadingSpinner /></div>
              ) : !allContacts?.length ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Phone style={{ width: 40, height: 40, color: '#222', margin: '0 auto 12px' }} />
                  <p style={{ color: '#444' }}>Nenhum contato ainda. Crie uma campanha e importe seus leads.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {['Telefone', 'Nome', 'Campanha', 'Status', 'Enviado em'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#444', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', fontFamily: 'Space Mono, monospace', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allContacts.map((c: CampaignContact) => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}20` }} onMouseEnter={e => (e.currentTarget.style.background = '#ffffff05')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '11px 16px', color: '#ccc', fontFamily: 'Space Mono, monospace' }}>{c.phone}</td>
                          <td style={{ padding: '11px 16px', color: '#888' }}>{c.name || '—'}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <span style={{ color: PURPLE, fontSize: 12 }}>{c.campaign?.name || '—'}</span>
                          </td>
                          <td style={{ padding: '11px 16px' }}><StatusBadge status={c.status} type="contact" /></td>
                          <td style={{ padding: '11px 16px', color: '#555', fontSize: 12 }}>
                            {c.sentAt ? new Date(c.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Campaigns Tab ─────────────────────────────────────────── */}
        {tab === 'campaigns' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loadingCampaigns ? (
              <div style={{ padding: 64, textAlign: 'center' }}><LoadingSpinner /></div>
            ) : !campaigns?.length ? (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 64, textAlign: 'center' }}>
                <Zap style={{ width: 48, height: 48, color: '#1a1a1a', margin: '0 auto 16px' }} />
                <p style={{ color: '#555', marginBottom: 4 }}>Nenhuma campanha criada ainda.</p>
                <button onClick={() => setShowWizard(true)} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, background: `${LIME}18`, border: `1px solid ${LIME}50`, color: LIME, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                  Criar primeira campanha
                </button>
              </div>
            ) : (
              campaigns.map((c: Campaign) => {
                const total = c._count?.contacts || 0;
                const sent = c.contacts?.filter(x => x.status === 'SENT').length ?? c.totalSent;
                const failed = c.contacts?.filter(x => x.status === 'FAILED').length ?? c.totalFailed;
                const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
                const isExpanded = expandedCampaign === c.id;

                return (
                  <motion.div key={c.id} layout style={{ background: CARD, border: `1px solid ${c.status === 'RUNNING' ? `${LIME}40` : BORDER}`, borderRadius: 16, overflow: 'hidden', boxShadow: c.status === 'RUNNING' ? `0 0 20px ${LIME}10` : 'none' }}>
                    {/* Campaign header */}
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                          <StatusBadge status={c.status} type="campaign" />
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#555' }}>
                          <span><Building2 style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />{c.instance?.name || '—'}</span>
                          {c.agent && <span><Bot style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />{c.agent.name}</span>}
                          <span><Users style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />{total} contatos</span>
                          <span><Clock style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />{c.intervalMin}–{c.intervalMax}s</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {(c.status === 'RUNNING' || c.status === 'COMPLETED') && total > 0 && (
                        <div style={{ width: 140 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555', marginBottom: 4 }}>
                            <span>{sent}/{total}</span><span>{pct}%</span>
                          </div>
                          <div style={{ height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: LIME, borderRadius: 2, transition: 'width 0.5s' }} />
                          </div>
                          {failed > 0 && <div style={{ fontSize: 11, color: '#f87171', marginTop: 3 }}>{failed} falhas</div>}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {c.status === 'DRAFT' && (
                          <button onClick={() => triggerMutation.mutate(c.id)} disabled={triggerMutation.isPending}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: `${LIME}18`, border: `1px solid ${LIME}50`, color: LIME, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            <Play style={{ width: 14, height: 14 }} /> Disparar
                          </button>
                        )}
                        {c.status === 'RUNNING' && (
                          <button onClick={() => cancelMutation.mutate(c.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 13, cursor: 'pointer' }}>
                            <X style={{ width: 14, height: 14 }} /> Cancelar
                          </button>
                        )}
                        <button onClick={() => setExpandedCampaign(isExpanded ? null : c.id)}
                          style={{ padding: '7px 10px', borderRadius: 8, background: '#111', border: `1px solid ${BORDER}`, color: '#666', cursor: 'pointer' }}>
                          <Eye style={{ width: 14, height: 14 }} />
                        </button>
                        {['DRAFT', 'COMPLETED', 'FAILED'].includes(c.status) && (
                          <button onClick={() => { if (confirm('Deletar esta campanha?')) deleteMutation.mutate(c.id); }}
                            style={{ padding: '7px 10px', borderRadius: 8, background: '#111', border: `1px solid ${BORDER}`, color: '#555', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded: contacts list */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div key="contacts" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ borderTop: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                          <div style={{ padding: '14px 20px', maxHeight: 280, overflowY: 'auto' }}>
                            <div style={{ fontSize: 11, color: '#444', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                              Contatos ({c.contacts?.length ?? total})
                            </div>
                            {(c.contacts || []).slice(0, 50).map(contact => (
                              <div key={contact.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}20` }}>
                                <Phone style={{ width: 12, height: 12, color: '#444', flexShrink: 0 }} />
                                <span style={{ color: '#aaa', fontSize: 13, fontFamily: 'Space Mono, monospace', flex: 1 }}>{contact.phone}</span>
                                {contact.name && <span style={{ color: '#666', fontSize: 12 }}>{contact.name}</span>}
                                <StatusBadge status={contact.status} type="contact" />
                              </div>
                            ))}
                            {(c.contacts?.length ?? 0) > 50 && (
                              <p style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>
                                + {(c.contacts?.length ?? 0) - 50} contatos não exibidos
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Wizard ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWizard && (
          <CampaignWizard
            onClose={() => setShowWizard(false)}
            onSuccess={() => { setShowWizard(false); setTab('campaigns'); }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

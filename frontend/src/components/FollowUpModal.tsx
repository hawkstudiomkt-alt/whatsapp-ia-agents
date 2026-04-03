import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, Star, Plus, Trash2, Save,
  Stethoscope, Ticket, ShoppingCart, Home, GraduationCap,
  Zap, Wand2, BookOpen, ChevronRight, Check,
} from 'lucide-react';
import { Button, LoadingSpinner } from './ui';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FollowUpTemplateItem {
  id: string;
  emoji: string;
  label: string;
  type: 'NO_RESPONSE' | 'REMINDER' | 'CUSTOM';
  note: string;
  defaultDays?: number;
  defaultHours?: number;
  timing?: 'after' | 'before';
  variables?: string[];
}

export interface FollowUpNiche {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: any }>;
  accentColor: string;
  templates: FollowUpTemplateItem[];
}

// ─── Biblioteca de Templates por Nicho ───────────────────────────────────────

export const NICHES: FollowUpNiche[] = [
  {
    id: 'generic',
    label: 'Genérico',
    icon: Zap,
    accentColor: '#B6FF00',
    templates: [
      {
        id: 'no_response_24h',
        emoji: '📭',
        label: 'Sem resposta (24h)',
        type: 'NO_RESPONSE',
        defaultDays: 1,
        timing: 'after',
        note: 'O cliente não respondeu. Retome o contato com gentileza, pergunte se ainda tem interesse e se pode ajudar com algo. Seja breve e direto.',
      },
      {
        id: 'no_response_3d',
        emoji: '📬',
        label: 'Sem resposta (3 dias)',
        type: 'NO_RESPONSE',
        defaultDays: 3,
        timing: 'after',
        note: 'Faz 3 dias sem retorno. Tente uma abordagem diferente — destaque um benefício novo ou uma novidade. Evite repetir o que já foi dito.',
      },
      {
        id: 'proposal_pending',
        emoji: '📋',
        label: 'Proposta pendente',
        type: 'REMINDER',
        defaultDays: 2,
        timing: 'after',
        note: 'O cliente recebeu a proposta mas não retornou. Pergunte se teve dúvidas, se precisa de mais informações ou se quer ajustar algo.',
      },
      {
        id: 'reactivation',
        emoji: '🔥',
        label: 'Reativação de lead frio',
        type: 'CUSTOM',
        defaultDays: 7,
        timing: 'after',
        note: 'Lead inativo há bastante tempo. Apresente uma novidade, promoção, depoimento ou conteúdo de valor para reengajar. Não mencione que ficou muito tempo sem resposta.',
      },
      {
        id: 'post_purchase',
        emoji: '🎉',
        label: 'Pós-compra / conversão',
        type: 'REMINDER',
        defaultDays: 3,
        timing: 'after',
        note: 'Verifique a satisfação do cliente com a compra ou serviço. Agradeça, ofereça suporte se necessário e abra caminho para novas oportunidades ou indicações.',
      },
    ],
  },
  {
    id: 'clinica',
    label: 'Clínicas',
    icon: Stethoscope,
    accentColor: '#22d3ee',
    templates: [
      {
        id: 'consulta_d1',
        emoji: '📅',
        label: 'Lembrete de consulta (1 dia antes)',
        type: 'REMINDER',
        defaultDays: 1,
        defaultHours: 0,
        timing: 'before',
        variables: ['{nome}', '{data_consulta}', '{hora_consulta}', '{medico}', '{endereco}'],
        note: 'Lembre o paciente da consulta amanhã. Informe o horário, o médico/profissional e o endereço. Pergunte se ele confirma a presença. Tom acolhedor e profissional.\n\nVariáveis disponíveis: {nome}, {data_consulta}, {hora_consulta}',
      },
      {
        id: 'consulta_3h',
        emoji: '⏰',
        label: 'Confirmação de presença (3h antes)',
        type: 'REMINDER',
        defaultDays: 0,
        defaultHours: 3,
        timing: 'before',
        variables: ['{nome}', '{hora_consulta}', '{medico}'],
        note: 'Lembre o paciente que a consulta é em 3 horas. Confirme a presença de forma rápida e gentil. Se não confirmar, oriente como reagendar.',
      },
      {
        id: 'pos_consulta',
        emoji: '✅',
        label: 'Pós-consulta (feedback)',
        type: 'CUSTOM',
        defaultDays: 1,
        timing: 'after',
        note: 'Pergunte como o paciente está se sentindo após a consulta. Verifique se ficou com dúvidas sobre a orientação médica. Ofereça suporte e, se pertinente, incentive o retorno ou exame.',
      },
      {
        id: 'reagendamento_falta',
        emoji: '📆',
        label: 'Reagendamento (não compareceu)',
        type: 'CUSTOM',
        defaultHours: 2,
        timing: 'after',
        note: 'O paciente não compareceu à consulta. Entre em contato de forma compreensiva, sem cobrar ou julgar. Ofereça uma nova data disponível para reagendamento. Seja empático.',
      },
      {
        id: 'resultado_exame',
        emoji: '🔬',
        label: 'Resultado de exame disponível',
        type: 'REMINDER',
        defaultDays: 1,
        timing: 'after',
        note: 'Informe que o resultado do exame está disponível. Oriente como acessá-lo (sistema, presencialmente, etc.) e, se necessário, sugira agendar uma consulta de retorno para interpretação.',
      },
      {
        id: 'retorno_preventivo',
        emoji: '🩺',
        label: 'Retorno preventivo (6 meses)',
        type: 'REMINDER',
        defaultDays: 180,
        timing: 'after',
        note: 'Lembre o paciente que é hora do retorno/check-up semestral. Destaque a importância da prevenção. Ofereça link ou contato para agendamento.',
      },
    ],
  },
  {
    id: 'eventos',
    label: 'Eventos',
    icon: Ticket,
    accentColor: '#f59e0b',
    templates: [
      {
        id: 'evento_d1',
        emoji: '🎫',
        label: 'Lembrete do evento (D-1)',
        type: 'REMINDER',
        defaultDays: 1,
        timing: 'before',
        variables: ['{nome}', '{nome_evento}', '{data_evento}', '{hora_evento}', '{local_evento}'],
        note: 'Lembre o participante que o evento é amanhã. Informe horário, local, o que levar e como chegar. Tom entusiasmado e acolhedor. Gere expectativa positiva.\n\nVariáveis: {nome}, {nome_evento}, {data_evento}, {hora_evento}, {local_evento}',
      },
      {
        id: 'evento_3h',
        emoji: '⚡',
        label: 'Informações práticas (3h antes)',
        type: 'REMINDER',
        defaultHours: 3,
        timing: 'before',
        note: 'Envie informações práticas de última hora: entrada, estacionamento, dress code, o que não pode entrar. Seja objetivo. Gere entusiasmo para o evento.',
      },
      {
        id: 'ingresso_pendente',
        emoji: '🎟️',
        label: 'Ingresso não comprado ainda',
        type: 'CUSTOM',
        defaultDays: 2,
        timing: 'after',
        note: 'O lead demonstrou interesse mas não finalizou a compra do ingresso. Destaque o que ele está perdendo, mencione a proximidade de esgotamento e ofereça o link de compra. Sem pressão excessiva.',
      },
      {
        id: 'pos_evento',
        emoji: '🌟',
        label: 'Pós-evento (feedback + próximo)',
        type: 'CUSTOM',
        defaultDays: 1,
        timing: 'after',
        note: 'Agradeça a presença, peça um feedback rápido e apresente o próximo evento ou produto relacionado. Tom caloroso, como um amigo que quer saber se gostou.',
      },
      {
        id: 'upgrade_vip',
        emoji: '💎',
        label: 'Oferta de upgrade VIP',
        type: 'CUSTOM',
        defaultDays: 3,
        timing: 'after',
        note: 'Ofereça um upgrade de ingresso (VIP, camarote, meet&greet). Destaque os benefícios exclusivos e, se houver, desconto por tempo limitado. Tom especial, como uma oferta exclusiva só para ele.',
      },
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    icon: ShoppingCart,
    accentColor: '#10b981',
    templates: [
      {
        id: 'carrinho_1h',
        emoji: '🛒',
        label: 'Carrinho abandonado (1h)',
        type: 'CUSTOM',
        defaultHours: 1,
        timing: 'after',
        note: 'O cliente adicionou ao carrinho mas não comprou. Retome o contato de forma leve — pergunte se teve alguma dúvida ou dificuldade. Não force a venda. Ofereça ajuda.',
      },
      {
        id: 'carrinho_24h',
        emoji: '🛍️',
        label: 'Carrinho abandonado (24h)',
        type: 'CUSTOM',
        defaultDays: 1,
        timing: 'after',
        note: 'Segunda tentativa de recuperação de carrinho. Desta vez, destaque um benefício (frete grátis, desconto, garantia). Crie senso de urgência sutil se o produto tiver estoque limitado.',
      },
      {
        id: 'pos_compra',
        emoji: '📦',
        label: 'Pós-compra (satisfação)',
        type: 'REMINDER',
        defaultDays: 5,
        timing: 'after',
        note: 'Pergunte se o produto chegou bem e se o cliente está satisfeito. Ofereça suporte se houver qualquer problema. Tom de cuidado genuíno. Abra espaço para indicações ou nova compra.',
      },
      {
        id: 'estoque_favorito',
        emoji: '🔔',
        label: 'Produto de volta ao estoque',
        type: 'CUSTOM',
        defaultDays: 1,
        timing: 'after',
        note: 'Informe que o produto que o cliente tinha interesse voltou ao estoque. Crie urgência sutilmente (pode esgotar novamente). Facilite o acesso com link direto.',
      },
      {
        id: 'oferta_fidelidade',
        emoji: '🎁',
        label: 'Oferta de fidelidade (cliente frio)',
        type: 'CUSTOM',
        defaultDays: 30,
        timing: 'after',
        note: 'Cliente que não compra há um tempo. Ofereça algo especial: cupom exclusivo, acesso antecipado a lançamento, brinde. Apresente como reconhecimento pela fidelidade, não como desespero de venda.',
      },
    ],
  },
  {
    id: 'imobiliaria',
    label: 'Imobiliária',
    icon: Home,
    accentColor: '#f97316',
    templates: [
      {
        id: 'visita_d1',
        emoji: '🏠',
        label: 'Lembrete de visita (D-1)',
        type: 'REMINDER',
        defaultDays: 1,
        timing: 'before',
        note: 'Lembre o cliente da visita ao imóvel amanhã. Confirme horário, endereço e ponto de encontro com o corretor. Crie expectativa positiva sobre o imóvel. Peça confirmação de presença.',
      },
      {
        id: 'pos_visita',
        emoji: '🔑',
        label: 'Follow-up pós-visita',
        type: 'CUSTOM',
        defaultHours: 4,
        timing: 'after',
        note: 'Pergunte o que achou do imóvel. Se gostou, avance para proposta ou financiamento. Se não gostou, descubra o que faltou e apresente outras opções. Tom consultivo, não de vendedor.',
      },
      {
        id: 'proposta_imovel',
        emoji: '📄',
        label: 'Proposta aguardando aprovação',
        type: 'REMINDER',
        defaultDays: 3,
        timing: 'after',
        note: 'A proposta foi enviada mas não houve resposta. Pergunte se surgiu alguma dúvida sobre valores, documentação ou financiamento. Deixe claro que pode ajustar conforme necessário.',
      },
      {
        id: 'nova_captacao',
        emoji: '✨',
        label: 'Nova captação no perfil do cliente',
        type: 'CUSTOM',
        defaultDays: 7,
        timing: 'after',
        note: 'Um novo imóvel foi captado que combina com o perfil do cliente (localização, valores, tamanho). Apresente como exclusividade, antes de anunciar publicamente. Ofereça visita prioritária.',
      },
    ],
  },
  {
    id: 'educacao',
    label: 'Educação',
    icon: GraduationCap,
    accentColor: '#8b5cf6',
    templates: [
      {
        id: 'aula_d1',
        emoji: '📚',
        label: 'Lembrete de aula (D-1)',
        type: 'REMINDER',
        defaultDays: 1,
        timing: 'before',
        note: 'Lembre o aluno da aula amanhã. Informe horário, plataforma/sala e o tema que será abordado. Gere entusiasmo para o conteúdo. Incentive a preparação (ler material, etc.).',
      },
      {
        id: 'pos_modulo',
        emoji: '🏆',
        label: 'Pós-módulo (feedback)',
        type: 'CUSTOM',
        defaultDays: 2,
        timing: 'after',
        note: 'Pergunte o que o aluno achou do módulo, se ficou com dúvidas, o que mais gostou. Incentive a prática do conteúdo e crie antecipação pelo próximo módulo. Tom de coach, não de professor.',
      },
      {
        id: 'matricula_encerrando',
        emoji: '⏳',
        label: 'Prazo de matrícula encerrando',
        type: 'CUSTOM',
        defaultDays: 3,
        timing: 'before',
        note: 'Avise que as matrículas para o curso encerram em breve. Destaque o que o lead vai ganhar com o curso, quem já está matriculado (prova social) e como garantir a vaga agora.',
      },
      {
        id: 'material_disponivel',
        emoji: '📂',
        label: 'Material do módulo disponível',
        type: 'REMINDER',
        defaultDays: 1,
        timing: 'after',
        note: 'Informe que o material complementar, exercícios ou gravação da aula estão disponíveis na plataforma. Inclua o link de acesso e incentive o aluno a estudar enquanto o conteúdo está fresco.',
      },
    ],
  },
  {
    id: 'custom',
    label: 'Personalizados',
    icon: Wand2,
    accentColor: '#7D53FF',
    templates: [],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface FollowUpModalProps {
  leadName: string;
  leadPhone: string;
  onClose: () => void;
  onConfirm: (data: {
    type: string;
    scheduledFor: string;
    notes: string;
  }) => void;
  isPending?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FollowUpModal({ leadName, leadPhone, onClose, onConfirm, isPending }: FollowUpModalProps) {
  const displayName = leadName || leadPhone;

  // Step: 'niche' | 'template' | 'configure'
  const [step, setStep] = useState<'niche' | 'template' | 'configure'>('niche');
  const [selectedNiche, setSelectedNiche] = useState<FollowUpNiche | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FollowUpTemplateItem | null>(null);

  // Configuration
  const [note, setNote]               = useState('');
  const [amount, setAmount]           = useState(1);
  const [unit, setUnit]               = useState<'hours' | 'days'>('days');
  const [direction, setDirection]     = useState<'after' | 'before'>('after');

  // Custom template saving
  const [savingName, setSavingName]   = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Custom templates from localStorage
  const [customTemplates, setCustomTemplates] = useState<FollowUpTemplateItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('rattixFollowUpTemplates') || '[]'); }
    catch { return []; }
  });

  const saveCustomTemplate = () => {
    if (!savingName.trim() || !note.trim()) return;
    const newTpl: FollowUpTemplateItem = {
      id: `custom_${Date.now()}`,
      emoji: '⭐',
      label: savingName.trim(),
      type: 'CUSTOM',
      note,
      defaultDays: unit === 'days' ? amount : undefined,
      defaultHours: unit === 'hours' ? amount : undefined,
      timing: direction,
    };
    const updated = [...customTemplates, newTpl];
    setCustomTemplates(updated);
    localStorage.setItem('rattixFollowUpTemplates', JSON.stringify(updated));
    setSavingName('');
    setShowSaveForm(false);
  };

  const deleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('rattixFollowUpTemplates', JSON.stringify(updated));
  };

  const selectTemplate = (tpl: FollowUpTemplateItem) => {
    setSelectedTemplate(tpl);
    setNote(tpl.note);
    if (tpl.defaultHours && tpl.defaultHours > 0) {
      setUnit('hours');
      setAmount(tpl.defaultHours);
    } else {
      setUnit('days');
      setAmount(tpl.defaultDays || 1);
    }
    setDirection(tpl.timing || 'after');
    setStep('configure');
  };

  const handleConfirm = () => {
    const date = new Date();
    const totalMs = unit === 'hours' ? amount * 3600000 : amount * 86400000;
    if (direction === 'before') {
      date.setTime(date.getTime() - totalMs);
    } else {
      date.setTime(date.getTime() + totalMs);
    }
    onConfirm({
      type: selectedTemplate?.type || 'CUSTOM',
      scheduledFor: date.toISOString(),
      notes: note,
    });
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.82)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: step === 'niche' ? '680px' : step === 'template' ? '780px' : '580px',
    maxHeight: '88vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const inputCls: React.CSSProperties = {
    width: '100%', background: '#060606',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '10px 14px',
    fontSize: '13px', color: '#f0f0f0', outline: 'none',
    fontFamily: 'Space Grotesk, sans-serif',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={overlayStyle}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        style={modalStyle}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '16px', margin: 0 }}>
                {step === 'niche' && '📅 Novo Follow-up'}
                {step === 'template' && `Templates — ${selectedNiche?.label}`}
                {step === 'configure' && `Configurar Follow-up`}
              </h2>
              <p style={{ color: '#555', fontFamily: 'Space Mono, monospace', fontSize: '11px', margin: '4px 0 0' }}>
                {displayName}
              </p>
            </div>
            <button onClick={onClose} style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Breadcrumb */}
          {step !== 'niche' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
              <button
                onClick={() => setStep('niche')}
                style={{ fontSize: '11px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Mono, monospace', padding: 0 }}
              >
                Nicho
              </button>
              <ChevronRight size={12} style={{ color: '#333' }} />
              {step === 'configure' && (
                <>
                  <button
                    onClick={() => setStep('template')}
                    style={{ fontSize: '11px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Mono, monospace', padding: 0 }}
                  >
                    Templates
                  </button>
                  <ChevronRight size={12} style={{ color: '#333' }} />
                </>
              )}
              <span style={{ fontSize: '11px', color: '#B6FF00', fontFamily: 'Space Mono, monospace' }}>
                {step === 'template' ? 'Templates' : 'Configurar'}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── Step 1: Niche ── */}
          {step === 'niche' && (
            <div>
              <p style={{ color: '#555', fontSize: '12px', fontFamily: 'Space Mono, monospace', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Escolha o segmento do negócio
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {NICHES.map(niche => {
                  const Icon = niche.icon;
                  const isCustom = niche.id === 'custom';
                  const count = isCustom ? customTemplates.length : niche.templates.length;
                  return (
                    <button
                      key={niche.id}
                      onClick={() => { setSelectedNiche(niche); setStep('template'); }}
                      style={{
                        background: `${niche.accentColor}08`,
                        border: `1px solid ${niche.accentColor}18`,
                        borderRadius: '16px',
                        padding: '20px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.border = `1px solid ${niche.accentColor}40`)}
                      onMouseLeave={e => (e.currentTarget.style.border = `1px solid ${niche.accentColor}18`)}
                    >
                      <Icon className="w-6 h-6" style={{ color: niche.accentColor, marginBottom: '10px' }} />
                      <p style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>
                        {niche.label}
                      </p>
                      <p style={{ color: '#555', fontFamily: 'Space Mono, monospace', fontSize: '10px', margin: 0 }}>
                        {count} template{count !== 1 ? 's' : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Templates ── */}
          {step === 'template' && selectedNiche && (
            <div>
              {selectedNiche.id === 'custom' ? (
                <>
                  {customTemplates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Wand2 size={36} style={{ color: '#333', margin: '0 auto 12px' }} />
                      <p style={{ color: '#444', fontFamily: 'Space Mono, monospace', fontSize: '12px' }}>
                        Nenhum template personalizado ainda
                      </p>
                      <p style={{ color: '#333', fontFamily: 'Space Mono, monospace', fontSize: '11px', marginTop: '6px' }}>
                        Crie um template a partir de qualquer nicho e salve aqui
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {customTemplates.map(tpl => (
                        <div key={tpl.id} style={{ position: 'relative', display: 'group' }}>
                          <button
                            onClick={() => selectTemplate(tpl)}
                            style={{
                              width: '100%', textAlign: 'left',
                              background: 'rgba(125,83,255,0.05)',
                              border: '1px solid rgba(125,83,255,0.15)',
                              borderRadius: '14px', padding: '14px 16px',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '20px' }}>{tpl.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '13px', margin: 0 }}>{tpl.label}</p>
                                <p style={{ color: '#555', fontFamily: 'Space Mono, monospace', fontSize: '10px', margin: '3px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {tpl.note}
                                </p>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); deleteCustomTemplate(tpl.id); }}
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '4px', cursor: 'pointer', color: '#ef4444' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedNiche.templates.map((tpl, i) => (
                    <motion.button
                      key={tpl.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => selectTemplate(tpl)}
                      style={{
                        width: '100%', textAlign: 'left',
                        background: `${selectedNiche.accentColor}06`,
                        border: `1px solid ${selectedNiche.accentColor}15`,
                        borderRadius: '14px', padding: '14px 16px',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.border = `1px solid ${selectedNiche.accentColor}35`)}
                      onMouseLeave={e => (e.currentTarget.style.border = `1px solid ${selectedNiche.accentColor}15`)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '2px' }}>{tpl.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <p style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '13px', margin: 0 }}>
                              {tpl.label}
                            </p>
                            {(tpl.defaultHours || tpl.defaultDays) && (
                              <span style={{
                                background: `${selectedNiche.accentColor}12`,
                                color: selectedNiche.accentColor,
                                fontFamily: 'Space Mono, monospace',
                                fontSize: '10px', padding: '2px 8px',
                                borderRadius: '6px',
                                border: `1px solid ${selectedNiche.accentColor}25`,
                              }}>
                                {tpl.defaultHours && tpl.defaultHours > 0
                                  ? `${tpl.defaultHours}h ${tpl.timing === 'before' ? 'antes' : 'depois'}`
                                  : `${tpl.defaultDays}d ${tpl.timing === 'before' ? 'antes' : 'depois'}`
                                }
                              </span>
                            )}
                          </div>
                          <p style={{ color: '#666', fontFamily: 'Space Mono, monospace', fontSize: '11px', margin: 0, lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {tpl.note}
                          </p>
                          {tpl.variables && tpl.variables.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {tpl.variables.map(v => (
                                <span key={v} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: '#444', fontFamily: 'Space Mono, monospace' }}>
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={16} style={{ color: '#555', marginTop: '4px', flexShrink: 0 }} />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Blank custom */}
              {selectedNiche.id !== 'custom' && (
                <button
                  onClick={() => selectTemplate({ id: 'blank', emoji: '✏️', label: 'Em branco (escrever do zero)', type: 'CUSTOM', note: '' })}
                  style={{
                    width: '100%', marginTop: '10px', textAlign: 'left',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '14px', padding: '12px 16px',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                >
                  <Plus size={16} style={{ color: '#555' }} />
                  <span style={{ color: '#555', fontFamily: 'Space Mono, monospace', fontSize: '12px' }}>
                    Criar do zero
                  </span>
                </button>
              )}
            </div>
          )}

          {/* ── Step 3: Configure ── */}
          {step === 'configure' && selectedTemplate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Template badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: `${selectedNiche?.accentColor || '#B6FF00'}08`, border: `1px solid ${selectedNiche?.accentColor || '#B6FF00'}18`, borderRadius: '12px' }}>
                <span style={{ fontSize: '20px' }}>{selectedTemplate.emoji}</span>
                <p style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '13px', margin: 0 }}>{selectedTemplate.label}</p>
              </div>

              {/* Instrução para a IA */}
              <div>
                <label style={{ display: 'block', color: '#555', fontFamily: 'Space Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Instrução para o AgentR
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={5}
                  style={{ ...inputCls, resize: 'none', lineHeight: '1.6' }}
                  placeholder="Descreva como o agente deve abordar o lead neste follow-up..."
                />
                <p style={{ color: '#333', fontFamily: 'Space Mono, monospace', fontSize: '10px', marginTop: '6px' }}>
                  O AgentR usa isso como guia — não copia literalmente, adapta ao contexto do lead.
                </p>
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ color: '#444', fontFamily: 'Space Mono, monospace', fontSize: '10px', marginRight: '4px' }}>Variáveis:</span>
                    {selectedTemplate.variables.map(v => (
                      <button
                        key={v}
                        onClick={() => setNote(prev => prev + ' ' + v)}
                        style={{ background: 'rgba(182,255,0,0.06)', border: '1px solid rgba(182,255,0,0.15)', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', color: '#B6FF00', fontFamily: 'Space Mono, monospace', cursor: 'pointer' }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Agendamento */}
              <div>
                <label style={{ display: 'block', color: '#555', fontFamily: 'Space Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Quando enviar?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {/* Direção */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#444', fontFamily: 'Space Mono, monospace', fontSize: '10px' }}>Timing</span>
                    {(['after', 'before'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDirection(d)}
                        style={{
                          padding: '8px 12px', borderRadius: '10px', fontSize: '12px',
                          fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer', border: '1px solid',
                          ...(direction === d
                            ? { background: 'rgba(182,255,0,0.1)', borderColor: 'rgba(182,255,0,0.3)', color: '#B6FF00' }
                            : { background: '#060606', borderColor: 'rgba(255,255,255,0.06)', color: '#555' }
                          )
                        }}
                      >
                        {d === 'after' ? '⏭ Depois de' : '⏮ Antes de'}
                      </button>
                    ))}
                  </div>

                  {/* Quantidade */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#444', fontFamily: 'Space Mono, monospace', fontSize: '10px' }}>Quantidade</span>
                    <input
                      type="number" min={1} max={365} value={amount}
                      onChange={e => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ ...inputCls, fontSize: '20px', fontWeight: 700, color: '#B6FF00', textAlign: 'center', fontFamily: 'Space Mono, monospace' }}
                    />
                  </div>

                  {/* Unidade */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#444', fontFamily: 'Space Mono, monospace', fontSize: '10px' }}>Unidade</span>
                    {(['hours', 'days'] as const).map(u => (
                      <button
                        key={u}
                        onClick={() => setUnit(u)}
                        style={{
                          padding: '8px 12px', borderRadius: '10px', fontSize: '12px',
                          fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer', border: '1px solid',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          ...(unit === u
                            ? { background: 'rgba(182,255,0,0.1)', borderColor: 'rgba(182,255,0,0.3)', color: '#B6FF00' }
                            : { background: '#060606', borderColor: 'rgba(255,255,255,0.06)', color: '#555' }
                          )
                        }}
                      >
                        {u === 'hours' ? <><Clock size={12} /> Horas</> : <><Calendar size={12} /> Dias</>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(182,255,0,0.04)', border: '1px solid rgba(182,255,0,0.1)', borderRadius: '10px' }}>
                  <p style={{ color: '#B6FF00', fontFamily: 'Space Mono, monospace', fontSize: '11px', margin: 0 }}>
                    ⏰ Enviar em {amount} {unit === 'hours' ? `hora${amount !== 1 ? 's' : ''}` : `dia${amount !== 1 ? 's' : ''}`} {direction === 'after' ? 'a partir de agora' : 'antes do evento'}
                  </p>
                </div>
              </div>

              {/* Salvar como template */}
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#7D53FF', fontFamily: 'Space Mono, monospace', fontSize: '11px', padding: 0 }}
                >
                  <Star size={12} /> Salvar como template personalizado
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(125,83,255,0.06)', border: '1px solid rgba(125,83,255,0.15)', borderRadius: '12px' }}>
                  <input
                    type="text"
                    value={savingName}
                    onChange={e => setSavingName(e.target.value)}
                    placeholder="Nome do template..."
                    style={{ ...inputCls, flex: 1 }}
                    autoFocus
                  />
                  <button
                    onClick={saveCustomTemplate}
                    style={{ background: '#7D53FF', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Space Grotesk, sans-serif', whiteSpace: 'nowrap' }}
                  >
                    <Save size={12} /> Salvar
                  </button>
                  <button
                    onClick={() => setShowSaveForm(false)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px', color: '#555', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
          <button
            onClick={step === 'niche' ? onClose : () => setStep(step === 'configure' ? 'template' : 'niche')}
            style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#888', fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', cursor: 'pointer' }}
          >
            {step === 'niche' ? 'Cancelar' : '← Voltar'}
          </button>

          {step === 'configure' && (
            <button
              onClick={handleConfirm}
              disabled={isPending || !note.trim()}
              style={{
                flex: 2, padding: '11px', borderRadius: '12px',
                background: isPending || !note.trim() ? 'rgba(182,255,0,0.4)' : '#B6FF00',
                border: 'none', color: '#000',
                fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: 700,
                cursor: isPending || !note.trim() ? 'not-allowed' : 'pointer',
                boxShadow: !isPending && note.trim() ? '0 0 20px rgba(182,255,0,0.25)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {isPending ? <LoadingSpinner /> : <><Calendar size={14} /> Confirmar Agendamento</>}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

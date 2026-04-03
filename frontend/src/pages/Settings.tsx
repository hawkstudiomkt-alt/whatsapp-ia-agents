import React, { useState, useEffect } from 'react';
import {
  Calendar, Trash2, Save, Globe, Settings as SettingsIcon,
  Bell, Smartphone, ChevronDown, CheckCircle
} from 'lucide-react';
import { instancesApi, integrationsApi, Instance, Integration } from '../lib/api';
import { Card, Button, Badge, LoadingSpinner } from '../components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

const inputCls = `
  w-full bg-[#060606] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[#f0f0f0]
  outline-none transition-colors font-[Space_Grotesk,sans-serif]
  focus:border-[rgba(182,255,0,0.4)]
`;

function SectionCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  isConnected,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  isConnected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: iconBg }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: '#f0f0f0' }}>{title}</h3>
            <p className="text-xs mt-0.5" style={{ color: '#555' }}>{subtitle}</p>
          </div>
        </div>
        {isConnected !== undefined && (
          <Badge variant={isConnected ? 'success' : 'neutral'}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
        )}
      </div>
      {children}
    </Card>
  );
}

export default function Settings() {
  const queryClient                         = useQueryClient();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [notionConfig, setNotionConfig]     = useState({ apiKey: '', databaseId: '' });
  const [googleConfig, setGoogleConfig]     = useState({ credentials: '' });
  const [adminPhone, setAdminPhone]         = useState('');
  const [savedFeedback, setSavedFeedback]   = useState('');

  const { data: instances, isLoading: isInstancesLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: instancesApi.findAll,
  });

  const { data: integrations } = useQuery({
    queryKey: ['integrations', selectedInstanceId],
    queryFn: () => integrationsApi.findByInstance(selectedInstanceId),
    enabled: !!selectedInstanceId,
  });

  useEffect(() => {
    if (instances && instances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(instances[0].id);
    }
    if (selectedInstanceId && instances) {
      const inst = instances.find(i => i.id === selectedInstanceId);
      if (inst) setAdminPhone(inst.adminPhone || '');
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    if (integrations) {
      const notion = integrations.find(i => i.type === 'NOTION');
      const google = integrations.find(i => i.type === 'GOOGLE_CALENDAR');
      if (notion) setNotionConfig(notion.config);
      else setNotionConfig({ apiKey: '', databaseId: '' });
      if (google) setGoogleConfig({ credentials: typeof google.config.credentials === 'object' ? JSON.stringify(google.config.credentials, null, 2) : google.config.credentials });
      else setGoogleConfig({ credentials: '' });
    }
  }, [integrations]);

  const showFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(''), 3000);
  };

  const upsertMutation = useMutation({
    mutationFn: integrationsApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedInstanceId] });
      showFeedback('Configuração salva!');
    },
    onError: () => showFeedback('Erro ao salvar.'),
  });

  const updateInstanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Instance> }) => instancesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      showFeedback('Telefone salvo!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type }: { type: string }) => integrationsApi.delete(selectedInstanceId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedInstanceId] });
      showFeedback('Integração removida.');
    },
  });

  const handleSaveNotion = () => {
    upsertMutation.mutate({ instanceId: selectedInstanceId, type: 'NOTION', config: notionConfig, isActive: true });
  };

  const handleSaveGoogle = () => {
    let creds: any = googleConfig.credentials;
    try {
      if (typeof creds === 'string' && creds.trim().startsWith('{')) creds = JSON.parse(creds);
    } catch { showFeedback('JSON inválido'); return; }
    upsertMutation.mutate({ instanceId: selectedInstanceId, type: 'GOOGLE_CALENDAR', config: { credentials: creds }, isActive: true });
  };

  const handleSaveAdmin = () => {
    updateInstanceMutation.mutate({ id: selectedInstanceId, data: { adminPhone } as any });
  };

  if (isInstancesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!instances || instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <SettingsIcon className="w-7 h-7" style={{ color: '#555' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#f0f0f0' }}>Nenhuma Instância</h2>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Crie uma instância para configurar as integrações.</p>
        </div>
        <Button onClick={() => (window.location.href = '/instances')}>
          Ir para Instâncias
        </Button>
      </div>
    );
  }

  const notionConnected  = integrations?.some(i => i.type === 'NOTION' && i.isActive)           || false;
  const googleConnected  = integrations?.some(i => i.type === 'GOOGLE_CALENDAR' && i.isActive)  || false;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Ajustes
          </h1>
          <p className="text-sm mt-1 font-mono-rattix" style={{ color: '#555' }}>
            Integrações e notificações por instância
          </p>
        </div>

        {/* Saved feedback */}
        {savedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(182,255,0,0.1)', border: '1px solid rgba(182,255,0,0.2)', color: '#B6FF00' }}
          >
            <CheckCircle className="w-4 h-4" />
            {savedFeedback}
          </motion.div>
        )}
      </div>

      {/* Instance selector */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <SettingsIcon className="w-4 h-4 shrink-0" style={{ color: '#555' }} />
        <span className="text-xs font-mono-rattix shrink-0" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Instância
        </span>
        <div className="relative flex-1 max-w-xs">
          <select
            value={selectedInstanceId}
            onChange={e => setSelectedInstanceId(e.target.value)}
            className="w-full appearance-none bg-transparent text-sm outline-none pr-6"
            style={{ color: '#f0f0f0', cursor: 'pointer' }}
          >
            {instances.map(inst => (
              <option key={inst.id} value={inst.id} style={{ background: '#141414' }}>
                {inst.name} ({inst.phoneNumber})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#555' }} />
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Notion */}
        <SectionCard
          icon={Globe}
          iconColor="#7D53FF"
          iconBg="rgba(125,83,255,0.1)"
          title="Notion CRM"
          subtitle="Sincronização de leads em tempo real"
          isConnected={notionConnected}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Integration Token
              </label>
              <input
                type="password"
                value={notionConfig.apiKey}
                onChange={e => setNotionConfig({ ...notionConfig, apiKey: e.target.value })}
                placeholder="secret_..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Database ID
              </label>
              <input
                type="text"
                value={notionConfig.databaseId}
                onChange={e => setNotionConfig({ ...notionConfig, databaseId: e.target.value })}
                placeholder="ID da tabela Notion"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveNotion} className="flex-1" disabled={upsertMutation.isPending}>
              <Save className="w-3.5 h-3.5" />
              {upsertMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            {integrations?.some(i => i.type === 'NOTION') && (
              <Button variant="danger" onClick={() => deleteMutation.mutate({ type: 'NOTION' })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Google Calendar */}
        <SectionCard
          icon={Calendar}
          iconColor="#ef4444"
          iconBg="rgba(239,68,68,0.1)"
          title="Google Agenda"
          subtitle="Agendamentos automáticos pela IA"
          isConnected={googleConnected}
        >
          <div>
            <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
              JSON Credenciais (Service Account)
            </label>
            <textarea
              value={googleConfig.credentials}
              onChange={e => setGoogleConfig({ credentials: e.target.value })}
              rows={5}
              placeholder={'{ "type": "service_account", ... }'}
              className={`${inputCls} resize-none font-mono-rattix text-xs`}
              style={{ lineHeight: '1.5' }}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveGoogle} className="flex-1" disabled={upsertMutation.isPending}>
              <Save className="w-3.5 h-3.5" />
              {upsertMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            {integrations?.some(i => i.type === 'GOOGLE_CALENDAR') && (
              <Button variant="danger" onClick={() => deleteMutation.mutate({ type: 'GOOGLE_CALENDAR' })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Admin notifications */}
        <SectionCard
          icon={Bell}
          iconColor="#B6FF00"
          iconBg="rgba(182,255,0,0.08)"
          title="Notificações Admin"
          subtitle="Alerta quando lead precisar de atendimento humano"
        >
          <div>
            <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Telefone WhatsApp (com DDI)
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 rounded-xl shrink-0" style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Smartphone className="w-3.5 h-3.5" style={{ color: '#555' }} />
              </div>
              <input
                type="text"
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                placeholder="5511999999999"
                className={`${inputCls} flex-1`}
              />
            </div>
            <p className="mt-2 text-xs font-mono-rattix" style={{ color: '#444' }}>
              Recebe alertas quando o AgentR pausar o atendimento
            </p>
          </div>
          <Button
            onClick={handleSaveAdmin}
            className="w-full mt-4"
            disabled={updateInstanceMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {updateInstanceMutation.isPending ? 'Salvando...' : 'Salvar Telefone'}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}

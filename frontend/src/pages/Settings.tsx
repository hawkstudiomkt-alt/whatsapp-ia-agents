import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Trash2, 
  Save,
  Globe,
  Settings as SettingsIcon,
  Database,
  Bell,
  Smartphone
} from 'lucide-react';
import { instancesApi, integrationsApi, Instance, Integration } from '../lib/api';
import { Card, Button, Badge, LoadingSpinner, PageTransition } from '../components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Settings() {
  const queryClient = useQueryClient();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [notionConfig, setNotionConfig] = useState({ apiKey: '', databaseId: '' });
  const [googleConfig, setGoogleConfig] = useState({ credentials: '' });
  const [adminPhone, setAdminPhone] = useState('');

  const { data: instances, isLoading: isInstancesLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: instancesApi.findAll,
  });

  const { data: integrations, isLoading } = useQuery({
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

  const upsertMutation = useMutation({
    mutationFn: integrationsApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedInstanceId] });
      alert('Configuração salva com sucesso!');
    },
    onError: () => alert('Erro ao salvar configuração.')
  });

  const updateInstanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Instance> }) => instancesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      alert('Configuração da instância salva!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type }: { type: string }) => integrationsApi.delete(selectedInstanceId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedInstanceId] });
      alert('Integração removida.');
    }
  });

  const handleSaveNotion = () => {
    upsertMutation.mutate({
      instanceId: selectedInstanceId,
      type: 'NOTION',
      config: notionConfig,
      isActive: true
    });
  };

  const handleSaveGoogle = () => {
    let creds = googleConfig.credentials;
    try {
      if (typeof creds === 'string' && creds.trim().startsWith('{')) {
        creds = JSON.parse(creds);
      }
    } catch (e) {
      alert('JSON de credenciais inválido');
      return;
    }

    upsertMutation.mutate({
      instanceId: selectedInstanceId,
      type: 'GOOGLE_CALENDAR',
      config: { credentials: creds },
      isActive: true
    });
  };

  const handleSaveAdmin = () => {
    updateInstanceMutation.mutate({
      id: selectedInstanceId,
      data: { adminPhone }
    });
  };

  if (isInstancesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <LoadingSpinner />
        <p className="text-gray-400 animate-pulse font-medium">Carregando configurações...</p>
      </div>
    );
  }

  if (!instances || instances.length === 0) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
          <div className="p-6 bg-gray-800/50 rounded-full border border-gray-700/50">
            <SettingsIcon className="w-12 h-12 text-gray-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Nenhuma Instância Encontrada</h2>
            <p className="text-gray-400 mt-2 max-w-sm">Você precisa criar sua primeira instância de WhatsApp para configurar as integrações.</p>
          </div>
          <Button onClick={() => window.location.href = '/instances'}>
            Ir para Instâncias
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Configurações</h1>
            <p className="text-gray-400 mt-2">Gerencie integrações e notificações para cada cliente da agência.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-2xl border border-gray-700/50">
            <span className="text-sm font-medium text-gray-400 ml-2">Instância:</span>
            <select
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 pr-10 py-2 text-white focus:outline-none focus:border-green-500 min-w-[240px] appearance-none cursor-pointer"
            >
              {instances?.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name} ({inst.phoneNumber})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Notion Card */}
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                  <Globe className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Notion CRM</h2>
                  <p className="text-sm text-gray-400">Sincronização de leads em tempo real.</p>
                </div>
              </div>
              <Badge variant={integrations?.some(i => i.type === 'NOTION' && i.isActive) ? 'success' : 'neutral'}>
                {integrations?.some(i => i.type === 'NOTION' && i.isActive) ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Notion Integration Token</label>
                <input
                  type="password"
                  value={notionConfig.apiKey}
                  onChange={(e) => setNotionConfig({ ...notionConfig, apiKey: e.target.value })}
                  placeholder="secret_..."
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Database ID</label>
                <input
                  type="text"
                  value={notionConfig.databaseId}
                  onChange={(e) => setNotionConfig({ ...notionConfig, databaseId: e.target.value })}
                  placeholder="ID da tabela do Notion"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveNotion} className="flex-1" disabled={upsertMutation.isPending}>
                <Save className="w-4 h-4" /> {upsertMutation.isPending ? 'Salvando...' : 'Salvar Notion'}
              </Button>
              {integrations?.some(i => i.type === 'NOTION') && (
                <Button variant="danger" size="md" onClick={() => deleteMutation.mutate({ type: 'NOTION' })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>

          {/* Google Card */}
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Google Agenda</h2>
                  <p className="text-sm text-gray-400">Agendamentos automáticos por IA.</p>
                </div>
              </div>
              <Badge variant={integrations?.some(i => i.type === 'GOOGLE_CALENDAR' && i.isActive) ? 'success' : 'neutral'}>
                {integrations?.some(i => i.type === 'GOOGLE_CALENDAR' && i.isActive) ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">JSON de Credenciais (Service Account)</label>
              <textarea
                value={googleConfig.credentials}
                onChange={(e) => setGoogleConfig({ credentials: e.target.value })}
                rows={5}
                placeholder='{ "type": "service_account", ... }'
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-gray-600 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveGoogle} className="flex-1" disabled={upsertMutation.isPending}>
                <Save className="w-4 h-4" /> {upsertMutation.isPending ? 'Salvando...' : 'Salvar Agenda'}
              </Button>
              {integrations?.some(i => i.type === 'GOOGLE_CALENDAR') && (
                <Button variant="danger" size="md" onClick={() => deleteMutation.mutate({ type: 'GOOGLE_CALENDAR' })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>

          {/* Admin Notification Card */}
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-yellow-500/10 text-yellow-500">
                  <Bell className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Notificações Admin</h2>
                  <p className="text-sm text-gray-400">Avisar o dono da agência quando um lead pedir ajuda.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Telefone para Notificações (WhatsApp)
                </label>
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="Ex: 5511999999999"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-500 italic">
                  * Este número receberá alertas quando a IA pausar o atendimento por detecção humana ou solicitação de ajuda.
                </p>
              </div>
            </div>

            <Button onClick={handleSaveAdmin} className="w-full bg-yellow-600 hover:bg-yellow-500" disabled={updateInstanceMutation.isPending}>
              <Save className="w-4 h-4" /> {updateInstanceMutation.isPending ? 'Salvando...' : 'Salvar Telefone Admin'}
            </Button>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

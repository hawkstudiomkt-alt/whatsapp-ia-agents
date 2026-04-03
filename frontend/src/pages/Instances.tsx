import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instancesApi, Instance } from '../lib/api';
import { Plus, Wifi, WifiOff, QrCode, Trash2, Eye, FileText, X, Bot, MessageSquare, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, LoadingSpinner } from '../components/ui';
import { jsPDF } from 'jspdf';

const STATUS_CONFIG = {
  CONNECTED:    { label: 'Conectado',    variant: 'success'  as const, dot: '#B6FF00', icon: Wifi },
  DISCONNECTED: { label: 'Desconectado', variant: 'danger'   as const, dot: '#ef4444', icon: WifiOff },
  PENDING:      { label: 'Pendente',     variant: 'warning'  as const, dot: '#f59e0b', icon: RefreshCw },
};

const inputCls = `
  w-full bg-[#060606] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[#f0f0f0]
  outline-none focus:border-[rgba(182,255,0,0.4)] transition-colors font-[Space_Grotesk,sans-serif]
`;

export default function Instances() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]               = useState(false);
  const [formData, setFormData]               = useState({ name: '', phoneNumber: '' });
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCodeData, setQrCodeData]           = useState<{ base64: string; instanceId: string } | null>(null);
  const [qrCountdown, setQrCountdown]         = useState(20);

  const { data: instances, isLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: instancesApi.findAll,
  });

  const createMutation = useMutation({
    mutationFn: instancesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      setShowForm(false);
      setFormData({ name: '', phoneNumber: '' });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.message || 'Erro ao criar instância';
      alert(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: instancesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instances'] }),
  });

  const generateQRMutation = useMutation({
    mutationFn: instancesApi.generateQR,
    onSuccess: (data, instanceId) => {
      if (data?.base64) {
        setQrCodeData({ base64: data.base64, instanceId });
        setQrCountdown(20);
      } else {
        alert('QR Code não retornado. Verifique a Evolution API.');
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.details || error.response?.data?.error || error.message;
      alert('Erro: ' + msg);
    },
  });

  useEffect(() => {
    if (!qrCodeData) return;
    const countdownInterval = setInterval(() => {
      setQrCountdown(prev => (prev <= 1 ? 20 : prev - 1));
    }, 1000);
    const refreshInterval = setInterval(() => {
      generateQRMutation.mutate(qrCodeData.instanceId);
    }, 20000);
    return () => { clearInterval(countdownInterval); clearInterval(refreshInterval); };
  }, [qrCodeData?.instanceId]);

  const handleExportPDF = (instance: Instance) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Relatório de Instância — Rattix', 20, 20);
    doc.setFontSize(16);
    doc.text(`${instance.name}`, 20, 35);
    doc.setFontSize(12);
    doc.text(`Telefone: ${instance.phoneNumber}`, 20, 45);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 60, 190, 60);
    doc.text('Métricas:', 20, 70);
    doc.text(`- Conversas: ${instance._count?.conversations || 0}`, 30, 80);
    doc.text(`- Mensagens: ${instance._count?.messages || 0}`, 30, 90);
    doc.text(`- Agentes: ${instance.agents?.length || 0}`, 30, 100);
    doc.text(`Status: ${instance.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}`, 20, 115);
    doc.save(`rattix-${instance.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const connected    = instances?.filter(i => i.status === 'CONNECTED').length    || 0;
  const disconnected = instances?.filter(i => i.status === 'DISCONNECTED').length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Instâncias
          </h1>
          <p className="text-sm mt-1 font-mono-rattix" style={{ color: '#555' }}>
            {connected} online · {disconnected} offline
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Nova Instância
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
      ) : !instances?.length ? (
        <Card className="p-16 flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(182,255,0,0.06)', border: '1px solid rgba(182,255,0,0.1)' }}
          >
            <Wifi className="w-7 h-7" style={{ color: '#B6FF00' }} />
          </div>
          <p className="text-sm font-mono-rattix" style={{ color: '#444' }}>
            Nenhuma instância cadastrada
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {instances.map((instance, index) => {
            const conf = STATUS_CONFIG[instance.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DISCONNECTED;
            const StatusIcon = conf.icon;
            const isConnected = instance.status === 'CONNECTED';

            return (
              <motion.div
                key={instance.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                <Card className="p-5" style={{ borderTop: `2px solid ${conf.dot}` } as any}>
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isConnected ? 'rgba(182,255,0,0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isConnected ? 'rgba(182,255,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <StatusIcon
                          className="w-5 h-5"
                          style={{ color: conf.dot }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#f0f0f0' }}>
                          {instance.name}
                        </p>
                        <p className="text-xs font-mono-rattix truncate" style={{ color: '#555' }}>
                          {instance.phoneNumber}
                        </p>
                      </div>
                    </div>
                    <Badge variant={conf.variant}>{conf.label}</Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { icon: MessageSquare, value: instance._count?.conversations || 0, label: 'conversas' },
                      { icon: MessageSquare, value: instance._count?.messages || 0,       label: 'mensagens' },
                      { icon: Bot,           value: instance.agents?.length || 0,          label: 'agentes' },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center py-2 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span className="text-base font-bold" style={{ color: '#f0f0f0' }}>{stat.value}</span>
                        <span className="text-[10px] font-mono-rattix" style={{ color: '#444' }}>{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => generateQRMutation.mutate(instance.id)}
                      disabled={generateQRMutation.isPending}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      QR
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedInstance(instance)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleExportPDF(instance)}
                      title="Exportar PDF"
                    >
                      <FileText className="w-3.5 h-3.5" style={{ color: '#7D53FF' }} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Deletar "${instance.name}"?`)) deleteMutation.mutate(instance.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: '#f0f0f0' }}>Nova Instância</h2>
                <button onClick={() => setShowForm(false)} style={{ color: '#555' }}><X className="w-5 h-5" /></button>
              </div>
              <form
                onSubmit={e => { e.preventDefault(); createMutation.mutate(formData); }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Instância Principal"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-mono-rattix" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Número WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="5511999999999"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                    {createMutation.isPending ? <LoadingSpinner /> : 'Criar'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {qrCodeData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 text-center"
              style={{ background: '#0e0e0e', border: '1px solid rgba(182,255,0,0.2)' }}
            >
              <h2 className="text-lg font-bold mb-1" style={{ color: '#f0f0f0' }}>Escanear QR Code</h2>
              <p className="text-xs font-mono-rattix mb-1" style={{ color: '#555' }}>
                WhatsApp → Aparelhos conectados → Conectar aparelho
              </p>
              <p className="text-xs mb-4 font-mono-rattix" style={{ color: '#B6FF00' }}>
                Atualiza em {qrCountdown}s
              </p>
              <div
                className="mx-auto rounded-xl overflow-hidden"
                style={{ width: 240, height: 240, background: '#fff', padding: '8px' }}
              >
                <img src={qrCodeData.base64} alt="QR Code" style={{ width: '100%', height: '100%' }} />
              </div>
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => { setQrCodeData(null); setQrCountdown(20); }}
              >
                Fechar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Instance Modal */}
      <AnimatePresence>
        {selectedInstance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setSelectedInstance(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6"
              style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#f0f0f0' }}>{selectedInstance.name}</h2>
                  <p className="text-xs font-mono-rattix" style={{ color: '#555' }}>{selectedInstance.phoneNumber}</p>
                </div>
                <button onClick={() => setSelectedInstance(null)} style={{ color: '#555' }}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div
                  className="px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <p className="text-xs font-mono-rattix mb-1" style={{ color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>API Key</p>
                  <code className="text-xs break-all" style={{ color: '#7D53FF' }}>{selectedInstance.apiKey}</code>
                </div>

                <div>
                  <p className="text-xs font-mono-rattix mb-2" style={{ color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Agentes Vinculados</p>
                  {selectedInstance.agents?.length ? (
                    <div className="space-y-2">
                      {selectedInstance.agents.map(agent => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between px-3 py-2 rounded-xl"
                          style={{ background: 'rgba(125,83,255,0.06)', border: '1px solid rgba(125,83,255,0.12)' }}
                        >
                          <div className="flex items-center gap-2">
                            <Bot className="w-3.5 h-3.5" style={{ color: '#7D53FF' }} />
                            <span className="text-sm" style={{ color: '#f0f0f0' }}>{agent.name}</span>
                          </div>
                          <Badge variant={agent.status === 'ACTIVE' ? 'success' : 'neutral'}>
                            {agent.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-mono-rattix" style={{ color: '#444' }}>Sem agentes vinculados</p>
                  )}
                </div>
              </div>

              <Button variant="secondary" className="w-full mt-6" onClick={() => setSelectedInstance(null)}>
                Fechar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

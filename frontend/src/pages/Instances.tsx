import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instancesApi, Instance } from '../lib/api';
import { Plus, Wifi, WifiOff, QrCode, Trash2, Edit, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function Instances() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phoneNumber: '' });
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ base64: string; instanceId: string } | null>(null);
  const [qrCountdown, setQrCountdown] = useState(20);

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
      alert('Instância criada com sucesso!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.message || 'Erro ao criar instância';
      alert(msg);
      console.error('Create instance error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: instancesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
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
      const msg = error.response?.data?.details || error.response?.data?.error || error.message || 'Erro ao gerar QR Code';
      alert('Erro: ' + msg);
    },
  });

  useEffect(() => {
    if (!qrCodeData) return;

    const countdownInterval = setInterval(() => {
      setQrCountdown(prev => {
        if (prev <= 1) return 20;
        return prev - 1;
      });
    }, 1000);

    const refreshInterval = setInterval(() => {
      generateQRMutation.mutate(qrCodeData.instanceId);
    }, 20000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [qrCodeData?.instanceId]);

  const handleExportPDF = (instance: Instance) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Relatório de Desempenho da Instância', 20, 20);
    doc.setFontSize(16);
    doc.text(`Instância: ${instance.name}`, 20, 35);
    doc.text(`Telefone: ${instance.phoneNumber}`, 20, 45);
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 60, 190, 60);
    doc.text('Métricas Consolidadas:', 20, 70);
    doc.text(`- Conversas Totais: ${instance._count?.conversations || 0}`, 30, 80);
    doc.text(`- Mensagens Processadas: ${instance._count?.messages || 0}`, 30, 90);
    doc.text(`- Agentes Vinculados: ${instance.agents?.length || 0}`, 30, 100);
    doc.line(20, 110, 190, 110);
    doc.text(`Status Atual: ${instance.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}`, 20, 120);
    doc.save(`relatorio-${instance.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      CONNECTED: { color: 'bg-green-500', label: 'Conectado' },
      DISCONNECTED: { color: 'bg-red-500', label: 'Desconectado' },
      PENDING: { color: 'bg-yellow-500', label: 'Pendente' },
    };
    const configStatus = config[status as keyof typeof config];
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${configStatus.color}`}>
        {configStatus.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Instâncias</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Instância
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Nova Instância</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="5511999999999"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instance Cards */}
      <div className="grid grid-cols-2 gap-6">
        {isLoading ? (
          <p className="text-gray-400">Carregando...</p>
        ) : (
          instances?.map((instance) => (
            <div key={instance.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{instance.name}</h3>
                  <p className="text-gray-400 text-sm">{instance.phoneNumber}</p>
                </div>
                {getStatusBadge(instance.status)}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span>{instance._count?.conversations || 0} conversas</span>
                <span>{instance._count?.messages || 0} mensagens</span>
                <span>{instance.agents?.length || 0} agentes</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateQRMutation.mutate(instance.id)}
                  disabled={generateQRMutation.isPending}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
                >
                  <QrCode className="w-4 h-4" />
                  {generateQRMutation.isPending ? 'Gerando...' : 'QR Code'}
                </button>
                <button
                  onClick={() => setSelectedInstance(instance)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Ver
                </button>
                <button
                  onClick={() => deleteMutation.mutate(instance.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleExportPDF(instance)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  title="Exportar PDF"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>

              {instance.status === 'CONNECTED' ? (
                <div className="flex items-center gap-2 mt-4 text-green-500 text-sm">
                  <Wifi className="w-4 h-4" />
                  Conectado
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-4 text-red-500 text-sm">
                  <WifiOff className="w-4 h-4" />
                  Desconectado
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-500">API Key</p>
                <code className="text-sm text-green-400 break-all">{instance.apiKey}</code>
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Code Modal */}
      {qrCodeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm border border-gray-700 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Escanear QR Code</h2>
            <p className="text-gray-400 text-sm mb-1">
              Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
            </p>
            <p className="text-yellow-400 text-xs mb-4">
              Atualiza em {qrCountdown}s
            </p>
            <img
              src={qrCodeData.base64}
              alt="QR Code WhatsApp"
              className="mx-auto rounded-lg border border-gray-600 bg-white"
              style={{ width: 256, height: 256 }}
            />
            <button
              onClick={() => { setQrCodeData(null); setQrCountdown(20); }}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* View Instance Modal */}
      {selectedInstance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">{selectedInstance.name}</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                {getStatusBadge(selectedInstance.status)}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Telefone</p>
                <p className="text-white">{selectedInstance.phoneNumber}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Agentes</p>
                <div className="mt-2 space-y-2">
                  {selectedInstance.agents?.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                      <span className="text-white">{agent.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${agent.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-600'}`}>
                        {agent.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
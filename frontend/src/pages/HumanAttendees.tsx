import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Users, Plus, UserCheck, UserX, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, LoadingSpinner } from '../components/ui';

interface HumanAttendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  _count?: { assignments: number };
}

interface Assignment {
  id: string;
  status: string;
  createdAt: string;
  conversation?: {
    phone: string;
    lead?: { name?: string };
  };
  lead?: {
    name?: string;
    phone: string;
  };
}

export default function HumanAttendees() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<HumanAttendee | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  const { data: attendees, isLoading } = useQuery({
    queryKey: ['human-attendees'],
    queryFn: () => api.get<HumanAttendee[]>('/human-attendees').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/human-attendees', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['human-attendees'] });
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/human-attendees/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['human-attendees'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      AVAILABLE: { color: 'success' as const, label: 'Disponível' },
      BUSY: { color: 'warning' as const, label: 'Ocupado' },
      OFFLINE: { color: 'neutral' as const, label: 'Offline' },
    };
    const configStatus = config[status as keyof typeof config];
    return <Badge variant={configStatus?.color}>{configStatus?.label}</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Atendentes Humanos</h1>
          <p className="text-gray-400 mt-1">Gerencie sua equipe de atendimento</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-5 h-5" />
          Novo Atendente
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Novo Atendente</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                  {createMutation.isPending ? <LoadingSpinner /> : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12 col-span-3">
            <LoadingSpinner />
          </div>
        ) : (
          attendees?.map((attendee, index) => (
            <motion.div
              key={attendee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{attendee.name}</h3>
                      <p className="text-gray-400 text-sm">{attendee.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(attendee.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{attendee._count?.assignments || 0} conversas ativas</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedAttendee(attendee)}
                  >
                    <UserCheck className="w-4 h-4" />
                    Ver
                  </Button>
                  {attendee.status === 'AVAILABLE' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: attendee.id, status: 'BUSY' })}
                    >
                      <Clock className="w-4 h-4" />
                      Ocupado
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: attendee.id, status: 'AVAILABLE' })}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Liberar
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Designações */}
      {selectedAttendee && (
        <AssignmentsModal
          attendee={selectedAttendee}
          onClose={() => setSelectedAttendee(null)}
        />
      )}
    </motion.div>
  );
}

function AssignmentsModal({ attendee, onClose }: { attendee: HumanAttendee; onClose: () => void }) {
  const { data: assignments } = useQuery({
    queryKey: ['human-attendees', attendee.id, 'assignments'],
    queryFn: () =>
      api.get<Assignment[]>(`/human-attendees/${attendee.id}/assignments`).then(r => r.data),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">
          Designações de {attendee.name}
        </h2>
        <div className="space-y-3">
          {assignments?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhuma designação</p>
          ) : (
            assignments?.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 bg-gray-700/30 rounded-xl border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {assignment.lead?.name || assignment.conversation?.lead?.name || assignment.lead?.phone || assignment.conversation?.phone}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {new Date(assignment.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant={assignment.status === 'COMPLETED' ? 'success' : 'warning'}>
                    {assignment.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
        <Button variant="secondary" onClick={onClose} className="w-full mt-4">
          Fechar
        </Button>
      </div>
    </motion.div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Users, Plus, UserCheck, Clock, CheckCircle, X, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  conversation?: { phone: string; lead?: { name?: string } };
  lead?: { name?: string; phone: string };
}

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Disponível', variant: 'success'  as const, dot: '#B6FF00' },
  BUSY:      { label: 'Ocupado',    variant: 'warning'  as const, dot: '#f59e0b' },
  OFFLINE:   { label: 'Offline',    variant: 'neutral'  as const, dot: '#555'    },
};

const inputCls = `
  w-full bg-[#060606] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[#f0f0f0]
  outline-none focus:border-[rgba(182,255,0,0.4)] transition-colors font-[Space_Grotesk,sans-serif]
`;

export default function HumanAttendees() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]                 = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<HumanAttendee | null>(null);
  const [formData, setFormData]                 = useState({ name: '', email: '', phone: '' });

  const { data: attendees, isLoading } = useQuery({
    queryKey: ['human-attendees'],
    queryFn: () => api.get<HumanAttendee[]>('/human-attendees').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/human-attendees', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['human-attendees'] });
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/human-attendees/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['human-attendees'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const available = attendees?.filter(a => a.status === 'AVAILABLE').length || 0;
  const busy      = attendees?.filter(a => a.status === 'BUSY').length      || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Atendentes
          </h1>
          <p className="text-sm mt-1 font-mono-rattix" style={{ color: '#555' }}>
            {available} disponíveis · {busy} ocupados
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Novo Atendente
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : !attendees?.length ? (
        <Card className="p-16 flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(182,255,0,0.06)', border: '1px solid rgba(182,255,0,0.1)' }}
          >
            <Users className="w-7 h-7" style={{ color: '#B6FF00' }} />
          </div>
          <p className="text-sm font-mono-rattix" style={{ color: '#444' }}>
            Nenhum atendente cadastrado
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {attendees.map((attendee, index) => {
            const conf = STATUS_CONFIG[attendee.status] || STATUS_CONFIG.OFFLINE;
            const initials = attendee.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

            return (
              <motion.div
                key={attendee.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                <Card className="p-5">
                  {/* Top */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(125,83,255,0.25), rgba(182,255,0,0.1))', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {initials}
                        <span
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2"
                          style={{ background: conf.dot, borderColor: '#0e0e0e', boxShadow: `0 0 6px ${conf.dot}` }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#f0f0f0' }}>{attendee.name}</p>
                        <p className="text-xs truncate" style={{ color: '#555' }}>{attendee.email}</p>
                      </div>
                    </div>
                    <Badge variant={conf.variant}>{conf.label}</Badge>
                  </div>

                  {/* Stats */}
                  <div
                    className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: '#555' }} />
                    <span className="font-mono-rattix" style={{ color: '#888' }}>{attendee.phone}</span>
                    <span className="ml-auto font-mono-rattix" style={{ color: '#555' }}>
                      {attendee._count?.assignments || 0} atrib.
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedAttendee(attendee)}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Ver
                    </Button>
                    {attendee.status === 'AVAILABLE' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: attendee.id, status: 'BUSY' })}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: attendee.id, status: 'AVAILABLE' })}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
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
                <h2 className="text-lg font-bold" style={{ color: '#f0f0f0' }}>Novo Atendente</h2>
                <button onClick={() => setShowForm(false)} style={{ color: '#555' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: 'Nome', type: 'text', key: 'name', placeholder: 'João Silva' },
                  { label: 'E-mail', type: 'email', key: 'email', placeholder: 'joao@empresa.com' },
                  { label: 'Telefone', type: 'tel', key: 'phone', placeholder: '5511999999999' },
                ].map(field => (
                  <div key={field.key}>
                    <label
                      className="block text-xs mb-1.5 font-mono-rattix"
                      style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}
                    >
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      required
                      className={inputCls}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                    {createMutation.isPending ? <LoadingSpinner /> : 'Criar'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignments Modal */}
      <AnimatePresence>
        {selectedAttendee && (
          <AssignmentsModal
            attendee={selectedAttendee}
            onClose={() => setSelectedAttendee(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AssignmentsModal({ attendee, onClose }: { attendee: HumanAttendee; onClose: () => void }) {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['human-attendees', attendee.id, 'assignments'],
    queryFn: () => api.get<Assignment[]>(`/human-attendees/${attendee.id}/assignments`).then(r => r.data),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl rounded-2xl p-6 max-h-[80vh] flex flex-col"
        style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#f0f0f0' }}>Designações</h2>
            <p className="text-xs font-mono-rattix mt-0.5" style={{ color: '#555' }}>{attendee.name}</p>
          </div>
          <button onClick={onClose} style={{ color: '#555' }}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : !assignments?.length ? (
            <p className="text-center py-8 text-sm font-mono-rattix" style={{ color: '#444' }}>
              Nenhuma designação
            </p>
          ) : (
            assignments.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f0f0f0' }}>
                    {a.lead?.name || a.conversation?.lead?.name || a.lead?.phone || a.conversation?.phone || 'Lead'}
                  </p>
                  <p className="text-xs font-mono-rattix" style={{ color: '#555' }}>
                    {new Date(a.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Badge variant={a.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {a.status}
                </Badge>
              </div>
            ))
          )}
        </div>

        <Button variant="secondary" onClick={onClose} className="w-full mt-4">
          Fechar
        </Button>
      </motion.div>
    </motion.div>
  );
}

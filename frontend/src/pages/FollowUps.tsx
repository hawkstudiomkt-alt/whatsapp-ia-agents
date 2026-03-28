import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followupsApi, FollowUp } from '../lib/api';
import { Calendar, Clock, Trash2, CheckCircle, AlertCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, LoadingSpinner } from '../components/ui';

export default function FollowUps() {
  const queryClient = useQueryClient();

  const { data: followups, isLoading } = useQuery({
    queryKey: ['followups'],
    queryFn: followupsApi.findAll,
  });

  const deleteMutation = useMutation({
    mutationFn: followupsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { color: 'warning' as const, label: 'Pendente' },
      COMPLETED: { color: 'success' as const, label: 'Concluído' },
      CANCELLED: { color: 'danger' as const, label: 'Cancelado' },
    };
    const configStatus = config[status as keyof typeof config];
    return <Badge variant={configStatus?.color}>{configStatus?.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const config = {
      REMINDER: { label: 'Lembrete', color: 'info' as const },
      NO_RESPONSE: { label: 'Sem Resposta', color: 'neutral' as const },
      CUSTOM: { label: 'Personalizado', color: 'warning' as const },
    };
    const configType = config[type as keyof typeof config];
    return <Badge variant={configType?.color}>{configType?.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Follow-ups Agendados</h1>
        <p className="text-gray-400 mt-1">Acompanhe e gerencie os lembretes automáticos dos seus leads</p>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !followups || followups.length === 0 ? (
          <Card className="p-12 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum follow-up agendado no momento.</p>
          </Card>
        ) : (
          followups.map((followup, index) => (
            <motion.div
              key={followup.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-5 hover:border-blue-500/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {followup.lead?.name || followup.lead?.phone}
                        </h3>
                        {getTypeBadge(followup.type)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(followup.scheduledFor).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {followup.lead?.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(followup.status)}
                    {followup.status === 'PENDING' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (confirm('Deseja cancelar este follow-up?')) {
                            deleteMutation.mutate(followup.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {followup.notes && (
                  <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Notas / Instrução IA</p>
                    <p className="text-sm text-gray-300 italic">"{followup.notes}"</p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

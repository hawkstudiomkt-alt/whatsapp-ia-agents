import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followupsApi, FollowUp } from '../lib/api';
import { Calendar, Clock, Trash2, User, Bot, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, LoadingSpinner } from '../components/ui';

const TYPE_CONFIG = {
  REMINDER:    { label: 'Lembrete',      variant: 'purple' as const },
  NO_RESPONSE: { label: 'Sem Resposta',  variant: 'neutral' as const },
  CUSTOM:      { label: 'Personalizado', variant: 'lime' as const },
};

const STATUS_CONFIG = {
  PENDING:   { label: 'Pendente',   variant: 'warning' as const },
  COMPLETED: { label: 'Concluído',  variant: 'success' as const },
  CANCELLED: { label: 'Cancelado',  variant: 'danger' as const },
};

function TimeAgo({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  const past = diff < 0;

  const label = days > 0 ? `${days}d` : hours > 0 ? `${hours}h` : `${mins}min`;
  return (
    <span style={{ color: past ? '#ef4444' : '#B6FF00', fontSize: '11px', fontFamily: 'Space Mono, monospace' }}>
      {past ? `há ${label}` : `em ${label}`}
    </span>
  );
}

export default function FollowUps() {
  const queryClient = useQueryClient();

  const { data: followups, isLoading } = useQuery({
    queryKey: ['followups'],
    queryFn: followupsApi.findAll,
  });

  const deleteMutation = useMutation({
    mutationFn: followupsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followups'] }),
  });

  const pending   = followups?.filter(f => f.status === 'PENDING')   || [];
  const completed = followups?.filter(f => f.status === 'COMPLETED')  || [];
  const cancelled = followups?.filter(f => f.status === 'CANCELLED')  || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Follow-ups
          </h1>
          <p className="text-sm mt-1" style={{ color: '#555', fontFamily: 'Space Mono, monospace' }}>
            Lembretes automáticos agendados pelo AgentR
          </p>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Pendentes',  count: pending.length,   color: '#B6FF00' },
            { label: 'Concluídos', count: completed.length, color: '#7D53FF' },
            { label: 'Cancelados', count: cancelled.length, color: '#555' },
          ].map(chip => (
            <div
              key={chip.label}
              className="px-4 py-2 rounded-xl flex items-center gap-2"
              style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: chip.color, boxShadow: chip.color !== '#555' ? `0 0 6px ${chip.color}` : 'none' }}
              />
              <span className="text-xs font-mono-rattix" style={{ color: chip.color }}>{chip.count}</span>
              <span className="text-xs" style={{ color: '#444' }}>{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : !followups || followups.length === 0 ? (
        <Card className="p-16 flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(182,255,0,0.06)', border: '1px solid rgba(182,255,0,0.1)' }}
          >
            <Calendar className="w-7 h-7" style={{ color: '#B6FF00' }} />
          </div>
          <p className="text-sm font-mono-rattix" style={{ color: '#444' }}>
            Nenhum follow-up agendado
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {followups.map((followup, index) => {
            const typeConf   = TYPE_CONFIG[followup.type as keyof typeof TYPE_CONFIG]   || { label: followup.type, variant: 'neutral' as const };
            const statusConf = STATUS_CONFIG[followup.status as keyof typeof STATUS_CONFIG] || { label: followup.status, variant: 'neutral' as const };
            const isPending  = followup.status === 'PENDING';

            return (
              <motion.div
                key={followup.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card
                  className="p-5"
                  style={{
                    borderLeft: isPending ? '2px solid #B6FF00' : '2px solid rgba(255,255,255,0.06)',
                  } as any}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon + Info */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isPending ? 'rgba(182,255,0,0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isPending ? 'rgba(182,255,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <Clock
                          className="w-5 h-5"
                          style={{ color: isPending ? '#B6FF00' : '#444' }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: '#f0f0f0' }}>
                            {followup.lead?.name || followup.lead?.phone || 'Lead'}
                          </span>
                          <Badge variant={typeConf.variant}>{typeConf.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#555' }}>
                            <User className="w-3 h-3" />
                            {followup.lead?.phone}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#555' }}>
                            <Calendar className="w-3 h-3" />
                            {new Date(followup.scheduledFor).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          <TimeAgo date={followup.scheduledFor} />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      {isPending && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (confirm('Cancelar este follow-up?')) {
                              deleteMutation.mutate(followup.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {followup.notes && (
                    <div
                      className="mt-4 px-4 py-3 rounded-xl flex items-start gap-2"
                      style={{ background: 'rgba(125,83,255,0.06)', border: '1px solid rgba(125,83,255,0.12)' }}
                    >
                      <Bot className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#7D53FF' }} />
                      <p className="text-xs italic" style={{ color: '#888' }}>
                        "{followup.notes}"
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

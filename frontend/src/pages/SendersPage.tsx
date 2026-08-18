import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../utils/date';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users, Plus, Mail, Server, ShieldCheck, CheckCircle } from 'lucide-react';

interface SendersContext {
  onToggleDevTools: () => void;
  onOpenShortcuts: () => void;
}

const createSenderSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required'),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().min(1),
  smtpUser: z.string().min(1, 'SMTP user is required'),
  smtpPass: z.string().min(1, 'SMTP password is required'),
  hourlyLimit: z.coerce.number().min(1).max(1000),
});

type CreateSenderFormData = z.infer<typeof createSenderSchema>;

export const SendersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { onToggleDevTools, onOpenShortcuts } = useOutletContext<SendersContext>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: senders = [], isLoading } = useQuery({
    queryKey: ['senders'],
    queryFn: api.getSenders,
  });

  const { data: rateLimits = [] } = useQuery({
    queryKey: ['rate-limits'],
    queryFn: api.getRateLimits,
    refetchInterval: 5000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSenderFormData>({
    resolver: zodResolver(createSenderSchema),
    defaultValues: {
      email: 'oliver.brown@reachinbox.io',
      displayName: 'Oliver Brown',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      hourlyLimit: 50,
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createSender,
    onSuccess: () => {
      toast.success('Sender account added to pool');
      queryClient.invalidateQueries({ queryKey: ['senders'] });
      queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (err: any) => {
      toast.error('Failed to add sender', {
        description: err.message || 'Please check your inputs and try again.',
      });
    },
  });

  const onSubmit = (data: CreateSenderFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Sender Pool"
        description="Manage multiple sending identities, SMTP credentials, and per-sender hourly limits."
        onOpenShortcuts={onOpenShortcuts}
        onToggleDevTools={onToggleDevTools}
      />

      <div className="p-8 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {senders.length} Active Sender Accounts
          </span>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Sender Account
          </Button>
        </div>

        {/* Sender Pool Cards */}
        {isLoading ? (
          <LoadingState message="Loading sender pool..." />
        ) : senders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {senders.map((sender) => {
              const limitInfo = rateLimits.find((r) => r.senderId === sender.id);
              const sentThisHour = limitInfo?.sentThisHour ?? 0;
              const remaining = limitInfo?.remaining ?? sender.hourlyLimit;
              const percentage = Math.round((sentThisHour / sender.hourlyLimit) * 100);

              return (
                <Card key={sender.id} className="flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-slate-900">{sender.displayName}</h3>
                        <p className="text-xs text-slate-500 font-mono">{sender.email}</p>
                      </div>
                      <Badge status="healthy" size="sm">
                        Healthy
                      </Badge>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Hourly Throughput:</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {sentThisHour} / {sender.hourlyLimit} sent
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {remaining} emails remaining in current 1h window
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Host: {sender.smtpHost}:{sender.smtpPort}</span>
                      <span>Added {formatDate(sender.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12">
              <EmptyState
                icon={<Users className="w-6 h-6" />}
                title="No senders configured"
                description="Add an Ethereal SMTP test account or custom SMTP credentials to start dispatching emails."
                actionText="Add Sender Account"
                onAction={() => setIsModalOpen(true)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Sender Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Sender Account"
        description="Configure SMTP settings and hourly dispatch limits for a sender identity."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Display Name"
              placeholder="e.g. Amanda Clark"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <Input
              label="Sender Email Address"
              type="email"
              placeholder="e.g. amanda@reachinbox.io"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="SMTP Host"
                placeholder="smtp.ethereal.email"
                error={errors.smtpHost?.message}
                {...register('smtpHost')}
              />
            </div>
            <Input
              label="SMTP Port"
              type="number"
              placeholder="587"
              error={errors.smtpPort?.message}
              {...register('smtpPort')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SMTP Username"
              placeholder="Ethereal username"
              error={errors.smtpUser?.message}
              {...register('smtpUser')}
            />
            <Input
              label="SMTP Password"
              type="password"
              placeholder="Ethereal password"
              error={errors.smtpPass?.message}
              {...register('smtpPass')}
            />
          </div>

          <Input
            label="Hourly Sending Limit (Emails / hour)"
            type="number"
            min={1}
            max={1000}
            error={errors.hourlyLimit?.message}
            {...register('hourlyLimit')}
          />

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Save Sender
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { CsvImportModal } from '../components/compose/CsvImportModal';
import { EmailPreviewTab } from '../components/compose/EmailPreviewTab';
import { SchedulePreviewCard } from '../components/compose/SchedulePreviewCard';
import { getUserTimezone } from '../utils/date';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  UploadCloud, 
  Calendar, 
  Clock, 
  Send, 
  Check, 
  X, 
  Edit3, 
  Eye,
  Plus
} from 'lucide-react';

const composeFormSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  senderId: z.string().uuid('Please select a sender account'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  delayBetweenEmails: z.coerce.number().min(0).max(3600),
  hourlyLimit: z.coerce.number().min(1).max(1000),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  timezone: z.string(),
});

type ComposeFormData = z.infer<typeof composeFormSchema>;

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualEmailInput, setManualEmailInput] = useState('');

  // Fetch available senders
  const { data: senders = [] } = useQuery({
    queryKey: ['senders'],
    queryFn: api.getSenders,
  });

  // Calculate default start date and time (now + 2 minutes)
  const now = new Date(Date.now() + 2 * 60 * 1000);
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().slice(0, 5);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ComposeFormData>({
    resolver: zodResolver(composeFormSchema),
    defaultValues: {
      name: 'Q3 Outreach Campaign',
      senderId: '',
      subject: 'Quick question regarding your workflow',
      body: '<p>Hi {{name}},</p><p>I noticed your recent work and wanted to reach out regarding our new integration.</p><p>Best regards,<br/>ReachInbox Team</p>',
      delayBetweenEmails: 2,
      hourlyLimit: 50,
      startDate: defaultDate,
      startTime: defaultTime,
      timezone: getUserTimezone(),
    },
  });

  // Set default sender when loaded
  useEffect(() => {
    if (senders.length > 0 && !watch('senderId')) {
      setValue('senderId', senders[0].id);
    }
  }, [senders, setValue, watch]);

  const watchedSubject = watch('subject');
  const watchedBody = watch('body');
  const watchedSenderId = watch('senderId');
  const watchedDelay = watch('delayBetweenEmails') || 2;
  const watchedLimit = watch('hourlyLimit') || 50;
  const watchedDate = watch('startDate');
  const watchedTime = watch('startTime');

  const selectedSender = senders.find((s) => s.id === watchedSenderId);

  // Combine date and time to ISO string
  const getStartDateTimeISO = () => {
    try {
      const combined = new Date(`${watchedDate}T${watchedTime}:00`);
      return combined.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  // Schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: api.scheduleEmails,
    onSuccess: (data) => {
      toast.success('Campaign scheduled successfully!', {
        description: `${data.totalScheduled} emails added to BullMQ delayed queue.`,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-scheduled'] });
      navigate('/scheduled');
    },
    onError: (err: any) => {
      toast.error('Failed to schedule campaign', {
        description: err.message || 'Please check your inputs and try again.',
      });
    },
  });

  const handleAddManualEmail = () => {
    const trimmed = manualEmailInput.trim().toLowerCase();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      if (!recipients.includes(trimmed)) {
        setRecipients((prev) => [...prev, trimmed]);
        setManualEmailInput('');
      } else {
        toast.info('Email already in list');
      }
    } else if (trimmed) {
      toast.error('Invalid email address format');
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const onSubmit = (formData: ComposeFormData) => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient email.');
      return;
    }

    const startTimeISO = getStartDateTimeISO();

    scheduleMutation.mutate({
      name: formData.name,
      subject: formData.subject,
      body: formData.body,
      recipients,
      senderId: formData.senderId,
      startTime: startTimeISO,
      timezone: formData.timezone,
      delayBetweenEmails: formData.delayBetweenEmails,
      hourlyLimit: formData.hourlyLimit,
    });
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Top Header */}
      <div className="h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Compose New Email</h2>
            <p className="text-xs text-slate-500">Configure delays, recipients, and schedule dispatch</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit(onSubmit)}
            isLoading={scheduleMutation.isPending}
            leftIcon={<Clock className="w-3.5 h-3.5" />}
          >
            Schedule Emails
          </Button>
        </div>
      </div>

      <div className="p-8 max-w-5xl space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Main Compose Card */}
          <Card>
            <CardContent className="p-6 space-y-5">
              {/* Campaign Name */}
              <Input
                label="Campaign Title"
                placeholder="e.g. Q3 Sales Outreach"
                error={errors.name?.message}
                {...register('name')}
              />

              {/* Sender Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  From (Sender Account)
                </label>
                {senders.length > 0 ? (
                  <select
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    {...register('senderId')}
                  >
                    {senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName} &lt;{s.email}&gt; (Limit: {s.hourlyLimit}/hr)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200 flex justify-between items-center">
                    <span>No senders found. Please configure a sender account in Settings or Sender Pool.</span>
                    <Button size="sm" variant="outline" onClick={() => navigate('/senders')}>
                      Add Sender
                    </Button>
                  </div>
                )}
                {errors.senderId && (
                  <p className="text-xs text-red-600 font-medium">{errors.senderId.message}</p>
                )}
              </div>

              {/* Recipients Input & CSV Import */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    To (Recipients) • {recipients.length} added
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCsvModalOpen(true)}
                    leftIcon={<UploadCloud className="w-3.5 h-3.5 text-emerald-600" />}
                  >
                    Upload CSV / TXT
                  </Button>
                </div>

                {/* Recipient Badges Container */}
                <div className="min-h-[52px] p-2 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-1.5">
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono text-slate-800 shadow-2xs group"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="text-slate-400 hover:text-red-600 p-0.5 rounded transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {/* Inline quick add input */}
                  <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                    <input
                      type="email"
                      placeholder={recipients.length === 0 ? "Type email and press Enter or Upload CSV..." : "Add another email..."}
                      value={manualEmailInput}
                      onChange={(e) => setManualEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddManualEmail();
                        }
                      }}
                      className="w-full bg-transparent px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    {manualEmailInput && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAddManualEmail}
                        className="h-7 text-xs"
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject */}
              <Input
                label="Subject"
                placeholder="Enter email subject..."
                error={errors.subject?.message}
                {...register('subject')}
              />

              {/* Delay & Rate Limit Configurations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                <Input
                  type="number"
                  label="Delay Between 2 Emails (seconds)"
                  min={0}
                  max={3600}
                  hint="Worker throttles consecutive dispatches"
                  error={errors.delayBetweenEmails?.message}
                  {...register('delayBetweenEmails')}
                />

                <Input
                  type="number"
                  label="Hourly Limit (emails / hour)"
                  min={1}
                  max={1000}
                  hint="Redis sliding window quota per sender"
                  error={errors.hourlyLimit?.message}
                  {...register('hourlyLimit')}
                />
              </div>

              {/* Write / Preview Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('write')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === 'write'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Write</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === 'preview'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {activeTab === 'write' ? (
                  <div className="space-y-1.5">
                    <textarea
                      rows={8}
                      placeholder="Write your email body (HTML supported)..."
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      {...register('body')}
                    />
                    {errors.body && (
                      <p className="text-xs text-red-600 font-medium">{errors.body.message}</p>
                    )}
                  </div>
                ) : (
                  <EmailPreviewTab
                    fromEmail={selectedSender?.email}
                    fromName={selectedSender?.displayName}
                    sampleRecipient={recipients[0] || 'john.smith@domain.io'}
                    subject={watchedSubject}
                    body={watchedBody}
                  />
                )}
              </div>

              {/* Start Date, Time & Timezone Scheduling */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Input
                  type="date"
                  label="Start Date"
                  error={errors.startDate?.message}
                  {...register('startDate')}
                />
                <Input
                  type="time"
                  label="Start Time"
                  error={errors.startTime?.message}
                  {...register('startTime')}
                />
                <Input
                  label="Timezone"
                  readOnly
                  className="bg-slate-50"
                  {...register('timezone')}
                />
              </div>

              {/* Dynamic Schedule Preview */}
              <SchedulePreviewCard
                totalRecipients={recipients.length}
                delaySeconds={watchedDelay}
                hourlyLimit={watchedLimit}
                startTime={getStartDateTimeISO()}
              />
            </CardContent>
          </Card>

          {/* Bottom Action */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={scheduleMutation.isPending}
              leftIcon={<Clock className="w-4 h-4" />}
            >
              Schedule Campaign ({recipients.length} Emails)
            </Button>
          </div>
        </form>
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={(imported) => {
          setRecipients((prev) => {
            const combined = new Set([...prev, ...imported]);
            return Array.from(combined);
          });
          toast.success(`Imported ${imported.length} verified email leads`);
        }}
      />
    </div>
  );
};

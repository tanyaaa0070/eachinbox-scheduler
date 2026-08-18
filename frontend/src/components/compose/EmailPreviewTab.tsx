import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Avatar } from '../ui/Avatar';

interface EmailPreviewTabProps {
  fromEmail?: string;
  fromName?: string;
  sampleRecipient?: string;
  subject: string;
  body: string;
}

export const EmailPreviewTab: React.FC<EmailPreviewTabProps> = ({
  fromEmail = 'sender@domain.com',
  fromName = 'ReachInbox Sender',
  sampleRecipient = 'john.doe@company.com',
  subject,
  body,
}) => {
  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-6 space-y-4">
        {/* Email Header Preview */}
        <div className="border-b border-slate-100 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={fromName} size="md" />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {fromName} <span className="text-slate-400 font-normal">&lt;{fromEmail}&gt;</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  to <span className="font-medium text-slate-700">{sampleRecipient}</span>
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Just now</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 pt-2">
            {subject || <span className="text-slate-300 italic">No subject provided</span>}
          </h3>
        </div>

        {/* Email Body Preview */}
        <div className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed min-h-[160px]">
          {body ? (
            <div dangerouslySetInnerHTML={{ __html: body }} />
          ) : (
            <p className="text-slate-300 italic">Type your email content in the Write tab to see preview.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

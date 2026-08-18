import { EventEmitter } from 'events';

export interface EmailDispatchEvent {
  type: 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED' | 'RETRY' | 'OPENED' | 'CLICKED';
  emailId: string;
  recipient: string;
  senderEmail?: string;
  subject?: string;
  previewUrl?: string;
  errorMessage?: string;
  retryAfterMs?: number;
  timestamp: string;
}

class AppEventEmitter extends EventEmitter {}

export const appEvents = new AppEventEmitter();
// Increase max listeners for SSE client connections
appEvents.setMaxListeners(100);

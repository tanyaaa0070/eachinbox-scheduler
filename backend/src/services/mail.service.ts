import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface SendResult {
  messageId: string;
  previewUrl: string | null;
}

interface SenderConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  displayName: string;
  email: string;
}

// Cache transporters per sender to reuse connections
const transporterCache = new Map<string, nodemailer.Transporter>();

function getTransporter(sender: SenderConfig): nodemailer.Transporter {
  const key = `${sender.smtpHost}:${sender.smtpPort}:${sender.smtpUser}`;
  let transporter = transporterCache.get(key);

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: {
        user: sender.smtpUser,
        pass: sender.smtpPass,
      },
    });
    transporterCache.set(key, transporter);
  }

  return transporter;
}

export const mailService = {
  /**
   * Get a transporter using the default Ethereal config from env.
   */
  getDefaultTransporter(): nodemailer.Transporter {
    return getTransporter({
      smtpHost: env.ETHEREAL_HOST,
      smtpPort: env.ETHEREAL_PORT,
      smtpUser: env.ETHEREAL_USER,
      smtpPass: env.ETHEREAL_PASSWORD,
      displayName: 'ReachInbox Scheduler',
      email: env.ETHEREAL_USER,
    });
  },

  /**
   * Send an email via a specific sender's SMTP config.
   */
  async sendEmail(params: {
    sender: SenderConfig;
    to: string;
    subject: string;
    body: string;
  }): Promise<SendResult> {
    const { sender, to, subject, body } = params;
    const transporter = getTransporter(sender);

    const info = await transporter.sendMail({
      from: `"${sender.displayName}" <${sender.email}>`,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text fallback
    });

    const messageId = info.messageId;
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    logger.info(
      { messageId, to, previewUrl: previewUrl ? previewUrl : undefined },
      'Email sent successfully'
    );

    return { messageId, previewUrl };
  },
};

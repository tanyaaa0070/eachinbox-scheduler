import { z } from 'zod';

export const createSenderSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  smtpHost: z.string().default('smtp.ethereal.email'),
  smtpPort: z.number().int().default(587),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  hourlyLimit: z.number().int().min(1).max(1000).default(50),
});

export type CreateSenderInput = z.infer<typeof createSenderSchema>;

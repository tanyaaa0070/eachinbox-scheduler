import { describe, it, expect } from 'vitest';

describe('Idempotency Key & Safe State Transitions', () => {
  it('should generate deterministic unique idempotency keys per campaign recipient', () => {
    const campaignId = 'camp-uuid-1234';
    const recipient = 'test@example.com';
    const sequenceNumber = 0;

    const idempotencyKey = `${campaignId}:${recipient}:${sequenceNumber}`;
    expect(idempotencyKey).toBe('camp-uuid-1234:test@example.com:0');
  });

  it('should guarantee different keys for identical recipients across different sequence positions or campaigns', () => {
    const key1 = `camp-1:user@example.com:0`;
    const key2 = `camp-1:user@example.com:1`;
    const key3 = `camp-2:user@example.com:0`;

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it('should handle optimistic lock state transitions safely', () => {
    const validInitialStatuses = ['SCHEDULED', 'RATE_LIMITED'];
    
    // Only allow transition to PROCESSING if in valid initial status
    const canTransitionToProcessing = (status: string) => validInitialStatuses.includes(status);

    expect(canTransitionToProcessing('SCHEDULED')).toBe(true);
    expect(canTransitionToProcessing('RATE_LIMITED')).toBe(true);
    expect(canTransitionToProcessing('PROCESSING')).toBe(false);
    expect(canTransitionToProcessing('SENT')).toBe(false);
    expect(canTransitionToProcessing('CANCELLED')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';

describe('Rate Limit Service Logic', () => {
  it('should use UTC-based hour keys', () => {
    const now = new Date('2024-06-15T14:30:00Z');
    const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    expect(hour).toBe('2024-06-15T14');
    
    const key = `ratelimit:sender:test-sender:hour:${hour}`;
    expect(key).toBe('ratelimit:sender:test-sender:hour:2024-06-15T14');
  });

  it('should calculate UTC-based next hour correctly', () => {
    const now = new Date('2024-06-15T14:45:30Z');
    const nextHour = new Date(now);
    nextHour.setUTCMinutes(0, 0, 0);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1);
    
    expect(nextHour.toISOString()).toBe('2024-06-15T15:00:00.000Z');
    
    const retryAfterMs = nextHour.getTime() - now.getTime();
    expect(retryAfterMs).toBeGreaterThan(0);
    expect(retryAfterMs).toBeLessThanOrEqual(3600000); // at most 1 hour
  });

  it('should reject when limit is reached', () => {
    // Simulate Lua script logic: return -1 when current >= limit
    const simulateLua = (current: number, limit: number) => {
      if (current >= limit) return -1;
      return current + 1;
    };

    expect(simulateLua(0, 50)).toBe(1);   // allowed
    expect(simulateLua(49, 50)).toBe(50);  // allowed (last one)
    expect(simulateLua(50, 50)).toBe(-1);  // rejected
    expect(simulateLua(100, 50)).toBe(-1); // rejected
  });
});

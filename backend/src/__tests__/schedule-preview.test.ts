import { describe, it, expect } from 'vitest';

function calculateEstimatedCompletion(
  totalRecipients: number,
  delaySeconds: number,
  hourlyLimit: number
) {
  if (totalRecipients <= 0) return { totalMinutes: 0 };

  const delayTimeSeconds = totalRecipients * Math.max(0, delaySeconds);
  const hoursNeeded = Math.ceil(totalRecipients / Math.max(1, hourlyLimit));

  const delayBasedMinutes = delayTimeSeconds / 60;
  const rateLimitBasedMinutes = (hoursNeeded - 1) * 60 + ((totalRecipients % hourlyLimit || hourlyLimit) * delaySeconds) / 60;

  const totalMinutes = Math.round(Math.max(delayBasedMinutes, rateLimitBasedMinutes));
  return { totalMinutes };
}

describe('Schedule Completion Calculator', () => {
  it('should accurately calculate completion time when constrained by delay', () => {
    // 120 emails with 2s delay and 500/hr limit (delay is bottleneck)
    // 120 * 2 = 240s = 4 minutes
    const result = calculateEstimatedCompletion(120, 2, 500);
    expect(result.totalMinutes).toBe(4);
  });

  it('should accurately calculate completion time when constrained by hourly rate limits', () => {
    // 100 emails with 1s delay and 50/hr limit
    // Needs 2 hours (1st hour: 50 emails, 2nd hour: 50 emails)
    const result = calculateEstimatedCompletion(100, 1, 50);
    expect(result.totalMinutes).toBeGreaterThanOrEqual(60);
  });

  it('should return 0 minutes for empty recipient list', () => {
    const result = calculateEstimatedCompletion(0, 2, 50);
    expect(result.totalMinutes).toBe(0);
  });
});

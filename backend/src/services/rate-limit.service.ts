import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Redis-backed rate limiting using atomic Lua script.
 *
 * Key format: ratelimit:sender:{senderId}:hour:{YYYY-MM-DD-HH}
 *
 * The Lua script atomically:
 * 1. Increments the counter for the current hour window
 * 2. Sets expiry on first increment (auto-cleanup after 2 hours)
 * 3. Returns the current count
 *
 * This is safe under concurrent workers because Redis executes
 * Lua scripts atomically — no race conditions.
 */
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call("INCR", key)

if current == 1 then
  redis.call("EXPIRE", key, ttl)
end

return current
`;

function getHourKey(senderId: string): string {
  const now = new Date();
  const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  return `ratelimit:sender:${senderId}:hour:${hour}`;
}

export const rateLimitService = {
  /**
   * Check if the sender can send another email this hour.
   * Returns { allowed, current, limit, retryAfterMs }
   */
  async checkAndIncrement(senderId: string, hourlyLimit: number): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    retryAfterMs: number;
  }> {
    const key = getHourKey(senderId);
    const ttl = 7200; // 2 hours (buffer beyond the 1-hour window)

    const current = (await redis.eval(RATE_LIMIT_LUA, 1, key, hourlyLimit, ttl)) as number;

    if (current > hourlyLimit) {
      // Calculate time until next hour window
      const now = new Date();
      const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
      const retryAfterMs = nextHour.getTime() - now.getTime();

      // Decrement since we won't actually send
      await redis.decr(key);

      logger.warn(
        { senderId, current: current - 1, limit: hourlyLimit, retryAfterMs },
        'Rate limit reached for sender'
      );

      return { allowed: false, current: current - 1, limit: hourlyLimit, retryAfterMs };
    }

    return { allowed: true, current, limit: hourlyLimit, retryAfterMs: 0 };
  },

  /**
   * Get current usage for a sender without incrementing.
   */
  async getCurrentUsage(senderId: string): Promise<number> {
    const key = getHourKey(senderId);
    const val = await redis.get(key);
    return val ? parseInt(val, 10) : 0;
  },

  /**
   * Get rate limit info for all senders of a user.
   */
  async getSenderRateLimits(senders: Array<{ id: string; email: string; hourlyLimit: number }>): Promise<
    Array<{
      senderId: string;
      senderEmail: string;
      hourlyLimit: number;
      sentThisHour: number;
      remaining: number;
    }>
  > {
    const results = await Promise.all(
      senders.map(async (sender) => {
        const sentThisHour = await this.getCurrentUsage(sender.id);
        return {
          senderId: sender.id,
          senderEmail: sender.email,
          hourlyLimit: sender.hourlyLimit,
          sentThisHour,
          remaining: Math.max(0, sender.hourlyLimit - sentThisHour),
        };
      })
    );
    return results;
  },
};

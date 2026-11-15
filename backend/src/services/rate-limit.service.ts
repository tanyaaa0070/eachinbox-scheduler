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

local current = tonumber(redis.call("GET", key) or "0")

if current >= limit then
  return -1
end

local newVal = redis.call("INCR", key)

if newVal == 1 then
  redis.call("EXPIRE", key, ttl)
end

return newVal
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

    const result = (await redis.eval(RATE_LIMIT_LUA, 1, key, hourlyLimit, ttl)) as number;

    if (result === -1) {
      // Rate limited — calculate time until next hour window (UTC)
      const now = new Date();
      const nextHourUTC = new Date(now);
      nextHourUTC.setUTCMinutes(0, 0, 0);
      nextHourUTC.setUTCHours(nextHourUTC.getUTCHours() + 1);
      const retryAfterMs = nextHourUTC.getTime() - now.getTime();

      const currentUsage = await this.getCurrentUsage(senderId);

      logger.warn(
        { senderId, current: currentUsage, limit: hourlyLimit, retryAfterMs },
        'Rate limit reached for sender'
      );

      return { allowed: false, current: currentUsage, limit: hourlyLimit, retryAfterMs };
    }

    return { allowed: true, current: result, limit: hourlyLimit, retryAfterMs: 0 };
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

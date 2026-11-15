import 'dotenv/config';
import IORedis from 'ioredis';

async function test() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log("Connecting to Redis...");
  const redis = new IORedis(url, { maxRetriesPerRequest: null, connectTimeout: 5000 });
  
  try {
    await redis.set("tcp_test", "works");
    const val = await redis.get("tcp_test");
    console.log("Upstash TCP Redis result:", val);
  } catch (e) {
    console.error("TCP error:", e);
  } finally {
    redis.quit();
  }
}

test().catch(console.error);

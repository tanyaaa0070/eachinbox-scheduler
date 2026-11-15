/**
 * Worker Throughput Benchmark
 *
 * Measures actual job processing throughput (not just enqueue speed).
 * Creates a dedicated test queue, enqueues jobs, processes them, and
 * reports real throughput metrics.
 *
 * Usage: npx tsx src/scripts/worker-throughput-benchmark.ts
 */
import 'dotenv/config';
import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';

const BENCH_QUEUE = 'throughput-bench';
const TOTAL_JOBS = 100;

interface BenchJobData {
  index: number;
  enqueuedAt: number;
}

async function runThroughputBenchmark() {
  console.log('\n======================================================');
  console.log('⚡ Worker Throughput Benchmark');
  console.log('======================================================\n');

  const connection = createRedisConnection();
  const queue = new Queue<BenchJobData>(BENCH_QUEUE, { connection: createRedisConnection() });

  await queue.obliterate({ force: true });

  const latencies: number[] = [];
  let processedCount = 0;

  const allProcessed = new Promise<void>((resolve) => {
    const worker = new Worker<BenchJobData>(
      BENCH_QUEUE,
      async (job: Job<BenchJobData>) => {
        // Simulate lightweight email processing (DNS lookup, template render)
        await new Promise((r) => setTimeout(r, 10));
        latencies.push(Date.now() - job.data.enqueuedAt);
        processedCount++;
        if (processedCount >= TOTAL_JOBS) {
          setTimeout(async () => {
            await worker.close();
            resolve();
          }, 200);
        }
      },
      { connection: createRedisConnection(), concurrency: 5 }
    );

    setTimeout(async () => {
      await worker.close();
      resolve();
    }, 60000);
  });

  console.log(`📦 Enqueuing ${TOTAL_JOBS} jobs with 0 delay...`);
  const enqueueStart = Date.now();

  const jobs = Array.from({ length: TOTAL_JOBS }, (_, i) => ({
    name: 'bench-process',
    data: { index: i, enqueuedAt: Date.now() } as BenchJobData,
    opts: { jobId: `throughput-${i}-${Date.now()}`, attempts: 1 },
  }));

  await queue.addBulk(jobs);
  const enqueueDuration = Date.now() - enqueueStart;
  console.log(`   Enqueue took ${enqueueDuration}ms\n`);

  console.log('⏳ Processing jobs...');
  const processStart = Date.now();
  await allProcessed;
  const processDuration = Date.now() - processStart;

  // Calculate stats
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
  const throughput = Math.round((processedCount / (processDuration / 1000)));

  console.log('\n📊 ──────────── THROUGHPUT RESULTS ────────────');
  console.log(`   Jobs Processed      : ${processedCount} / ${TOTAL_JOBS}`);
  console.log(`   Processing Duration : ${processDuration}ms`);
  console.log(`   Throughput          : ${throughput} jobs/sec`);
  console.log(`   Latency P50         : ${p50}ms`);
  console.log(`   Latency P99         : ${p99}ms`);
  console.log('───────────────────────────────────────────────\n');

  await queue.obliterate({ force: true });
  await queue.close();
  await connection.quit();
  process.exit(processedCount >= TOTAL_JOBS ? 0 : 1);
}

runThroughputBenchmark().catch((err) => {
  console.error('❌ Benchmark error:', err);
  process.exit(1);
});

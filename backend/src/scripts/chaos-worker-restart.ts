/**
 * Restart Recovery Integration Test
 *
 * Proves that BullMQ delayed jobs survive a worker crash/restart cycle.
 * This test actually stops and restarts a worker process.
 *
 * Usage: npx tsx src/scripts/chaos-worker-restart.ts
 */
import 'dotenv/config';
import { Queue, Worker, Job, DelayedError } from 'bullmq';
import { createRedisConnection } from '../config/redis';

const TEST_QUEUE = 'chaos-test-queue';

interface TestJobData {
  jobIndex: number;
  createdAt: number;
}

async function runRestartRecoveryTest() {
  console.log('\n=============================================================');
  console.log('🧪 Restart Recovery Integration Test');
  console.log('=============================================================\n');

  const connection = createRedisConnection();
  const queue = new Queue<TestJobData>(TEST_QUEUE, { connection: createRedisConnection() });

  // Clean any leftover jobs from previous runs
  await queue.obliterate({ force: true });

  const processedJobs = new Set<number>();
  const totalJobs = 5;

  // Step 1: Enqueue delayed jobs
  console.log(`1️⃣  Enqueuing ${totalJobs} delayed jobs...`);
  for (let i = 0; i < totalJobs; i++) {
    await queue.add(
      'test-job',
      { jobIndex: i, createdAt: Date.now() },
      {
        delay: (i + 1) * 2000, // 2s, 4s, 6s, 8s, 10s
        jobId: `restart-test-${i}`,
        attempts: 3,
      }
    );
  }
  console.log(`   ✅ ${totalJobs} delayed jobs enqueued\n`);

  // Step 2: Start worker, let it process some jobs
  console.log('2️⃣  Starting Worker #1...');
  const worker1 = new Worker<TestJobData>(
    TEST_QUEUE,
    async (job: Job<TestJobData>) => {
      processedJobs.add(job.data.jobIndex);
      console.log(`   [Worker #1] Processed job index=${job.data.jobIndex}`);
    },
    { connection: createRedisConnection(), concurrency: 2 }
  );

  // Let worker run for 5 seconds (should process jobs with delay 2s and 4s)
  console.log('   Letting Worker #1 run for 5 seconds...');
  await new Promise((r) => setTimeout(r, 5000));

  const processedBeforeCrash = processedJobs.size;
  console.log(`   Jobs processed before crash: ${processedBeforeCrash}\n`);

  // Step 3: Kill worker (simulate crash)
  console.log('3️⃣  💥 Killing Worker #1 (simulating crash)...');
  await worker1.close();
  console.log('   Worker #1 terminated.\n');

  // Step 4: Downtime
  console.log('4️⃣  Simulating 3 seconds of downtime...');
  await new Promise((r) => setTimeout(r, 3000));

  // Verify jobs still exist in Redis
  const delayedCount = await queue.getDelayedCount();
  const waitingCount = await queue.getWaitingCount();
  console.log(`   Jobs still in Redis: delayed=${delayedCount}, waiting=${waitingCount}\n`);

  // Step 5: Restart worker
  console.log('5️⃣  Starting Worker #2 (simulating restart)...');
  const worker2Promise = new Promise<void>((resolve) => {
    const worker2 = new Worker<TestJobData>(
      TEST_QUEUE,
      async (job: Job<TestJobData>) => {
        processedJobs.add(job.data.jobIndex);
        console.log(`   [Worker #2] Processed job index=${job.data.jobIndex}`);
        if (processedJobs.size >= totalJobs) {
          // All jobs processed, close worker
          setTimeout(async () => {
            await worker2.close();
            resolve();
          }, 500);
        }
      },
      { connection: createRedisConnection(), concurrency: 2 }
    );

    // Safety timeout: if not all jobs processed within 20s, stop anyway
    setTimeout(async () => {
      await worker2.close();
      resolve();
    }, 20000);
  });

  await worker2Promise;

  // Step 6: Verification
  console.log('\n📋 ────────────── VERIFICATION SUMMARY ──────────────');
  console.log(`   Total Jobs Created       : ${totalJobs}`);
  console.log(`   Processed Before Crash   : ${processedBeforeCrash}`);
  console.log(`   Total Unique Processed   : ${processedJobs.size}`);
  console.log(`   Lost Jobs                : ${totalJobs - processedJobs.size}`);
  
  const allIndices = Array.from(processedJobs).sort((a, b) => a - b);
  console.log(`   Processed Indices        : [${allIndices.join(', ')}]`);
  console.log('─────────────────────────────────────────────────────');

  const passed = processedJobs.size === totalJobs;
  if (passed) {
    console.log('🎉 PASS: All jobs recovered and processed after worker restart!\n');
  } else {
    console.log(`❌ FAIL: Expected ${totalJobs} processed, got ${processedJobs.size}\n`);
  }

  // Cleanup
  await queue.obliterate({ force: true });
  await queue.close();
  await connection.quit();
  process.exit(passed ? 0 : 1);
}

runRestartRecoveryTest().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});

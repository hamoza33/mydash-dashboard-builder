import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

export const redisConnection = parseRedisUrl(redisUrl);

/**
 * Lazy-initialized BullMQ queue instance.
 * Avoids opening Redis connections at module import time,
 * which can cause unhandled errors during Next.js cold starts if Redis is unavailable.
 */
let _queue: Queue | null = null;

export function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("dashboard-pipeline", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return _queue;
}

/**
 * @deprecated Use getQueue() instead for lazy initialization.
 */
export const dashboardPipelineQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue().add(...args),
};

export type DashboardPipelineJobData = {
  runId: string;
  productName: string;
  lfProductId: string;
  dateFrom: string;
  dateTo: string;
  defaultCc: string;
  outputFilename: string;
};

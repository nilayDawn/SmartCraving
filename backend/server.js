const cluster = require("node:cluster");
const os = require("node:os");
const process = require("node:process");
const mongoose = require("mongoose");
const env = require("./src/config/env");
const logger = require("./src/core/utils/logger");

// 1. Calculate available cores safely (container/cgroup aware)
const availableCores = os.availableParallelism
  ? os.availableParallelism()
  : os.cpus().length;

// Container & environment detection (Render, Railway, Docker)
const isContainerEnv = Boolean(process.env.RENDER || process.env.CONTAINER);

// Render sets WEB_CONCURRENCY automatically (usually 1 on free/starter tiers)
// In production or containerized environments, default to 1 worker unless explicitly configured
const configuredWorkers = process.env.WEB_CONCURRENCY
  ? parseInt(process.env.WEB_CONCURRENCY, 10)
  : env.cluster?.workers || (env.isProduction || isContainerEnv ? 1 : availableCores);

const numWorkers = Math.max(1, configuredWorkers);

// Only fork cluster processes if clustering is enabled AND more than 1 worker is requested.
// On 1 worker (e.g. Render 512MB RAM tier), run as a single process without supervisor overhead.
const isClusterEnabled = Boolean(env.cluster?.enabled && numWorkers > 1);

// Configure threadpool size: 4 on production/constrained containers, 16 on local development
process.env.UV_THREADPOOL_SIZE = (
  env.uvThreadpoolSize || (env.isProduction || isContainerEnv || numWorkers <= 1 ? 4 : 16)
).toString();

logger.debug(`[Cluster] Available logical cores: ${availableCores}, Configured workers: ${numWorkers}`);
logger.debug(`[Cluster] Configured UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE}`);

// PRIMARY PROCESS (Supervisor) — Only active if clustering with multiple workers
if (isClusterEnabled && cluster.isPrimary) {
  console.log(`[Cluster] Available logical cores: ${availableCores}`);
  console.log(`[Cluster] Primary PID ${process.pid} is starting ${numWorkers} worker(s)...`);
  console.log(`[Cluster] Configured UV_THREADPOOL_SIZE per worker: ${process.env.UV_THREADPOOL_SIZE}`);

  // Fork child workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork({ UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE });
  }

  // Graceful worker recovery
  cluster.on("exit", (worker, code, signal) => {
    console.warn(
      `[Cluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}).`,
    );

    // Guard against instant crash-loops: delay respawn by 1s
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log("[Cluster] Spawning replacement worker in 1000ms...");
      setTimeout(() => {
        cluster.fork({ UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE });
      }, 1000);
    }
  });

  // Handle termination signals in primary to shut down workers cleanly
  const shutdown = (sig) => {
    console.log(`\n[Cluster] Received ${sig}. Terminating all workers...`);
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill(sig);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

} else {
  
  // WORKER / SINGLE PROCESS (HTTP + DB)
  
  const app = require("./app");

  let server;

  // Connect to MongoDB with bounded connection pool per process
  mongoose
    .connect(env.db.uri, {
      maxPoolSize: env.isProduction || isContainerEnv ? 10 : 25,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    .then(() => {
      console.log(`[Database] Worker ${process.pid} connected to MongoDB`);

      // Workers share the same port 4000 via Node's Round-Robin (rr) handle
      server = app.listen(env.port, () => {
        console.log(
          `[Server] Worker ${process.pid} listening on port ${env.port} (${env.nodeEnv})`,
        );
      });
    })
    .catch((err) => {
      console.error(`[Database Error] Worker ${process.pid} failed to connect:`, err.message);
      process.exit(1);
    });

  // Catch unexpected worker errors
  process.on("unhandledRejection", (err) => {
    console.error(`[Fatal] Worker ${process.pid} unhandled rejection:`, err);
    if (server) {
      server.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  });

  process.on("uncaughtException", (err) => {
    console.error(`[Fatal] Worker ${process.pid} uncaught exception:`, err);
    if (server) {
      server.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  });
}
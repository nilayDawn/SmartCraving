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
logger.debug(`[Cluster] Available logical cores: ${availableCores}`);
const numWorkers = env.cluster?.workers || availableCores;
logger.debug(`[Cluster] Configured number of workers: ${numWorkers}`);

// Calculate worker-level threadpool size (default 4 to 8 is optimal per worker process)
const calculatedPoolSize = Math.min(128, Math.max(4, Math.floor(availableCores / 2) || 4));
process.env.UV_THREADPOOL_SIZE = (
  env.uvThreadpoolSize || calculatedPoolSize
).toString();
logger.debug(`[Cluster] Configured UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE}`);

// PRIMARY PROCESS (Supervisor)

if (env.cluster?.enabled && cluster.isPrimary) {
  console.log(`[Cluster] Available logical cores: ${availableCores}`);
  console.log(`[Cluster] Primary PID ${process.pid} is starting ${numWorkers} workers...`);
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
  
  // WORKER PROCESS (HTTP + DB)
  
  const app = require("./app");

  let server;

  // Connect to MongoDB per worker process
  mongoose
    .connect(env.db.uri)
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
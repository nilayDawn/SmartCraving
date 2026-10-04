// SmartCraving - An AI-Powered Food Ordering and Restaurant Intelligence Platform
// Copyright (C) 2026  Nilay Dawn
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Expand libuv worker threadpool for native crypto / bcrypt operations
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "16";

const cluster = require("cluster");
const os = require("os");
const env = require("./src/config/env");
const logger = require("./src/core/utils/logger");

const isClusterEnabled = process.env.CLUSTER === "true";
const numWorkers = parseInt(process.env.WORKERS, 10) || os.cpus().length;

if (isClusterEnabled && cluster.isPrimary) {
  logger.info(`[Cluster] Primary process ${process.pid} is running. Forking ${numWorkers} workers...`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.warn(`[Cluster] Worker ${worker.process.pid} exited (${signal || code}). Spawning replacement...`);
    cluster.fork();
  });

  const shutdownCluster = () => {
    logger.info("[Cluster] Shutting down all workers...");
    for (const id in cluster.workers) {
      cluster.workers[id].process.kill();
    }
    process.exit(0);
  };

  process.on("SIGTERM", shutdownCluster);
  process.on("SIGINT", shutdownCluster);
} else {
  const app = require("./src/app");
  const { connectDatabase, disconnectDatabase } = require("./src/core/database");

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    logger.error(`[Fatal] Uncaught Exception: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });

  // Connect to persistence database
  connectDatabase();

  // Start HTTP Server
  const server = app.listen(env.port, () => {
    logger.success(
      `[Server] SmartCraving Backend (PID: ${process.pid}) running on PORT: ${env.port} in ${env.nodeEnv} mode.`,
    );
  });

  // Handle unhandled Promise rejections
  process.on("unhandledRejection", (err) => {
    logger.error(`[Fatal] Unhandled Promise Rejection: ${err.message}`);
    server.close(() => {
      logger.info("[Server] Closing database connection...");
      disconnectDatabase().finally(() => {
        process.exit(1);
      });
    });
  });

  // Graceful shutdown on termination signals
  const gracefulShutdown = (signal) => {
    logger.info(`[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      logger.success("[Server] HTTP server closed.");
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

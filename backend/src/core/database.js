const mongoose = require("mongoose");
const env = require("../config/env");
const logger = require("../core/utils/logger");

const connectDatabase = async () => {
  if(mongoose.connection.readyState === 1) {
    logger.info("[Database] MongoDB is already connected.");
    return mongoose.connection;
  }
  else if(mongoose.connection.readyState === 2) {
    logger.info("[Database] MongoDB connection is in progress.");
    return new Promise((resolve, reject) => {
      mongoose.connection.once("connected", () => {
        logger.success("[Database] MongoDB connected successfully.");
        resolve(mongoose.connection);
      });
      mongoose.connection.once("error", (error) => {
        logger.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
        reject(error);
      });
    });
  }
  try {
     logger.debug("[Database] Attempting to connect to MongoDB...");
    // logger.debug(`[Database] Connection URI: ${env.db.uri}`);
    const conn = await mongoose.connect(env.db.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.success(`[Database] MongoDB connected successfully with HOST: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info("[Database] MongoDB connection closed.");
  } catch (error) {
    logger.error(`[Database Error] Error during disconnection: ${error.message}`);
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
};

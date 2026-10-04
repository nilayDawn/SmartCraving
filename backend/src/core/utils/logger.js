const colors = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const timestamp = () =>
  new Date().toLocaleTimeString("en-IN", {
    hour12: false,
  });

const log = (level, color, message, ...args) => {
  const time = `${colors.gray}${timestamp()}${colors.reset}`;
  const label = `${color}${level.padEnd(5)}${colors.reset}`;

  console.log(`${time} ${label} ${message}`, ...args);
};

const logger = {
  info(message, ...args) {
    log("INFO", colors.cyan, message, ...args);
  },

  success(message, ...args) {
    log("OK", colors.green, message, ...args);
  },

  warn(message, ...args) {
    log("WARN", colors.yellow, message, ...args);
  },

  error(message, ...args) {
    log("ERROR", colors.red, message, ...args);
  },

  debug(message, ...args) {
    log("DEBUG", colors.magenta, message, ...args);
  },
};

module.exports = logger;
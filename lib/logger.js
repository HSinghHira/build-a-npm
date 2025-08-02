const fs = require("fs");
const path = require("path");

class Logger {
  constructor() {
    this.verbose = false;
    this.logFile = path.join(process.cwd(), "build-a-npm.log");
  }

  setVerbose(verbose) {
    this.verbose = verbose;
    if (verbose && !fs.existsSync(this.logFile)) {
      fs.writeFileSync(
        this.logFile,
        `Log started at ${new Date().toISOString()}\n`
      );
    }
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (this.verbose) {
      fs.appendFileSync(
        this.logFile,
        `${formattedMessage}\n${args
          .map((arg) => JSON.stringify(arg, null, 2))
          .join("\n")}\n`
      );
    }
    if (level === "error" || this.verbose) {
      console[level === "error" ? "error" : "log"](formattedMessage, ...args);
    }
  }

  info(message, ...args) {
    this.log("info", message, ...args);
  }

  debug(message, ...args) {
    this.log("debug", message, ...args);
  }

  warn(message, ...args) {
    this.log("warn", message, ...args);
  }

  error(message, ...args) {
    this.log("error", message, ...args);
  }
}

module.exports = new Logger();

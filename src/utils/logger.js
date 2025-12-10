const winston = require("winston");
const path = require("path");

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "educore-backend" },
  transports: [],
});

// 💡 Only write logs to files if NOT in serverless/production environment
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/combined.log"),
      maxsize: 5242880,
      maxFiles: 5,
    })
  );

  // Console logging for local dev
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
} else {
  // 💡 Production log → console (Vercel otomatis simpan)
  logger.add(new winston.transports.Console());
}

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;

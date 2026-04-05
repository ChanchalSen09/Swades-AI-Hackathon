type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const writeLog = (level: LogLevel, message: string, context?: LogContext): void => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  };

  const serializedPayload = JSON.stringify(payload);

  switch (level) {
    case "debug": {
      console.debug(serializedPayload);
      return;
    }
    case "info": {
      console.info(serializedPayload);
      return;
    }
    case "warn": {
      console.warn(serializedPayload);
      return;
    }
    case "error": {
      console.error(serializedPayload);
      return;
    }
  }
};

export const logger = {
  debug: (message: string, context?: LogContext) => writeLog("debug", message, context),
  info: (message: string, context?: LogContext) => writeLog("info", message, context),
  warn: (message: string, context?: LogContext) => writeLog("warn", message, context),
  error: (message: string, context?: LogContext) => writeLog("error", message, context),
};

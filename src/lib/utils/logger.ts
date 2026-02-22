type LogLevel = 'INFO' | 'ERROR' | 'DEBUG';

interface LogContext {
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(formatLog('INFO', message, context));
  },

  error(message: string, context?: LogContext) {
    console.error(formatLog('ERROR', message, context));
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog('DEBUG', message, context));
    }
  },
};

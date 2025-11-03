import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
  })
);

// Check if we're running in a packaged environment (pkg, electron asar, etc.)
const isPkgBundle = (process as any).pkg !== undefined;
const isElectronApp = process.env.ELECTRON_APP === 'true';
const isElectronPackaged = (process as any).defaultApp === false || /[\\/]electron\.exe$/i.test(process.execPath);

const transports: winston.transport[] = [
  // Console logging (always available)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  })
];

// Only add file logging in development mode (not in packaged apps or Electron)
if (!isPkgBundle && !isElectronPackaged && !isElectronApp) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log')
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports
});

// Create logs directory if it doesn't exist (only in development, not in Electron)
import fs from 'fs';
const logsDir = path.join(__dirname, '../../logs');

if (!isPkgBundle && !isElectronPackaged && !isElectronApp && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

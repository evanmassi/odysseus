/**
 * Application Logger
 *
 * Winston-based logger with console output and optional daily-rotated file logging.
 */

import fs from 'fs';
import path from 'path';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
  })
);

// .pkg and .defaultApp are runtime-only properties not in Node.js type definitions
const isPkgBundle = (process as any).pkg !== undefined;
const isElectronApp = process.env.ELECTRON_APP === 'true';
const isElectronPackaged = (process as any).defaultApp === false || /[\\/]electron\.exe$/i.test(process.execPath);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  })
];

if (!isPkgBundle && !isElectronPackaged && !isElectronApp) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../../../logs/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '7d',
      zippedArchive: true
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, '../../../logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '7d',
      zippedArchive: true
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports
});

const logsDir = path.join(__dirname, '../../../logs');

if (!isPkgBundle && !isElectronPackaged && !isElectronApp && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

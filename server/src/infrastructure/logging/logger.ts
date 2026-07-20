/**
 * Application Logger
 *
 * Winston-based logger with console output and daily-rotated file logging.
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

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), logFormat),
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, '../../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '10m',
    maxFiles: '7d',
    zippedArchive: true,
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, '../../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '7d',
    zippedArchive: true,
  }),
];

export const logger = winston.createLogger({
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty LOG_LEVEL should fall through to 'info'
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
});

const logsDir = path.join(__dirname, '../../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

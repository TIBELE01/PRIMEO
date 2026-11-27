// Winston logger — structured JSON in production, colorized in development
import * as winston from 'winston';
import { LogtailTransport } from './logtail.transport';

const { combine, timestamp, printf, colorize, errors } = winston.format;

import { redactSecrets } from './redact';
export { redactSecrets };

const redact = winston.format((info) => {
  const cleaned = redactSecrets({ ...info }) as Record<string, unknown>;
  for (const k of Object.keys(info)) if (!(k in cleaned)) delete (info as Record<string, unknown>)[k];
  Object.assign(info, cleaned);
  return info;
});

const devFormat = combine(
  redact(),
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) =>
    stack ? `${timestamp} ${level}: ${message}\n${stack}` : `${timestamp} ${level}: ${message}`
  )
);

const prodFormat = combine(errors({ stack: true }), redact(), timestamp(), winston.format.json());

const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
    ...(logtailToken ? [new LogtailTransport(logtailToken)] : []),
  ],
});

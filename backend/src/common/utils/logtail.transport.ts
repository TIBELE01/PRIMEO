import Transport from 'winston-transport';
import axios from 'axios';

interface LogtailEntry {
  dt: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

const ENDPOINT = 'https://in.logtail.com/';
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 100;

export class LogtailTransport extends Transport {
  private readonly token: string;
  private buffer: LogtailEntry[] = [];

  constructor(token: string, opts?: Transport.TransportStreamOptions) {
    super(opts);
    this.token = token;
    const timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    // Don't keep the process alive just because of the flush timer
    timer.unref();
  }

  log(info: Record<string, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));
    const { level, message, timestamp, ...meta } = info;
    this.buffer.push({
      dt: (timestamp as string) ?? new Date().toISOString(),
      level: String(level),
      message: String(message),
      ...meta,
    });
    if (this.buffer.length >= MAX_BATCH_SIZE) this.flush();
    callback();
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, MAX_BATCH_SIZE);
    axios
      .post(ENDPOINT, batch, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 5_000,
      })
      .catch(() => null); // fire-and-forget — never block logging
  }
}

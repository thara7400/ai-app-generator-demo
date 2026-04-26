/**
 * pino ロガー設定
 * NODE_ENV=development のとき pino-pretty で整形出力、本番は JSON 1行
 */
import pino from 'pino';

const isDev = process.env['NODE_ENV'] !== 'production';
const level = process.env['LOG_LEVEL'] ?? 'info';

export const logger = pino(
  { level },
  isDev
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true } })
    : undefined
);

export default logger;

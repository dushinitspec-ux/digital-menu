import type { Config } from './config';
import type { Db } from './db';
import type { Realtime } from './realtime';
import type { Storage } from './storage';

export interface Ctx {
  sql: Db;
  config: Config;
  storage: Storage;
  realtime: Realtime;
}

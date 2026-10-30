import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Config } from './config';

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  url(key: string): string;
  /** Каталог для раздачи файлов самим API; null, если медиа отдаёт S3/CDN. */
  localDir: string | null;
}

/** Ключи содержат случайный UUID и не меняются, поэтому кэшируются навсегда. */
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

class LocalStorage implements Storage {
  constructor(
    public readonly localDir: string,
    private readonly baseUrl: string,
  ) {}

  private resolve(key: string) {
    const full = path.resolve(this.localDir, key);
    if (!full.startsWith(path.resolve(this.localDir) + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key: string, body: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async remove(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  url(key: string) {
    return `${this.baseUrl}/${key}`;
  }
}

/** Любое S3-совместимое хранилище: Yandex Object Storage, Selectel, Hetzner, Scaleway. */
class S3Storage implements Storage {
  readonly localDir = null;
  private readonly client: S3Client;

  constructor(
    private readonly cfg: Config['storage']['s3'],
    private readonly baseUrl: string,
  ) {
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: true,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.cfg.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: IMMUTABLE_CACHE }),
    );
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }

  url(key: string) {
    return `${this.baseUrl}/${key}`;
  }
}

export function createStorage(config: Config): Storage {
  const { driver, dir, mediaBaseUrl, s3 } = config.storage;
  return driver === 's3' ? new S3Storage(s3, mediaBaseUrl) : new LocalStorage(dir, mediaBaseUrl);
}

import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(key, expected);
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const pairingCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

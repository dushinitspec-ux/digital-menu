import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

export const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
export const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export interface ProcessedImage {
  main: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

/** Фото позиций и фоны: webp до 1920 px по длинной стороне и превью 640 px для экрана. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const base = sharp(input, { failOn: 'error' }).rotate();
  const main = await base
    .clone()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return { main: main.data, thumb, width: main.info.width, height: main.info.height };
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-2000);
    });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}: ${stderr}`))));
  });
}

let ffmpegAvailable: Promise<boolean> | null = null;
export function hasFfmpeg(): Promise<boolean> {
  ffmpegAvailable ??= run('ffmpeg', ['-version']).then(
    () => true,
    () => false,
  );
  return ffmpegAvailable;
}

export interface ProcessedVideo {
  video: Buffer;
  poster: Buffer;
  width: number;
  height: number;
}

/**
 * Видео-фон: H.264 High, не больше 1920×1080, 30 fps, без звука, moov в начале файла.
 * Такой файл декодирует аппаратно почти любая ТВ-приставка, и он сразу начинает играть.
 */
export async function processVideo(input: Buffer): Promise<ProcessedVideo> {
  const dir = await mkdtemp(path.join(tmpdir(), 'dm-video-'));
  try {
    const src = path.join(dir, 'in');
    const out = path.join(dir, 'out.mp4');
    const poster = path.join(dir, 'poster.jpg');
    await writeFile(src, input);
    await run('ffmpeg', [
      '-y', '-i', src,
      '-an',
      '-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
      '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast', '-crf', '24', '-maxrate', '6M', '-bufsize', '12M',
      '-movflags', '+faststart',
      out,
    ]);
    await run('ffmpeg', ['-y', '-ss', '0.5', '-i', out, '-frames:v', '1', poster]);
    const video = await readFile(out);
    const meta = await sharp(await readFile(poster)).metadata();
    const posterWebp = await sharp(await readFile(poster)).resize({ width: 640, height: 640, fit: 'inside' }).webp({ quality: 78 }).toBuffer();
    return { video, poster: posterWebp, width: meta.width ?? 0, height: meta.height ?? 0 };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

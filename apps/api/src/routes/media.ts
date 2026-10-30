import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { audit, requireOrg } from '../auth';
import type { Ctx } from '../context';
import { HttpError, isUuid, notFound } from '../http';
import { mediaView } from '../manifest';
import { hasFfmpeg, IMAGE_TYPES, MAX_IMAGE_BYTES, processImage, processVideo, VIDEO_TYPES } from '../media-processing';

interface MediaRow {
  id: string;
  kind: 'image' | 'video';
  storageKey: string;
  thumbKey: string | null;
  width: number | null;
  height: number | null;
  status: string;
  originalName: string;
  sizeBytes: string;
  createdAt: Date;
}

export function registerMediaRoutes(app: FastifyInstance, { sql, storage, realtime, config }: Ctx) {
  const P = '/api/orgs/:orgId';
  const view = (m: MediaRow) => ({
    ...mediaView(storage, m),
    status: m.status,
    originalName: m.originalName,
    sizeBytes: Number(m.sizeBytes),
    createdAt: m.createdAt,
  });

  app.get(`${P}/media`, async (req) => {
    const ctx = await requireOrg(sql, req, 'viewer');
    const rows = await sql<MediaRow[]>`select * from media where org_id = ${ctx.org.id} order by created_at desc limit 500`;
    return rows.map(view);
  });

  app.post(`${P}/media`, async (req, reply) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const file = await req.file({ limits: { fileSize: config.maxUploadBytes, files: 1 } });
    if (!file) throw new HttpError(400, 'no_file');
    const mime = file.mimetype;
    const isImage = IMAGE_TYPES.has(mime);
    const isVideo = VIDEO_TYPES.has(mime);
    if (!isImage && !isVideo) throw new HttpError(415, 'unsupported_type');
    const buffer = await file.toBuffer();
    if (file.file.truncated) throw new HttpError(413, 'file_too_large');
    if (isImage && buffer.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'file_too_large');

    const id = randomUUID();
    const orgId = ctx.org.id;
    const originalName = file.filename.slice(0, 200);

    if (isImage) {
      let processed;
      try {
        processed = await processImage(buffer);
      } catch {
        throw new HttpError(400, 'invalid_image');
      }
      const key = `${orgId}/${id}.webp`;
      const thumbKey = `${orgId}/${id}-thumb.webp`;
      await storage.put(key, processed.main, 'image/webp');
      await storage.put(thumbKey, processed.thumb, 'image/webp');
      const [row] = await sql<MediaRow[]>`
        insert into media (id, org_id, kind, storage_key, thumb_key, mime, size_bytes, width, height, original_name)
        values (${id}, ${orgId}, 'image', ${key}, ${thumbKey}, 'image/webp', ${processed.main.length},
                ${processed.width}, ${processed.height}, ${originalName})
        returning *`;
      await audit(sql, ctx, 'create', 'media', id, { name: originalName });
      return reply.code(201).send(view(row!));
    }

    // Видео: если ffmpeg есть, перекодируем в фоне; без ffmpeg сохраняем как есть (рекомендуем H.264 MP4).
    const transcode = await hasFfmpeg();
    const ext = mime === 'video/webm' ? 'webm' : 'mp4';
    const key = `${orgId}/${id}.${transcode ? 'mp4' : ext}`;
    if (!transcode) await storage.put(key, buffer, mime);
    const [row] = await sql<MediaRow[]>`
      insert into media (id, org_id, kind, storage_key, mime, size_bytes, original_name, status)
      values (${id}, ${orgId}, 'video', ${key}, ${transcode ? 'video/mp4' : mime}, ${buffer.length}, ${originalName},
              ${transcode ? 'processing' : 'ready'})
      returning *`;
    await audit(sql, ctx, 'create', 'media', id, { name: originalName });
    if (transcode) {
      void (async () => {
        try {
          const out = await processVideo(buffer);
          const thumbKey = `${orgId}/${id}-thumb.webp`;
          await storage.put(key, out.video, 'video/mp4');
          await storage.put(thumbKey, out.poster, 'image/webp');
          await sql`update media set status = 'ready', thumb_key = ${thumbKey}, size_bytes = ${out.video.length},
                      width = ${out.width}, height = ${out.height} where id = ${id}`;
        } catch (err) {
          req.log.error({ err, mediaId: id }, 'video processing failed');
          await sql`update media set status = 'failed' where id = ${id}`;
        }
        realtime.orgChanged(orgId);
      })();
    }
    return reply.code(201).send(view(row!));
  });

  app.delete(`${P}/media/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const { id } = req.params as { id: string };
    if (!isUuid(id)) throw notFound();
    const [row] = await sql<MediaRow[]>`delete from media where id = ${id} and org_id = ${ctx.org.id} returning *`;
    if (!row) throw notFound();
    await storage.remove(row.storageKey);
    if (row.thumbKey) await storage.remove(row.thumbKey);
    await audit(sql, ctx, 'delete', 'media', id);
    realtime.orgChanged(ctx.org.id);
    return { ok: true };
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { api, ApiError, type Media } from './api';
import { useT } from './i18n';
import { useOrg } from './session';
import { Button, Sheet, Spinner, useToast } from './ui';

export function useMedia() {
  const { base, org } = useOrg();
  return useQuery({
    queryKey: ['media', org.id],
    queryFn: () => api.get<Media[]>(`${base}/media`),
    refetchInterval: (q) => (q.state.data?.some((m) => m.status === 'processing') ? 3000 : false),
  });
}

export function useUpload() {
  const { base, org } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useT();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<Media>(`${base}/media`, form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media', org.id] }),
    onError: (err) => toast(err instanceof ApiError ? `${t('error')}: ${err.code}` : t('error'), 'error'),
  });
}

export function UploadButton({ accept = 'image/*,video/mp4,video/webm,video/quicktime', onUploaded }: { accept?: string; onUploaded?: (m: Media) => void }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload();
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const media = await upload.mutateAsync(file);
          onUploaded?.(media);
        }}
      />
      <Button variant="soft" disabled={upload.isPending} onClick={() => input.current?.click()}>
        {upload.isPending ? t('processing') : t('upload')}
      </Button>
    </>
  );
}

export function MediaThumb({ media }: { media: Media }) {
  const t = useT();
  if (media.status !== 'ready') return <div className="thumb thumb-status">{media.status === 'processing' ? t('processing') : t('failed')}</div>;
  return (
    <div className="thumb">
      <img src={media.thumbUrl ?? media.url} alt="" loading="lazy" />
      {media.kind === 'video' ? <span className="thumb-badge">▶</span> : null}
    </div>
  );
}

export function MediaPicker({
  open,
  kinds,
  onClose,
  onPick,
}: {
  open: boolean;
  kinds: ('image' | 'video')[];
  onClose: () => void;
  onPick: (m: Media) => void;
}) {
  const t = useT();
  const media = useMedia();
  const items = (media.data ?? []).filter((m) => kinds.includes(m.kind));
  return (
    <Sheet open={open} title={t('media')} onClose={onClose}>
      <div className="row-between">
        <span className="muted small">{t('uploadHint')}</span>
        <UploadButton
          accept={kinds.includes('video') ? undefined : 'image/*'}
          onUploaded={(m) => {
            if (m.status === 'ready') {
              onPick(m);
              onClose();
            }
          }}
        />
      </div>
      {media.isLoading ? <Spinner /> : null}
      <div className="media-grid">
        {items.map((m) => (
          <button
            type="button"
            key={m.id}
            className="media-cell"
            disabled={m.status !== 'ready'}
            onClick={() => {
              onPick(m);
              onClose();
            }}
          >
            <MediaThumb media={m} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

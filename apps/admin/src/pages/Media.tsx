import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useT } from '../i18n';
import { MediaThumb, UploadButton, useMedia } from '../media-picker';
import { useOrg } from '../session';
import { Empty, PageHead, Spinner, useConfirm } from '../ui';

export function MediaPage() {
  const t = useT();
  const ask = useConfirm();
  const { base, org, canEdit } = useOrg();
  const qc = useQueryClient();
  const media = useMedia();
  const remove = async (id: string) => {
    if (!(await ask(t('confirmDelete')))) return;
    await api.del(`${base}/media/${id}`);
    await qc.invalidateQueries({ queryKey: ['media', org.id] });
  };
  if (media.isLoading) return <Spinner />;
  return (
    <div className="page">
      <PageHead title={t('media')} hint={t('uploadHint')} actions={canEdit ? <UploadButton /> : null} />
      {media.data?.length === 0 ? <Empty>{t('noMedia')}</Empty> : null}
      <div className="media-grid">
        {media.data?.map((m) => (
          <div key={m.id} className="media-cell">
            <MediaThumb media={m} />
            <div className="media-meta">
              <span className="small ellipsis">{m.originalName}</span>
              {canEdit ? (
                <button type="button" className="link-btn danger small" onClick={() => void remove(m.id)}>
                  {t('delete')}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

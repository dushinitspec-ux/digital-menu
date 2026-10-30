import { TEMPLATE_INFO } from '@dm/shared';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api, type Catalog, type Scene } from '../api';
import { useT } from '../i18n';
import { useOrg } from '../session';
import { Button, Empty, PageHead, Spinner, useToast } from '../ui';

export function useScenes() {
  const { base, org } = useOrg();
  return useQuery({ queryKey: ['scenes', org.id], queryFn: () => api.get<Scene[]>(`${base}/scenes`) });
}

export function ScenesPage() {
  const t = useT();
  const { base, org, canEdit } = useOrg();
  const navigate = useNavigate();
  const toast = useToast();
  const scenes = useScenes();
  const catalog = useQuery({ queryKey: ['catalog', org.id], queryFn: () => api.get<Catalog>(`${base}/catalog`) });

  const create = async () => {
    try {
      const template = org.businessType === 'coffee' || org.businessType === 'cafe' ? 'crema' : 'noir';
      const scene = await api.post<Scene>(`${base}/scenes`, {
        name: t('newScene'),
        template,
        settings: { categoryIds: (catalog.data?.categories ?? []).map((c) => c.id), title: org.name },
      });
      navigate(`/scenes/${scene.id}`);
    } catch {
      toast(t('error'), 'error');
    }
  };

  if (scenes.isLoading) return <Spinner />;
  return (
    <div className="page">
      <PageHead title={t('scenes')} hint={t('scenesHint')} actions={canEdit ? <Button onClick={() => void create()}>{t('newScene')}</Button> : null} />
      {scenes.data?.length === 0 ? <Empty>—</Empty> : null}
      <div className="card-grid">
        {scenes.data?.map((s) => (
          <button type="button" key={s.id} className={`card scene-card tpl-swatch-${s.template}`} onClick={() => navigate(`/scenes/${s.id}`)}>
            <div className="scene-swatch">
              <span>{s.settings.title || s.name}</span>
            </div>
            <div className="scene-meta">
              <strong>{s.name}</strong>
              <span className="muted small">
                {TEMPLATE_INFO[s.template].name} · {s.settings.categoryIds.length} {t('categoriesOnScreen').toLowerCase()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

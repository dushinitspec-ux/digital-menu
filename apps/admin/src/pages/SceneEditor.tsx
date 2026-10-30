import { TEMPLATE_IDS, TEMPLATE_INFO, type Orientation, type SceneSettings, type TemplateId } from '@dm/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ApiError, type Catalog } from '../api';
import { useT } from '../i18n';
import { MediaPicker, MediaThumb, useMedia } from '../media-picker';
import { buildLocalScene, ScenePreview } from '../preview';
import { useOrg } from '../session';
import { Button, Field, PageHead, Spinner, Switch, useToast } from '../ui';
import { useScenes } from './Scenes';

export function SceneEditorPage() {
  const t = useT();
  const { id } = useParams();
  const { base, org, canEdit } = useOrg();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const scenes = useScenes();
  const catalog = useQuery({ queryKey: ['catalog', org.id], queryFn: () => api.get<Catalog>(`${base}/catalog`) });
  const media = useMedia();
  const scene = scenes.data?.find((s) => s.id === id);

  const [name, setName] = useState('');
  const [template, setTemplate] = useState<TemplateId>('noir');
  const [settings, setSettings] = useState<SceneSettings | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [picker, setPicker] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (scene && !settings) {
      setName(scene.name);
      setTemplate(scene.template);
      setSettings(scene.settings);
    }
  }, [scene, settings]);

  const preview = useMemo(
    () =>
      settings && catalog.data
        ? buildLocalScene(id!, name, template, settings, catalog.data, media.data ?? [], org.locale)
        : null,
    [id, name, template, settings, catalog.data, media.data, org.locale],
  );

  if (!settings || !catalog.data || !preview) return <Spinner />;
  const set = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
    setSettings({ ...settings, [key]: value });
    setDirty(true);
  };

  const toggleCategory = (cid: string) =>
    set('categoryIds', settings.categoryIds.includes(cid) ? settings.categoryIds.filter((x) => x !== cid) : [...settings.categoryIds, cid]);
  const moveCategory = (cid: string, dir: -1 | 1) => {
    const ids = [...settings.categoryIds];
    const i = ids.indexOf(cid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    set('categoryIds', ids);
  };

  const save = async () => {
    try {
      await api.patch(`${base}/scenes/${id}`, { name, template, settings });
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ['scenes', org.id] });
      toast(t('saved'));
    } catch {
      toast(t('error'), 'error');
    }
  };
  const remove = async () => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.del(`${base}/scenes/${id}`);
      await qc.invalidateQueries({ queryKey: ['scenes', org.id] });
      navigate('/scenes');
    } catch (err) {
      toast(err instanceof ApiError && err.code === 'scene_in_use' ? t('sceneInUse') : t('error'), 'error');
    }
  };

  const bg = media.data?.find((m) => m.id === settings.backgroundMediaId);
  const ordered = [
    ...settings.categoryIds.map((cid) => catalog.data!.categories.find((c) => c.id === cid)).filter(Boolean),
    ...catalog.data.categories.filter((c) => !settings.categoryIds.includes(c.id)),
  ] as Catalog['categories'];

  return (
    <div className="page page-wide">
      <PageHead
        title={name || t('scenes')}
        actions={
          canEdit ? (
            <>
              <Button variant="danger" onClick={() => void remove()}>
                {t('delete')}
              </Button>
              <Button disabled={!dirty} onClick={() => void save()}>
                {t('save')}
              </Button>
            </>
          ) : null
        }
      />
      <div className="editor">
        <div className="editor-preview">
          <div className="sticky">
            <div className="row-between">
              <span className="muted small">{t('preview')}</span>
              <div className="seg">
                {(['landscape', 'portrait'] as const).map((o) => (
                  <button type="button" key={o} className={orientation === o ? 'is-on' : ''} onClick={() => setOrientation(o)}>
                    {t(o)}
                  </button>
                ))}
              </div>
            </div>
            <ScenePreview scene={preview} currency={org.currency} locale={org.locale} orientation={orientation} />
          </div>
        </div>
        <fieldset className="editor-form" disabled={!canEdit}>
          <Field label={t('name')}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <Field label={t('template')} group>
            <div className="tpl-grid">
              {TEMPLATE_IDS.map((tpl) => (
                <button
                  type="button"
                  key={tpl}
                  className={`tpl-card tpl-swatch-${tpl}${template === tpl ? ' is-on' : ''}`}
                  onClick={() => {
                    setTemplate(tpl);
                    setDirty(true);
                  }}
                >
                  <span className="tpl-name">{TEMPLATE_INFO[tpl].name}</span>
                  <span className="tpl-desc">{TEMPLATE_INFO[tpl].description[org.locale]}</span>
                </button>
              ))}
            </div>
          </Field>
          <div className="grid-2">
            <Field label={t('title')}>
              <input value={settings.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label={t('subtitle')}>
              <input value={settings.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
            </Field>
          </div>
          <Field label={t('categoriesOnScreen')} group>
            <ul className="cat-pick">
              {ordered.map((c) => {
                const on = settings.categoryIds.includes(c.id);
                return (
                  <li key={c.id} className={on ? 'is-on' : ''}>
                    <label>
                      <input type="checkbox" checked={on} onChange={() => toggleCategory(c.id)} /> {c.name}
                    </label>
                    {on ? (
                      <span>
                        <button type="button" className="icon-btn" onClick={() => moveCategory(c.id, -1)} aria-label={t('moveUp')}>
                          ↑
                        </button>
                        <button type="button" className="icon-btn" onClick={() => moveCategory(c.id, 1)} aria-label={t('moveDown')}>
                          ↓
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Field>
          <Field label={t('background')} group>
            <div className="photo-row">
              {bg ? <MediaThumb media={bg} /> : <span className="muted">{t('noBackground')}</span>}
              <Button variant="soft" onClick={() => setPicker(true)}>
                {t('choosePhoto')}
              </Button>
              {bg ? (
                <Button variant="ghost" onClick={() => set('backgroundMediaId', null)}>
                  {t('removePhoto')}
                </Button>
              ) : null}
            </div>
          </Field>
          {bg ? (
            <Field label={`${t('backgroundDim')}: ${Math.round(settings.backgroundDim * 100)}%`}>
              <input type="range" min={0} max={0.9} step={0.05} value={settings.backgroundDim} onChange={(e) => set('backgroundDim', Number(e.target.value))} />
            </Field>
          ) : null}
          <div className="grid-2">
            <Field label={t('accentColor')} group>
              <div className="photo-row">
                <input type="color" value={settings.accentColor ?? '#c9a96a'} onChange={(e) => set('accentColor', e.target.value)} />
                {settings.accentColor ? (
                  <Button variant="ghost" size="sm" onClick={() => set('accentColor', null)}>
                    {t('defaultColor')}
                  </Button>
                ) : null}
              </div>
            </Field>
            <Field label={t('columns')}>
              <select value={settings.columns ?? ''} onChange={(e) => set('columns', e.target.value ? Number(e.target.value) : null)}>
                <option value="">{t('auto')}</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="switch-list">
            <Switch checked={settings.showImages} onChange={(v) => set('showImages', v)} label={t('showImages')} />
            <Switch checked={settings.showDescriptions} onChange={(v) => set('showDescriptions', v)} label={t('showDescriptions')} />
            <Switch checked={settings.showSecondaryNames} onChange={(v) => set('showSecondaryNames', v)} label={t('showSecondaryNames')} />
          </div>
          <div className="grid-2">
            <Field label={t('soldOutMode')}>
              <select value={settings.soldOutMode} onChange={(e) => set('soldOutMode', e.target.value as SceneSettings['soldOutMode'])}>
                <option value="mark">{t('soldOutMark')}</option>
                <option value="hide">{t('soldOutHide')}</option>
              </select>
            </Field>
            <Field label={t('pageDuration')}>
              <input type="number" min={4} max={120} value={settings.pageDurationSec} onChange={(e) => set('pageDurationSec', Number(e.target.value) || 12)} />
            </Field>
          </div>
          <Field label={t('footerNote')}>
            <input value={settings.footerNote} onChange={(e) => set('footerNote', e.target.value)} />
          </Field>
        </fieldset>
      </div>
      <MediaPicker open={picker} kinds={['image', 'video']} onClose={() => setPicker(false)} onPick={(m) => set('backgroundMediaId', m.id)} />
    </div>
  );
}

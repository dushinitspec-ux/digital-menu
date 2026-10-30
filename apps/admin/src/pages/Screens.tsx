import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, ApiError, type Location, type Screen } from '../api';
import { useT } from '../i18n';
import { useOrg } from '../session';
import { Button, Empty, Field, PageHead, Sheet, Spinner, timeAgo, useToast } from '../ui';
import { useScenes } from './Scenes';

export function useScreens() {
  const { base, org } = useOrg();
  return useQuery({ queryKey: ['screens', org.id], queryFn: () => api.get<Screen[]>(`${base}/screens`), refetchInterval: 15_000 });
}

export function ScreensPage() {
  const t = useT();
  const { base, org, canAdmin } = useOrg();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const screens = useScreens();
  const scenes = useScenes();
  const locations = useQuery({ queryKey: ['locations', org.id], queryFn: () => api.get<Location[]>(`${base}/locations`) });
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState('');
  const playerUrl = `${window.location.origin}/player/`;

  // QR на экране телевизора ведёт сюда с ?pair=123456 — сразу открываем форму с кодом.
  useEffect(() => {
    const pair = params.get('pair');
    if (pair && canAdmin) {
      setCode(pair);
      setAdding(true);
      params.delete('pair');
      setParams(params, { replace: true });
    }
  }, [params, setParams, canAdmin]);

  useEffect(() => {
    if (!locationId && locations.data?.[0]) setLocationId(locations.data[0].id);
  }, [locations.data, locationId]);

  const claim = async () => {
    setError('');
    try {
      const screen = await api.post<{ id: string }>(`${base}/screens/claim`, {
        code,
        locationId,
        name: name || `${t('nav_screens')} ${(screens.data?.length ?? 0) + 1}`,
      });
      setAdding(false);
      setCode('');
      setName('');
      await screens.refetch();
      navigate(`/screens/${screen.id}`);
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'invalid_code' ? t('invalidCode') : t('error'));
    }
  };

  if (screens.isLoading) return <Spinner />;
  const sceneName = (id: string | null | undefined) => scenes.data?.find((s) => s.id === id)?.name ?? '—';
  return (
    <div className="page">
      <PageHead title={t('screens')} actions={canAdmin ? <Button onClick={() => setAdding(true)}>{t('addScreen')}</Button> : null} />
      <div className="card player-url">
        <div>
          <div className="muted small">{t('playerUrl')}</div>
          <code>{playerUrl}</code>
        </div>
        <Button
          variant="soft"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(playerUrl);
            toast('✓');
          }}
        >
          ⧉
        </Button>
      </div>
      {screens.data?.length === 0 ? <Empty>{t('noScreens')}</Empty> : null}
      <ul className="screen-list">
        {screens.data?.map((s) => (
          <li key={s.id}>
            <Link to={`/screens/${s.id}`} className="card screen-row">
              <span className={`dot ${s.online ? 'dot-on' : 'dot-off'}`} aria-label={s.online ? t('online') : t('offline')} />
              <div className="screen-main">
                <strong>{s.name}</strong>
                <span className="muted small">
                  {s.locationName} · {sceneName(s.lastStatus?.sceneId ?? s.schedule.defaultSceneId)}
                </span>
              </div>
              <span className="muted small">{s.online ? t('online') : `${t('lastSeen')} ${timeAgo(s.lastSeenAt, org.locale, t('never'))}`}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Sheet
        open={adding}
        title={t('addScreen')}
        onClose={() => setAdding(false)}
        footer={
          <>
            <span />
            <Button disabled={code.replace(/\D/g, '').length !== 6 || !locationId} onClick={() => void claim()}>
              {t('add')}
            </Button>
          </>
        }
      >
        <p className="muted">{t('pairHint')}</p>
        <code className="code-hint">{playerUrl}</code>
        <Field label={t('pairCode')}>
          <input className="code-input" inputMode="numeric" autoFocus maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456" />
        </Field>
        <Field label={t('screenName')}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${t('nav_screens')} 1`} />
        </Field>
        <Field label={t('location')}>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        {error ? <div className="form-error">{error}</div> : null}
      </Sheet>
    </div>
  );
}

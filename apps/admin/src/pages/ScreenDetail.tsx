import type { Orientation, ScheduleRule, ScreenSchedule } from '@dm/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, type Location } from '../api';
import { useT } from '../i18n';
import { useOrg } from '../session';
import { Button, Field, PageHead, Spinner, timeAgo, useToast } from '../ui';
import { useScenes } from './Scenes';
import { useScreens } from './Screens';

export function ScreenDetailPage() {
  const t = useT();
  const { id } = useParams();
  const { base, org, canAdmin, canEdit } = useOrg();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const screens = useScreens();
  const scenes = useScenes();
  const locations = useQuery({ queryKey: ['locations', org.id], queryFn: () => api.get<Location[]>(`${base}/locations`) });
  const screen = screens.data?.find((s) => s.id === id);

  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [schedule, setSchedule] = useState<ScreenSchedule | null>(null);

  useEffect(() => {
    if (screen && !schedule) {
      setName(screen.name);
      setLocationId(screen.locationId);
      setOrientation(screen.orientation);
      setSchedule(screen.schedule);
    }
  }, [screen, schedule]);

  if (!screen || !schedule || !scenes.data) return <Spinner />;

  const setRule = (index: number, patch: Partial<ScheduleRule>) =>
    setSchedule({ ...schedule, rules: schedule.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
  const addRule = () =>
    setSchedule({
      ...schedule,
      rules: [
        ...schedule.rules,
        { id: Math.random().toString(36).slice(2, 10), days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00', sceneId: scenes.data![0]!.id },
      ],
    });

  const save = async () => {
    try {
      await api.patch(`${base}/screens/${id}`, { name, locationId, orientation, schedule });
      await qc.invalidateQueries({ queryKey: ['screens', org.id] });
      toast(t('saved'));
    } catch {
      toast(t('error'), 'error');
    }
  };
  const reload = async () => {
    await api.post(`${base}/screens/${id}/reload`);
    toast(t('reloadSent'));
  };
  const unpair = async () => {
    if (!confirm(t('confirmDelete'))) return;
    await api.del(`${base}/screens/${id}`);
    await qc.invalidateQueries({ queryKey: ['screens', org.id] });
    navigate('/screens');
  };

  return (
    <div className="page">
      <PageHead
        title={screen.name}
        hint={`${screen.online ? t('online') : `${t('lastSeen')} ${timeAgo(screen.lastSeenAt, org.locale, t('never'))}`}${
          screen.lastStatus ? ` · ${screen.lastStatus.viewport} · v${screen.lastStatus.playerVersion}` : ''
        }`}
        actions={
          <>
            {canEdit ? (
              <Button variant="soft" onClick={() => void reload()}>
                {t('reload')}
              </Button>
            ) : null}
            {canAdmin ? (
              <Button onClick={() => void save()} disabled={!scenes.data.length}>
                {t('save')}
              </Button>
            ) : null}
          </>
        }
      />
      <fieldset className="card form-card" disabled={!canAdmin}>
        <div className="grid-2">
          <Field label={t('screenName')}>
            <input value={name} onChange={(e) => setName(e.target.value)} />
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
        </div>
        <Field label={t('orientation')} group>
          <div className="seg">
            {(['landscape', 'portrait'] as const).map((o) => (
              <button type="button" key={o} className={orientation === o ? 'is-on' : ''} onClick={() => setOrientation(o)}>
                {t(o)}
              </button>
            ))}
          </div>
        </Field>
      </fieldset>

      <fieldset className="card form-card" disabled={!canAdmin}>
        <h2>{t('schedule')}</h2>
        <p className="muted small">{t('scheduleHint')}</p>
        <Field label={t('defaultScene')}>
          <select value={schedule.defaultSceneId ?? ''} onChange={(e) => setSchedule({ ...schedule, defaultSceneId: e.target.value || null })}>
            <option value="">—</option>
            {scenes.data.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        {schedule.rules.map((rule, i) => (
          <div key={rule.id} className="rule">
            <div className="chips">
              {t.days.map((d, di) => {
                const day = di + 1;
                const on = rule.days.includes(day);
                return (
                  <button
                    type="button"
                    key={d}
                    className={`chip chip-sm${on ? ' is-on' : ''}`}
                    onClick={() => setRule(i, { days: on ? rule.days.filter((x) => x !== day) : [...rule.days, day].sort() })}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="rule-row">
              <span>{t('from')}</span>
              <input type="time" value={rule.start} onChange={(e) => setRule(i, { start: e.target.value })} />
              <span>{t('to')}</span>
              <input type="time" value={rule.end} onChange={(e) => setRule(i, { end: e.target.value })} />
              <select value={rule.sceneId} onChange={(e) => setRule(i, { sceneId: e.target.value })}>
                {scenes.data!.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button type="button" className="icon-btn" aria-label={t('delete')} onClick={() => setSchedule({ ...schedule, rules: schedule.rules.filter((_, j) => j !== i) })}>
                ×
              </button>
            </div>
          </div>
        ))}
        {scenes.data.length ? (
          <Button variant="ghost" onClick={addRule}>
            + {t('addRule')}
          </Button>
        ) : null}
      </fieldset>

      {canAdmin ? (
        <div className="danger-zone">
          <Button variant="danger" onClick={() => void unpair()}>
            {t('unpair')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

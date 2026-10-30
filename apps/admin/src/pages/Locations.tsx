import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError, type Location } from '../api';
import { useT } from '../i18n';
import { useOrg, useSession } from '../session';
import { Button, Field, PageHead, Sheet, Spinner, useToast } from '../ui';

export function LocationsPage() {
  const t = useT();
  const { base, org, canAdmin } = useOrg();
  const { config } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const locations = useQuery({ queryKey: ['locations', org.id], queryFn: () => api.get<Location[]>(`${base}/locations`) });
  const [editing, setEditing] = useState<Partial<Location> | null>(null);

  const save = async () => {
    if (!editing) return;
    const body = { name: editing.name, address: editing.address ?? '', timezone: editing.timezone };
    try {
      if (editing.id) await api.patch(`${base}/locations/${editing.id}`, body);
      else await api.post(`${base}/locations`, body);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['locations', org.id] });
      toast(t('saved'));
    } catch {
      toast(t('error'), 'error');
    }
  };
  const remove = async () => {
    if (!editing?.id || !confirm(t('confirmDelete'))) return;
    try {
      await api.del(`${base}/locations/${editing.id}`);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['locations', org.id] });
    } catch (err) {
      toast(err instanceof ApiError ? err.code : t('error'), 'error');
    }
  };

  if (locations.isLoading) return <Spinner />;
  return (
    <div className="page">
      <PageHead
        title={t('locations')}
        actions={
          canAdmin ? (
            <Button onClick={() => setEditing({ name: '', address: '', timezone: config?.timezone ?? 'Europe/Moscow' })}>{t('newLocation')}</Button>
          ) : null
        }
      />
      <ul className="screen-list">
        {locations.data?.map((l) => (
          <li key={l.id}>
            <button type="button" className="card screen-row" onClick={() => canAdmin && setEditing(l)}>
              <div className="screen-main">
                <strong>{l.name}</strong>
                <span className="muted small">{[l.address, l.timezone].filter(Boolean).join(' · ')}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Sheet
        open={Boolean(editing)}
        title={editing?.id ? t('location') : t('newLocation')}
        onClose={() => setEditing(null)}
        footer={
          <>
            {editing?.id ? (
              <Button variant="danger" onClick={() => void remove()}>
                {t('delete')}
              </Button>
            ) : (
              <span />
            )}
            <Button disabled={!editing?.name?.trim()} onClick={() => void save()}>
              {t('save')}
            </Button>
          </>
        }
      >
        <Field label={t('name')}>
          <input value={editing?.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        </Field>
        <Field label={t('address')}>
          <input value={editing?.address ?? ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
        </Field>
        <Field label={t('timezone')}>
          <input value={editing?.timezone ?? ''} onChange={(e) => setEditing({ ...editing, timezone: e.target.value })} />
        </Field>
      </Sheet>
    </div>
  );
}

import type { Role } from '@dm/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError, type Member } from '../api';
import { useT } from '../i18n';
import { useOrg } from '../session';
import { Button, Field, PageHead, Sheet, Spinner, timeAgo, useToast, useConfirm } from '../ui';

const ASSIGNABLE: Role[] = ['admin', 'editor', 'viewer'];

export function TeamPage() {
  const t = useT();
  const ask = useConfirm();
  const { base, org } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();
  const members = useQuery({ queryKey: ['members', org.id], queryFn: () => api.get<Member[]>(`${base}/members`) });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'editor' as Role, password: '' });
  const refresh = () => qc.invalidateQueries({ queryKey: ['members', org.id] });

  const add = async () => {
    try {
      await api.post(`${base}/members`, form);
      setAdding(false);
      setForm({ email: '', name: '', role: 'editor', password: '' });
      await refresh();
      toast(t('saved'));
    } catch (err) {
      toast(err instanceof ApiError ? err.code : t('error'), 'error');
    }
  };
  const setRole = async (userId: string, role: Role) => {
    await api.patch(`${base}/members/${userId}`, { role });
    await refresh();
  };
  const remove = async (userId: string) => {
    if (!(await ask(t('confirmDelete')))) return;
    await api.del(`${base}/members/${userId}`);
    await refresh();
  };

  if (members.isLoading) return <Spinner />;
  return (
    <div className="page">
      <PageHead title={t('team')} hint={t('roleHint')} actions={<Button onClick={() => setAdding(true)}>{t('addMember')}</Button>} />
      <ul className="screen-list">
        {members.data?.map((m) => (
          <li key={m.id} className="card screen-row">
            <div className="screen-main">
              <strong>{m.name}</strong>
              <span className="muted small">
                {m.email} · {timeAgo(m.lastLoginAt, org.locale, t('never'))}
              </span>
            </div>
            {m.role === 'owner' ? (
              <span className="tag">{t('role_owner')}</span>
            ) : (
              <>
                <select value={m.role} onChange={(e) => void setRole(m.id, e.target.value as Role)}>
                  {ASSIGNABLE.map((r) => (
                    <option key={r} value={r}>
                      {t(`role_${r}`)}
                    </option>
                  ))}
                </select>
                <button type="button" className="link-btn danger small" onClick={() => void remove(m.id)}>
                  {t('remove')}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <Sheet
        open={adding}
        title={t('addMember')}
        onClose={() => setAdding(false)}
        footer={
          <>
            <span />
            <Button disabled={!form.email || !form.name || form.password.length < 8} onClick={() => void add()}>
              {t('add')}
            </Button>
          </>
        }
      >
        <Field label={t('personName')}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={t('email')}>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t('role')}>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>
                {t(`role_${r}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('tempPassword')} hint={t('tempPasswordHint')}>
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
      </Sheet>
    </div>
  );
}
